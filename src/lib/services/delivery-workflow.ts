import type { DeliveryRunRecord, DiscrepancyReason, DriverRecord, InternalUser, InvoiceRecord, OrderLifecycleStatus, OrderRecord, PODDeliveredItem, PODEvidenceRecord, ProductRecord, ReplacementStockPick, StockBatchRecord } from '@/types/domain/bos';
import { calculatePODLineQuantities } from './business-rules';
import { isCalendarDate } from './procurement-rules';
import { canSourceCatalogProduct } from './supplier-offerings';
import { getNairobiDate, isAssignedDeliveryRun } from './workspace-metrics';

export const POD_DISCREPANCY_REASONS: DiscrepancyReason[] = [
  'Short supplied', 'Damaged goods', 'Poor quality', 'Wrong product', 'Incorrect quantity',
  'Customer rejection', 'Missing package', 'Other',
];

export interface PODQuantityInput {
  orderLineId: string;
  receivedQty: number;
  acceptedQty: number;
  discrepancyReason?: string;
  discrepancyExplanation?: string;
}

export interface DeliveryPlanInput {
  routeZone: string;
  scheduledDate: string;
  departureTime: string;
  orderIds: string[];
  vehicleId: string;
  driverId: string;
}

export function isDeliveryPlanDate(date: string, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const value = new Date(date);
  const today = now.toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' });
  return Number.isFinite(value.valueOf()) && value.toISOString().slice(0, 10) === date && date >= today;
}

export function getUnassignedPackedOrders(orders: OrderRecord[], runs: DeliveryRunRecord[]) {
  const assigned = new Set(runs.filter((run) => run.status !== 'Delivered' && run.status !== 'Rescheduled')
    .flatMap((run) => run.ordersIncluded));
  return orders.filter((order) => ['Packed', 'Dispatched'].includes(order.status) &&
    !assigned.has(order.id) && !assigned.has(order.orderNumber));
}

export function getOrderReceipts(order: OrderRecord, records: PODEvidenceRecord[]) {
  return records.filter((pod) => pod.orderId === order.id && pod.orderNumber === order.orderNumber);
}

export function isPendingPOD(pod: PODEvidenceRecord) {
  return pod.status === 'Pending Verification' || pod.status === 'Submitted';
}

export function isOpenPODDiscrepancy(pod: PODEvidenceRecord) {
  return pod.status !== 'Rejected' && pod.hasDiscrepancies && pod.reconciliationStatus !== 'Fully Reconciled';
}

function quantityDifference(quantity: number, deduction: number) {
  return Math.max(0, Math.round((quantity - deduction) * 1e6) / 1e6);
}

const orderLineKey = (line: OrderRecord['items'][number], index: number) => line.id ?? `legacy-line-${index}`;

function matchPODLines(order: OrderRecord, items: PODDeliveredItem[]) {
  const used = new Set<string>();
  const matched = new Map<string, PODDeliveredItem>();
  for (const item of items) {
    const index = order.items.findIndex((line, index) => {
      const key = orderLineKey(line, index);
      return !used.has(key) && line.productId === item.productId && line.unit === item.unit &&
        (!item.orderLineId || item.orderLineId === key);
    });
    if (index === -1) continue;
    const key = orderLineKey(order.items[index], index);
    used.add(key);
    matched.set(key, item);
  }
  return matched;
}

export function getPODExpectedLines(order: OrderRecord, records: PODEvidenceRecord[], receipt?: PODEvidenceRecord) {
  const accepted = new Map<string, number>();
  for (const pod of getOrderReceipts(order, records).filter((p) => p.status === 'Verified' && p.id !== receipt?.id)) {
    for (const [key, item] of matchPODLines(order, pod.deliveredItems)) {
      const receivedAndAccepted = item.acceptedQty ?? item.deliveredQty ?? 0;
      const actual = Math.min(receivedAndAccepted, item.dispatchedQty ?? item.requestedQty ?? receivedAndAccepted);
      accepted.set(key, (accepted.get(key) ?? 0) + actual);
    }
  }

  const captured = receipt ? matchPODLines(order, receipt.deliveredItems) : undefined;
  return order.items.map((line, index) => {
    const orderLineId = orderLineKey(line, index);
    const previousAcceptedQty = Math.min(line.quantity, accepted.get(orderLineId) ?? 0);
    const outstandingQty = quantityDifference(line.quantity, previousAcceptedQty);
    const submitted = captured?.get(orderLineId);
    const submittedDispatched = submitted?.dispatchedQty ?? submitted?.requestedQty;
    return {
      orderLineId,
      productId: line.productId,
      productName: line.productName,
      sku: line.sku,
      unit: line.unit,
      orderedQty: line.quantity,
      previousAcceptedQty,
      outstandingQty,
      dispatchedQty: Math.min(outstandingQty, submittedDispatched ?? outstandingQty),
      unitPriceKes: line.unitPriceKes,
      submitted,
    };
  });
}

export type PODExpectedLine = ReturnType<typeof getPODExpectedLines>[number];

export type ReplacementPickInput = Pick<ReplacementStockPick, 'orderLineId' | 'batchId' | 'quantity'>;

export interface ReplacementLoadInput {
  warehouseId: string;
  picks: ReplacementPickInput[];
}

export function replacementStockNeededThrough(run: DeliveryRunRecord, today = getNairobiDate()) {
  return run.scheduledDate && run.scheduledDate > today ? run.scheduledDate : today;
}

export function isReplacementBatchUsable(batch: StockBatchRecord, product: ProductRecord, neededThrough: string) {
  return canSourceCatalogProduct(product) && batch.productId === product.id && batch.unit === product.unit &&
    batch.status !== 'Quarantined' && (batch.expiryDate
      ? isCalendarDate(batch.expiryDate) && batch.expiryDate >= neededThrough
      : !product.expiryTracked);
}

export function getReplacementStockBatches(line: PODExpectedLine, warehouseId: string, batches: StockBatchRecord[], products: ProductRecord[], neededThrough: string) {
  const product = products.find((entry) => entry.id === line.productId && entry.unit === line.unit && entry.availableQty > 0);
  if (!product || !warehouseId) return [];
  return batches.filter((batch) => batch.warehouseId === warehouseId && batch.availableQty > 0 && isReplacementBatchUsable(batch, product, neededThrough))
    .sort((a, b) => (a.expiryDate || '9999-12-31').localeCompare(b.expiryDate || '9999-12-31') || a.batchNumber.localeCompare(b.batchNumber));
}

const quantityUnits = (quantity: number) => Math.round(quantity * 1e6);

export function replacementPicksCoverDemand(expected: PODExpectedLine[], picks: ReplacementStockPick[]) {
  const demand = new Map(expected.filter((line) => line.outstandingQty > 0).map((line) => [line.orderLineId, line]));
  const totals = new Map<string, number>();
  for (const pick of picks) {
    const line = demand.get(pick.orderLineId);
    if (!line || line.productId !== pick.productId || line.unit !== pick.unit || !Number.isFinite(pick.quantity) || pick.quantity <= 0) return false;
    totals.set(pick.orderLineId, (totals.get(pick.orderLineId) ?? 0) + quantityUnits(pick.quantity));
  }
  return demand.size > 0 && [...demand].every(([id, line]) => totals.get(id) === quantityUnits(line.outstandingQty));
}

export function planReplacementLoad(expected: PODExpectedLine[], warehouseId: string, selections: ReplacementPickInput[], batches: StockBatchRecord[], products: ProductRecord[], neededThrough: string) {
  const failure = (message: string) => ({ ok: false as const, message });
  if (!warehouseId || !selections.length) return failure('Select a warehouse and record the stock picked for this run.');

  const expectedByLine = new Map(expected.filter((line) => line.outstandingQty > 0).map((line) => [line.orderLineId, line]));
  const batchesById = new Map(batches.map((batch) => [batch.id, batch]));
  const productsById = new Map(products.map((product) => [product.id, product]));
  const usedPerBatch = new Map<string, number>();
  const usedPerProduct = new Map<string, number>();
  const usedPairs = new Set<string>();
  const picks: ReplacementStockPick[] = [];

  for (const selection of selections) {
    const line = expectedByLine.get(selection.orderLineId);
    const batch = batchesById.get(selection.batchId);
    const product = line && productsById.get(line.productId);
    if (!line || !batch || !product || line.unit !== product.unit || batch.warehouseId !== warehouseId ||
        !isReplacementBatchUsable(batch, product, neededThrough)) {
      return failure('Choose an eligible batch for each order line from the selected warehouse.');
    }
    const quantity = quantityUnits(selection.quantity);
    const pair = JSON.stringify([line.orderLineId, batch.id]);
    if (usedPairs.has(pair) || !Number.isSafeInteger(quantity) || quantity <= 0 || quantity / 1e6 !== selection.quantity) {
      return failure(`Enter one positive pick quantity per batch for ${line.productName}.`);
    }
    usedPairs.add(pair);

    const batchTotal = (usedPerBatch.get(batch.id) ?? 0) + quantity;
    const productTotal = (usedPerProduct.get(product.id) ?? 0) + quantity;
    if (!Number.isFinite(batch.availableQty) || !Number.isFinite(product.availableQty) ||
        batchTotal > quantityUnits(batch.availableQty) || productTotal > quantityUnits(product.availableQty)) {
      return failure(`The picks exceed the available stock for ${line.productName}.`);
    }

    usedPerBatch.set(batch.id, batchTotal);
    usedPerProduct.set(product.id, productTotal);
    picks.push({ orderLineId: line.orderLineId, batchId: batch.id, batchNumber: batch.batchNumber,
      productId: product.id, unit: product.unit, quantity: selection.quantity });
  }

  if (!replacementPicksCoverDemand(expected, picks)) return failure('Pick the outstanding quantity for every order line.');

  return {
    ok: true as const,
    picks,
    batches: batches.map((batch) => usedPerBatch.has(batch.id)
      ? { ...batch, availableQty: quantityDifference(batch.availableQty, usedPerBatch.get(batch.id)! / 1e6) }
      : batch),
    products: products.map((product) => usedPerProduct.has(product.id)
      ? { ...product, availableQty: quantityDifference(product.availableQty, usedPerProduct.get(product.id)! / 1e6) }
      : product),
  };
}

export function checkPODLine(line: PODExpectedLine, actual: PODQuantityInput) {
  if (!Number.isFinite(actual.receivedQty) || actual.receivedQty < 0) {
    return 'Enter a received quantity of zero or more.';
  }
  if (!Number.isFinite(actual.acceptedQty) || actual.acceptedQty < 0 ||
      actual.acceptedQty > Math.min(actual.receivedQty, line.dispatchedQty)) {
    return `Enter an accepted quantity between 0 and ${Math.min(actual.receivedQty, line.dispatchedQty)}.`;
  }
  return null;
}

export function comparePODLine(line: PODExpectedLine, actual: PODQuantityInput) {
  const excessQty = quantityDifference(actual.receivedQty, line.dispatchedQty);
  const compared = calculatePODLineQuantities({ ...line, ...actual });
  const rejectedQty = quantityDifference(Math.min(actual.receivedQty, line.dispatchedQty), actual.acceptedQty);
  return {
    ...compared,
    excessQty,
    rejectedQty,
    currentDeliveryShortage: quantityDifference(line.dispatchedQty, actual.receivedQty),
    outstandingQty: quantityDifference(line.orderedQty, compared.cumulativeAcceptedQty),
  };
}

export function preparePODReceipt(expected: PODExpectedLine[], quantities: PODQuantityInput[]) {
  const expectedItems = expected.filter((line) => line.dispatchedQty > 0);
  const actualItems = new Map(quantities.map((item) => [item.orderLineId, item]));
  if (!expectedItems.length || quantities.length !== expectedItems.length || actualItems.size !== expectedItems.length) {
    return { ok: false as const, message: 'Enter received and accepted quantities for every expected item.' };
  }

  const items: PODDeliveredItem[] = [];
  for (const line of expectedItems) {
    const actual = actualItems.get(line.orderLineId);
    if (!actual) return { ok: false as const, message: `Quantities are missing for ${line.productName}.` };
    const error = checkPODLine(line, actual);
    if (error) return { ok: false as const, message: `${line.productName}. ${error}` };

    const result = comparePODLine(line, actual);
    const reason = actual.discrepancyReason?.trim();
    if (result.hasDiscrepancy && !reason) {
      return { ok: false as const, message: `Choose a discrepancy reason for ${line.productName}.` };
    }
    if (result.hasDiscrepancy && reason === 'Other' && !actual.discrepancyExplanation?.trim()) {
      return { ok: false as const, message: `Describe the discrepancy for ${line.productName}.` };
    }

    const { submitted, ...identifiers } = line;
    items.push({
      ...identifiers,
      orderedQty: result.orderedQty,
      dispatchedQty: result.dispatchedQty,
      receivedQty: result.receivedQty,
      acceptedQty: result.acceptedQty,
      rejectedQty: result.rejectedQty,
      excessQty: result.excessQty,
      currentDeliveryShortage: result.currentDeliveryShortage,
      cumulativeAcceptedQty: result.cumulativeAcceptedQty,
      outstandingQty: result.outstandingQty,
      classification: result.classification,
      discrepancyReason: result.hasDiscrepancy ? reason : undefined,
      discrepancyExplanation: result.hasDiscrepancy ? actual.discrepancyExplanation?.trim() : undefined,
      deliveredQty: result.acceptedQty,
      requestedQty: result.orderedQty,
    });
  }

  return {
    ok: true as const,
    items,
    hasDiscrepancies: items.some((item) => item.classification !== 'Fully Received'),
    hasOutstanding: expected.some((line) =>
      (items.find((item) => item.orderLineId === line.orderLineId)?.outstandingQty ?? line.outstandingQty) > 0
    ),
  };
}

export function getExistingPODInvoice(pod: PODEvidenceRecord, invoices: InvoiceRecord[]) {
  return invoices.find((invoice) => invoice.podRef === pod.id ||
    (invoice.orderNumber === pod.orderNumber && !invoice.podRef));
}

export function allocateInvoicePayment(invoice: InvoiceRecord, amountKes: number): InvoiceRecord | null {
  const cents = Math.round(amountKes * 100);
  const remaining = Math.round(invoice.balanceKes * 100);
  if (!Number.isSafeInteger(cents) || !Number.isSafeInteger(remaining) || cents <= 0 || cents > remaining || invoice.status === 'Paid') return null;
  const balanceKes = (remaining - cents) / 100;
  return {
    ...invoice,
    paidAmountKes: (Math.round(invoice.paidAmountKes * 100) + cents) / 100,
    balanceKes,
    status: balanceKes === 0 ? 'Paid' : invoice.status === 'Overdue' ? 'Overdue' : 'Partially Paid',
  };
}

export function getDeliveryRunStops(run: DeliveryRunRecord, orders: OrderRecord[], records: PODEvidenceRecord[]) {
  return run.ordersIncluded.map((identifier, index) => {
    const order = orders.find((o) => o.orderNumber === identifier || o.id === identifier);
    const stop = run.stops?.find((s) => s.orderId === order?.id || s.orderNumber === identifier);
    const receipt = order && getOrderReceipts(order, records).find((pod) =>
      pod.deliveryRunId === run.id || pod.deliveryRunId === run.runNumber);
    return { identifier, order, stop, receipt, customer: order?.customerName ?? stop?.customerName ?? run.institutionsServed[index] };
  });
}

export function canAccessDeliveryRun(run: DeliveryRunRecord, user: InternalUser | null, drivers: DriverRecord[]) {
  if (!user) return false;
  if (user.roleId !== 'delivery_driver') return true;
  return isAssignedDeliveryRun(run, drivers, user.fullName);
}

export function hasDeliveryRunException(run: DeliveryRunRecord, orders: OrderRecord[], records: PODEvidenceRecord[]) {
  return run.status === 'Rescheduled' || getDeliveryRunStops(run, orders, records)
    .some(({ stop, receipt }) => stop?.status === 'Failed' ||
      Boolean(receipt && (receipt.status === 'Rejected' || isOpenPODDiscrepancy(receipt))));
}

export function permitsManualOrderStage(current: OrderLifecycleStatus, next: OrderLifecycleStatus) {
  return (current === 'Confirmed' && next === 'Picking') ||
    (current === 'Picking' && next === 'Packed') ||
    (current === 'Delivered' && next === 'Closed');
}

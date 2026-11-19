import type {
  CreateOrderItemInput,
  OrderLineItem,
  OrderRecord,
  ProcurementOrderRecord,
  ProductRecord,
  PurchaseLineInput,
  PurchaseOrderLineItem,
  PurchaseReceiptLineInput,
  SupplierRecord,
} from '@/types/domain/bos';
import { canSourceCatalogProduct } from './supplier-offerings';

const QUANTITY_TOLERANCE = 1e-8;
const quantityLeft = (quantity: number, processed: number) =>
  quantity - processed > QUANTITY_TOLERANCE ? quantity - processed : 0;
const money = (amount: number) => Math.round(amount * 100) / 100;
const failure = (message: string) => ({ ok: false as const, message });

export function resolveOrderAllocation(item: CreateOrderItemInput, availableStock: number) {
  const quantity = Number(item.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) return failure('Enter a quantity greater than zero.');
  const mode = item.sourcingMode ?? (quantity <= availableStock ? 'Existing Stock' : 'Direct Procurement');
  const sourcingMode = mode === 'direct_procurement' || mode === 'Direct Procurement'
    ? 'Direct Procurement'
    : mode === 'mixed' || mode === 'Mixed Sourcing' ? 'Mixed Sourcing' : 'Existing Stock';
  const stockQty = item.stockAllocatedQty ?? (
    sourcingMode === 'Direct Procurement' ? 0 : sourcingMode === 'Existing Stock' ? quantity : Math.min(quantity, availableStock)
  );
  const directQty = item.directProcuredQty ?? (quantity - stockQty);
  if (!Number.isFinite(stockQty) || !Number.isFinite(directQty) || stockQty < 0 || directQty < 0 || Math.abs(stockQty + directQty - quantity) > QUANTITY_TOLERANCE) {
    return failure('Stock and direct sourcing quantities must add up to the ordered quantity.');
  }
  if ((sourcingMode === 'Direct Procurement' && stockQty > 0) || (sourcingMode === 'Existing Stock' && directQty > 0)) {
    return failure('The quantities must match the selected sourcing method.');
  }
  if (stockQty - availableStock > QUANTITY_TOLERANCE) {
    return failure(`Only ${availableStock.toLocaleString()} is available to reserve after other lines for this product.`);
  }
  return { ok: true as const, quantity, sourcingMode: sourcingMode as NonNullable<OrderLineItem['sourcingMode']>, stockQty, directQty };
}

export function reserveOrderStock(products: ProductRecord[], lines: Pick<OrderLineItem, 'productId' | 'stockAllocatedQty'>[]) {
  const totals = new Map<string, number>();
  for (const line of lines) {
    totals.set(line.productId, (totals.get(line.productId) ?? 0) + (line.stockAllocatedQty ?? 0));
  }
  return products.map((product) => {
    const quantity = totals.get(product.id) ?? 0;
    return quantity > 0 ? {
      ...product,
      availableQty: quantityLeft(product.availableQty, quantity),
      reservedQty: product.reservedQty + quantity,
    } : product;
  });
}

export function purchaseLineId(line: PurchaseOrderLineItem, index: number) {
  return line.id ?? `legacy-po-line-${index}`;
}

export function getPurchaseReceiptBalance(po: ProcurementOrderRecord) {
  const received = new Map<string, number>();
  for (const receipt of po.receipts ?? []) {
    for (const line of receipt.lines) {
      received.set(line.lineId, (received.get(line.lineId) ?? 0) + line.quantity);
    }
  }
  return (po.lines ?? []).map((line, index) => {
    const id = purchaseLineId(line, index);
    const collected = received.get(id) ?? 0;
    return { id, line, collected, outstanding: quantityLeft(line.quantity, collected) };
  });
}

export function getOrderSourcingLines(order: OrderRecord, procurementOrders: ProcurementOrderRecord[]) {
  const committed = new Map<string, number>();
  const collected = new Map<string, number>();
  for (const po of procurementOrders) {
    if (po.customerOrderId !== order.id || po.stage === 'Cancelled') continue;
    for (const receiptLine of getPurchaseReceiptBalance(po)) {
      const orderLineId = receiptLine.line.customerOrderLineId;
      if (!orderLineId) continue;
      const quantity = po.stage === 'Closed Short' ? receiptLine.collected : receiptLine.line.quantity;
      committed.set(orderLineId, (committed.get(orderLineId) ?? 0) + quantity);
      collected.set(orderLineId, (collected.get(orderLineId) ?? 0) + receiptLine.collected);
    }
  }
  return order.items.map((item, index) => {
    const id = item.id ?? `legacy-line-${index}`;
    const stock = item.stockAllocatedQty ?? (
      item.sourcingMode === 'Direct Procurement' || item.sourcingMode === 'direct_procurement'
        ? 0 : item.quantity - (item.directProcuredQty ?? 0)
    );
    const directRequired = quantityLeft(item.quantity, stock);
    const collectedQty = Math.min(directRequired, collected.get(id) ?? 0);
    return {
      id,
      item,
      directRequired,
      collected: collectedQty,
      outstanding: quantityLeft(directRequired, collectedQty),
      uncommitted: quantityLeft(directRequired, committed.get(id) ?? 0),
    };
  });
}

export function buildPurchaseLines(
  supplier: SupplierRecord,
  products: ProductRecord[],
  selections: PurchaseLineInput[],
  demand?: ReturnType<typeof getOrderSourcingLines>,
) {
  if (!selections.length) return failure('Add at least one purchase line.');
  const lines: PurchaseOrderLineItem[] = [];
  const uniqueSelections = new Set<string>();
  const quantities = new Map<string, number>();
  for (const selection of selections) {
    const product = products.find((item) => item.id === selection.productId && canSourceCatalogProduct(item));
    const offering = supplier.suppliedProducts.find((item) => item.productId === selection.productId && item.availability !== 'Unavailable');
    if (!product || !offering || product.unit !== offering.unit) return failure('Select an active product that the supplier offers in its catalogue unit.');
    const { quantity, unitCostKes, customerOrderLineId } = selection;
    const lineTotalKes = money(quantity * unitCostKes);
    if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitCostKes) || unitCostKes <= 0 || !Number.isFinite(lineTotalKes) || lineTotalKes <= 0) {
      return failure(`Enter a positive quantity and quoted unit cost for ${product.name}.`);
    }
    const selectionKey = demand ? customerOrderLineId : product.id;
    if (!selectionKey || uniqueSelections.has(selectionKey)) return failure('Add each product or customer order line only once.');
    if (demand) {
      const orderLine = demand.find((entry) => entry.id === customerOrderLineId);
      if (!orderLine || orderLine.item.productId !== product.id || orderLine.item.unit !== offering.unit) {
        return failure('Select a matching customer order line for direct sourcing.');
      }
      if (quantity - orderLine.uncommitted > QUANTITY_TOLERANCE) {
        return failure(`${product.name} has ${orderLine.uncommitted.toLocaleString()} ${product.unit} available to commit on this order line.`);
      }
    }
    uniqueSelections.add(selectionKey);
    quantities.set(product.id, (quantities.get(product.id) ?? 0) + quantity);
    lines.push({
      id: `line-${lines.length + 1}`,
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      unit: offering.unit,
      quantity,
      unitCostKes,
      lineTotalKes,
      customerOrderLineId: demand ? customerOrderLineId : undefined,
      supplierOfferingId: offering.id,
    });
  }
  for (const [productId, quantity] of quantities) {
    const offering = supplier.suppliedProducts.find((item) => item.productId === productId && item.availability !== 'Unavailable')!;
    const minimum = offering.moq ?? offering.minOrderQty ?? 0;
    if (minimum - quantity > QUANTITY_TOLERANCE) {
      return failure(`${offering.productName} requires a minimum of ${minimum.toLocaleString()} ${offering.unit} per purchase order.`);
    }
  }
  const totalKes = money(lines.reduce((sum, line) => sum + line.lineTotalKes, 0));
  if (!Number.isFinite(totalKes)) return failure('The quoted order total is too large.');
  return { ok: true as const, lines, totalKes };
}

export function planPurchaseReceipt(po: ProcurementOrderRecord, selections: PurchaseReceiptLineInput[]) {
  if (!selections.length) return failure('Enter the quantity received on at least one purchase line.');
  const balance = getPurchaseReceiptBalance(po);
  const seen = new Set<string>();
  const lines: (PurchaseReceiptLineInput & { lineTotalKes: number })[] = [];
  for (const entry of selections) {
    const purchaseLine = balance.find((line) => line.id === entry.lineId);
    if (!purchaseLine || seen.has(entry.lineId)) return failure('Select each purchase line only once.');
    if (!Number.isFinite(entry.quantity) || entry.quantity <= 0 || entry.quantity - purchaseLine.outstanding > QUANTITY_TOLERANCE) {
      return failure(`Enter a received quantity up to ${purchaseLine.outstanding.toLocaleString()} ${purchaseLine.line.unit} for ${purchaseLine.line.productName}.`);
    }
    const lineTotalKes = money(entry.quantity * entry.unitCostKes);
    if (!Number.isFinite(entry.unitCostKes) || entry.unitCostKes <= 0 || !Number.isFinite(lineTotalKes) || lineTotalKes <= 0) {
      return failure(`Enter a positive actual unit cost for ${purchaseLine.line.productName}.`);
    }
    seen.add(entry.lineId);
    lines.push({ ...entry, lineTotalKes });
  }
  const complete = balance.every(({ id, outstanding }) => quantityLeft(outstanding, lines.find((entry) => entry.lineId === id)?.quantity ?? 0) === 0);
  const totalKes = money(lines.reduce((sum, line) => sum + line.lineTotalKes, 0));
  if (!Number.isFinite(totalKes)) return failure('The actual purchase total is too large.');
  return { ok: true as const, lines, totalKes, complete };
}

export function isCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

export function getSupplierDueDate(receivedAt: string, paymentTerms: string) {
  if (!isCalendarDate(receivedAt)) return undefined;
  const terms = paymentTerms.trim();
  if (/^(?:cash on delivery|cod|immediate|due on receipt|prepaid(?:\s*\/\s*m-pesa)?)$/i.test(terms)) return receivedAt;
  const match = terms.match(/^(?:net\s+(\d+)(?:\s+days?)?|(\d+)\s+days?)$/i);
  if (!match) return undefined;
  const date = new Date(`${receivedAt}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + Number(match[1] ?? match[2]));
  return Number.isFinite(date.valueOf()) && date.getUTCFullYear() <= 9999 ? date.toISOString().slice(0, 10) : undefined;
}

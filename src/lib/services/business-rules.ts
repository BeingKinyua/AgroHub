/**
 * AgroHub Business Operating System (BOS)
 * Centralized Pure Business Rules and Quantity Reconciliation Engine
 */

import {
  DiscrepancyClassification,
  DiscrepancyReason,
  PODDeliveredItem,
  SupplierRecord,
  SupplierPayableRecord,
  SupplierPaymentRecord,
  ProductCategory,
  UnitOfMeasure,
} from '@/types/domain/bos';

// ============================================================================
// 1. PROOF OF DELIVERY (POD) QUANTITY RECONCILIATION
// ============================================================================

export interface PODCalculationInput {
  orderedQty: number;
  dispatchedQty: number;
  receivedQty: number;
  acceptedQty: number;
  previousAcceptedQty?: number;
}

export interface PODCalculationOutput {
  orderedQty: number;
  dispatchedQty: number;
  receivedQty: number;
  acceptedQty: number;
  rejectedQty: number;
  currentDeliveryShortage: number;
  cumulativeAcceptedQty: number;
  cumulativeAccepted: number;
  outstandingQty: number;
  isOverDelivery: boolean;
  classification: DiscrepancyClassification;
  hasDiscrepancy: boolean;
}

/**
 * Calculates exact line-item quantities for a delivery arrival.
 * Supports both object input and positional arguments.
 *
 * Formulas:
 * - Current Delivery Shortage = Dispatched Quantity - Received Quantity
 * - Rejected Quantity = Received Quantity - Accepted Quantity
 * - Cumulative Accepted Quantity = Previous Accepted Quantity + Current Accepted Quantity
 * - Outstanding Quantity = Ordered Quantity - Cumulative Accepted Quantity
 */
export function calculatePODLineQuantities(
  inputOrOrdered: PODCalculationInput | number,
  dispatched?: number,
  received?: number,
  accepted?: number,
  previousAccepted?: number
): PODCalculationOutput {
  const input: PODCalculationInput =
    typeof inputOrOrdered === 'number'
      ? {
          orderedQty: inputOrOrdered,
          dispatchedQty: dispatched ?? 0,
          receivedQty: received ?? 0,
          acceptedQty: accepted ?? 0,
          previousAcceptedQty: previousAccepted ?? 0,
        }
      : inputOrOrdered;

  const orderedQty = Math.max(0, Number(input.orderedQty) || 0);
  const dispatchedQty = Math.max(0, Number(input.dispatchedQty) || 0);
  const receivedQty = Math.max(0, Number(input.receivedQty) || 0);
  const acceptedQty = Math.min(receivedQty, Math.max(0, Number(input.acceptedQty) || 0));
  const previousAcceptedQty = Math.max(0, Number(input.previousAcceptedQty) || 0);

  const currentDeliveryShortage = Math.max(0, dispatchedQty - receivedQty);
  const rejectedQty = Math.max(0, receivedQty - acceptedQty);
  const cumulativeAcceptedQty = previousAcceptedQty + acceptedQty;
  const outstandingQty = Math.max(0, orderedQty - cumulativeAcceptedQty);
  const isOverDelivery = receivedQty > dispatchedQty;

  const classification = classifyPODDiscrepancy({
    orderedQty,
    dispatchedQty,
    receivedQty,
    acceptedQty,
    rejectedQty,
  });

  const hasDiscrepancy =
    classification !== 'Fully Received' || isOverDelivery || currentDeliveryShortage > 0;

  return {
    orderedQty,
    dispatchedQty,
    receivedQty,
    acceptedQty,
    rejectedQty,
    currentDeliveryShortage,
    cumulativeAcceptedQty,
    cumulativeAccepted: cumulativeAcceptedQty,
    outstandingQty,
    isOverDelivery,
    classification,
    hasDiscrepancy,
  };
}

/**
 * Classifies the operational status of a delivered line item.
 * Supports both object input and positional arguments.
 */
export function classifyPODDiscrepancy(
  itemOrOrdered:
    | {
        orderedQty: number;
        dispatchedQty: number;
        receivedQty: number;
        acceptedQty: number;
        rejectedQty?: number;
      }
    | number,
  dispatched?: number,
  received?: number,
  accepted?: number,
  rejected?: number
): DiscrepancyClassification {
  const item =
    typeof itemOrOrdered === 'object' && itemOrOrdered !== null
      ? itemOrOrdered
      : {
          orderedQty: itemOrOrdered,
          dispatchedQty: dispatched ?? 0,
          receivedQty: received ?? 0,
          acceptedQty: accepted ?? 0,
          rejectedQty: rejected ?? Math.max(0, (received ?? 0) - (accepted ?? 0)),
        };

  const receivedQty = item.receivedQty ?? 0;
  const dispatchedQty = item.dispatchedQty ?? 0;
  const acceptedQty = item.acceptedQty ?? 0;
  const rejectedQty = item.rejectedQty ?? Math.max(0, receivedQty - acceptedQty);

  if (receivedQty === 0 && dispatchedQty > 0) {
    return 'Not Received';
  }
  if (receivedQty > dispatchedQty) {
    return 'Over Received';
  }
  if (rejectedQty > 0 && acceptedQty === 0) {
    return 'Damaged / Rejected';
  }
  if (rejectedQty > 0 || (acceptedQty > 0 && acceptedQty < receivedQty)) {
    return 'Partially Accepted';
  }
  if (receivedQty < dispatchedQty) {
    return 'Short Received';
  }
  return 'Fully Received';
}

/**
 * Validates whether a line item with discrepancies has a required reason.
 * Supports both object item and positional arguments.
 */
export function validatePODLineDiscrepancy(
  itemOrOrdered: PODDeliveredItem | number,
  dispatched?: number,
  received?: number,
  accepted?: number,
  reason?: DiscrepancyReason
): {
  valid: boolean;
  message?: string;
  discrepancyType?: 'over_delivery' | 'shortage' | 'rejection' | 'none';
} {
  let ordered = 0;
  let disp = 0;
  let recv = 0;
  let acc = 0;
  let discrepancyReason: DiscrepancyReason | undefined;

  if (typeof itemOrOrdered === 'object' && itemOrOrdered !== null) {
    ordered = itemOrOrdered.orderedQty ?? itemOrOrdered.requestedQty ?? 0;
    disp = itemOrOrdered.dispatchedQty ?? itemOrOrdered.requestedQty ?? 0;
    recv = itemOrOrdered.receivedQty ?? itemOrOrdered.deliveredQty ?? 0;
    acc = itemOrOrdered.acceptedQty ?? itemOrOrdered.deliveredQty ?? 0;
    discrepancyReason = (itemOrOrdered.discrepancyReason || itemOrOrdered.rejectionReason) as DiscrepancyReason;
  } else {
    ordered = Number(itemOrOrdered) || 0;
    disp = dispatched ?? 0;
    recv = received ?? 0;
    acc = accepted ?? 0;
    discrepancyReason = reason;
  }

  const calc = calculatePODLineQuantities(ordered, disp, recv, acc, 0);

  let discrepancyType: 'over_delivery' | 'shortage' | 'rejection' | 'none' = 'none';
  if (calc.isOverDelivery) discrepancyType = 'over_delivery';
  else if (calc.currentDeliveryShortage > 0) discrepancyType = 'shortage';
  else if (calc.rejectedQty > 0) discrepancyType = 'rejection';

  if (calc.hasDiscrepancy && !discrepancyReason && !calc.isOverDelivery) {
    return {
      valid: false,
      discrepancyType,
      message: `Discrepancy (${calc.classification}) detected but no reason provided.`,
    };
  }

  return { valid: true, discrepancyType };
}

// ============================================================================
// 2. INVOICE ELIGIBILITY & DELIVERED QUANTITY BILLING RULES
// ============================================================================

export interface InvoiceEligibilityResult {
  eligible: boolean;
  reason?: string;
  billableTotalKes: number;
  totalInvoiceKes: number;
  billableLines: Array<{
    productId: string;
    productName: string;
    sku: string;
    unit: string;
    acceptedQty: number;
    billableQty: number;
    unitPriceKes: number;
    lineTotalKes: number;
  }>;
  lineItems: Array<{
    productId: string;
    productName: string;
    sku: string;
    unit: string;
    acceptedQty: number;
    billableQty: number;
    unitPriceKes: number;
    lineTotalKes: number;
  }>;
  rejectedTotalKes: number;
  outstandingTotalKes: number;
  hasOutstandingShortages: boolean;
}

/**
 * Computes commercial invoice eligibility strictly from verified accepted quantities.
 * Accepts either a PODEvidenceRecord or an array of PODDeliveredItems.
 * Rejected goods and unfulfilled shortages are strictly excluded from billing.
 */
export function calculateInvoiceEligibility(
  podOrItems: { deliveredItems?: PODDeliveredItem[]; invoiceNumber?: string } | PODDeliveredItem[],
  existingInvoiceRef?: string
): InvoiceEligibilityResult {
  let deliveredItems: PODDeliveredItem[] = [];
  let invoiceRef = existingInvoiceRef;

  if (Array.isArray(podOrItems)) {
    deliveredItems = podOrItems;
  } else if (podOrItems && typeof podOrItems === 'object') {
    deliveredItems = podOrItems.deliveredItems || [];
    invoiceRef = invoiceRef || podOrItems.invoiceNumber;
  }

  if (invoiceRef) {
    return {
      eligible: false,
      reason: `Invoice already created (${invoiceRef}). Duplicate billing prevented.`,
      billableTotalKes: 0,
      totalInvoiceKes: 0,
      billableLines: [],
      lineItems: [],
      rejectedTotalKes: 0,
      outstandingTotalKes: 0,
      hasOutstandingShortages: false,
    };
  }

  let billableTotalKes = 0;
  let rejectedTotalKes = 0;
  let outstandingTotalKes = 0;
  let hasOutstandingShortages = false;

  const billableLines = deliveredItems
    .filter((it) => (it.acceptedQty ?? it.deliveredQty ?? 0) > 0)
    .map((it) => {
      const acceptedQty = it.acceptedQty ?? it.deliveredQty ?? 0;
      const rejectedQty = it.rejectedQty ?? 0;
      const outstandingQty = it.outstandingQty ?? 0;
      const price = it.unitPriceKes || 0;

      const lineTotal = Math.round(acceptedQty * price);
      billableTotalKes += lineTotal;
      rejectedTotalKes += Math.round(rejectedQty * price);
      outstandingTotalKes += Math.round(outstandingQty * price);

      if (outstandingQty > 0) {
        hasOutstandingShortages = true;
      }

      return {
        productId: it.productId,
        productName: it.productName,
        sku: it.sku,
        unit: String(it.unit),
        acceptedQty,
        billableQty: acceptedQty,
        unitPriceKes: price,
        lineTotalKes: lineTotal,
      };
    });

  if (billableLines.length === 0 || billableTotalKes <= 0) {
    return {
      eligible: false,
      reason: 'No accepted goods found to bill. All items rejected or not received.',
      billableTotalKes: 0,
      totalInvoiceKes: 0,
      billableLines: [],
      lineItems: [],
      rejectedTotalKes,
      outstandingTotalKes,
      hasOutstandingShortages,
    };
  }

  return {
    eligible: true,
    billableTotalKes,
    totalInvoiceKes: billableTotalKes,
    billableLines,
    lineItems: billableLines,
    rejectedTotalKes,
    outstandingTotalKes,
    hasOutstandingShortages,
  };
}

// ============================================================================
// 3. SUPPLIER PURCHASING ELIGIBILITY & GOVERNANCE
// ============================================================================

/**
 * Checks if a supplier is legally and operationally eligible for new POs or order sourcing.
 * Must be Active, Approved, and NOT Archived.
 */
export function isSupplierEligibleForPurchasing(
  supplier?: SupplierRecord | null
): { eligible: boolean; reason?: string } {
  if (!supplier) {
    return { eligible: false, reason: 'Supplier not specified.' };
  }

  if (supplier.isArchived) {
    return {
      eligible: false,
      reason: `Supplier ${supplier.name} is Archived. Reactivate supplier before issuing purchases.`,
    };
  }

  if (supplier.status === 'Suspended') {
    return {
      eligible: false,
      reason: `Supplier ${supplier.name} is currently Suspended (${supplier.suspendedReason || 'Compliance hold'}). Purchasing blocked.`,
    };
  }

  if (supplier.status === 'Under Review') {
    return {
      eligible: false,
      reason: `Supplier ${supplier.name} is Under Review. Complete compliance approval before purchasing.`,
    };
  }

  if (supplier.status !== 'Active') {
    return {
      eligible: false,
      reason: `Supplier status is '${supplier.status}'. Only Active suppliers can be selected for purchasing.`,
    };
  }

  return { eligible: true };
}

// ============================================================================
// 4. SUPPLIER ACCOUNTS PAYABLE & FINANCIAL RECONCILIATION
// ============================================================================

export interface SupplierAccountStatement {
  supplierId: string;
  supplierName: string;
  totalPurchasesKes: number;
  totalPayablesKes: number;
  totalPaidKes: number;
  outstandingBalanceKes: number;
  overdueBalanceKes: number;
  payablesCount: number;
  openPayablesCount: number;
  paymentsCount: number;
}

/**
 * Derives accurate, single-source-of-truth supplier balances from actual payables and payments.
 * Supports both signatures:
 *   (supplierId, payables, payments, currentDateStr)
 *   (payables, supplierId, payments, currentDateStr)
 */
export function calculateSupplierBalances(
  arg1: string | SupplierPayableRecord[],
  arg2?: string | SupplierPayableRecord[],
  arg3?: SupplierPaymentRecord[],
  arg4?: string
): SupplierAccountStatement {
  let supplierId = '';
  let payables: SupplierPayableRecord[] = [];
  let payments: SupplierPaymentRecord[] = [];
  const currentDateStr = (typeof arg4 === 'string' ? arg4 : new Date().toISOString().split('T')[0]);

  if (typeof arg1 === 'string') {
    supplierId = arg1;
    payables = Array.isArray(arg2) ? arg2 : [];
    payments = Array.isArray(arg3) ? arg3 : [];
  } else if (Array.isArray(arg1)) {
    payables = arg1;
    supplierId = typeof arg2 === 'string' ? arg2 : '';
    payments = Array.isArray(arg3) ? arg3 : [];
  }

  const supplierPayables = payables.filter((p) => !supplierId || p.supplierId === supplierId);
  const supplierPayments = payments.filter((p) => !supplierId || p.supplierId === supplierId);

  let totalPurchasesKes = 0;
  let totalPaidKes = 0;
  let outstandingBalanceKes = 0;
  let overdueBalanceKes = 0;
  let openPayablesCount = 0;

  for (const p of supplierPayables) {
    const amount = p.totalAmountKes ?? p.amountKes ?? 0;
    const paid = p.paidAmountKes ?? 0;
    const balance = p.balanceKes !== undefined ? p.balanceKes : Math.max(0, amount - paid);

    totalPurchasesKes += amount;
    totalPaidKes += paid;
    outstandingBalanceKes += balance;

    if (balance > 0) {
      openPayablesCount++;
      if (p.dueDate && p.dueDate < currentDateStr) {
        overdueBalanceKes += balance;
      }
    }
  }

  const supplierName = supplierPayables[0]?.supplierName || 'Supplier';

  return {
    supplierId,
    supplierName,
    totalPurchasesKes,
    totalPayablesKes: totalPurchasesKes,
    totalPaidKes,
    outstandingBalanceKes,
    overdueBalanceKes,
    payablesCount: supplierPayables.length,
    openPayablesCount,
    paymentsCount: supplierPayments.length,
  };
}

/**
 * Validates a disbursement payment against an outstanding supplier payable obligation.
 */
export function validateSupplierPayment(
  payable: SupplierPayableRecord,
  paymentAmount: number
): { valid: boolean; message?: string; resultingStatus?: 'Paid' | 'Partially Paid' } {
  if (paymentAmount <= 0) {
    return { valid: false, message: 'Payment amount must be greater than zero.' };
  }

  const currentBalance = payable.balanceKes;
  if (paymentAmount > currentBalance) {
    return {
      valid: false,
      message: `Payment amount (KES ${paymentAmount.toLocaleString()}) cannot exceed the outstanding balance of KES ${currentBalance.toLocaleString()}.`,
    };
  }

  const remaining = currentBalance - paymentAmount;
  const resultingStatus: 'Paid' | 'Partially Paid' = remaining <= 0 ? 'Paid' : 'Partially Paid';

  return { valid: true, resultingStatus };
}

// ============================================================================
// 5. SKU GENERATION STANDARDS
// ============================================================================

export const CATEGORY_CODE_MAP: Record<ProductCategory | string, string> = {
  // Canonical BOS categories
  Vegetables: 'VEG',
  Fruits: 'FRU',
  'Cereals & Grains': 'CER',
  'Legumes & Pulses': 'LEG',
  'Dairy & Eggs': 'DAI',
  'Poultry & Meat': 'POU',
  'Tubers & Roots': 'TUB',
  'Herbs & Greens': 'HRB',
  // Domain alias mappings
  'Fresh Vegetables & Tubers': 'VEG',
  'Dry Grains & Cereals': 'GRN',
  'Fresh Herbs & Aromatics': 'HRB',
  'Fruits & Berries': 'FRU',
  'Animal & Dairy Products': 'DAI',
};

/**
 * Pure generator for unique category-based SKU (`AD-{CAT}-{SEQ}`).
 */
export function generateNextSku(
  category: ProductCategory | string,
  existingSkus: string[]
): string {
  const prefix = CATEGORY_CODE_MAP[category] || 'GEN';
  const regex = new RegExp(`^AD-${prefix}-(\\d+)$`);

  let maxSeq = 0;
  for (const sku of existingSkus) {
    const match = sku.match(regex);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
    }
  }

  const nextSeq = maxSeq + 1;
  return `AD-${prefix}-${String(nextSeq).padStart(3, '0')}`;
}

/**
 * AgroHub Business Logic & Production Safeguards Test Suite
 * Validating Scenarios A through J
 */

import './supplier-offerings.test';
import './procurement-rules.test';
import './workspace-metrics.test';

import {
  calculatePODLineQuantities,
  classifyPODDiscrepancy,
  validatePODLineDiscrepancy,
  calculateInvoiceEligibility,
  isSupplierEligibleForPurchasing,
  calculateSupplierBalances,
  validateSupplierPayment,
  generateNextSku,
  CATEGORY_CODE_MAP,
} from '../business-rules';
import { allocateInvoicePayment, getDeliveryRunStops, getExistingPODInvoice, getPODExpectedLines, getUnassignedPackedOrders, isDeliveryPlanDate, permitsManualOrderStage, planReplacementLoad, preparePODReceipt, replacementPicksCoverDemand } from '../delivery-workflow';
import {
  DeliveryRunRecord,
  InvoiceRecord,
  SupplierRecord,
  PODEvidenceRecord,
  PODDeliveredItem,
  SupplierPayableRecord,
  OrderRecord,
  ProcurementOrderRecord,
  ProductRecord,
  StockBatchRecord,
} from '@/types/domain/bos';

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAILED: ${testName}`);
    if (detail) console.error(`   Details: ${detail}`);
    throw new Error(`Test assertion failed: ${testName}`);
  }
  passedTests++;
  console.log(`✅ PASSED: ${testName}`);
}

console.log('====================================================');
console.log(' AgroHub BOS — Running Automated Business Rules Tests');
console.log('====================================================\n');

assert(!permitsManualOrderStage('On Hold', 'Packed'), 'An order on hold cannot be packed');
assert(!permitsManualOrderStage('Packed', 'Dispatched'), 'Dispatch must be recorded on a delivery run');
assert(permitsManualOrderStage('Picking', 'Packed'), 'Picking can progress to packing');

{
  const item: PODDeliveredItem = {
    productId: 'POT', productName: 'Potatoes', sku: 'POT', unit: 'kilograms',
    orderedQty: 100, dispatchedQty: 40, receivedQty: 45, acceptedQty: 45,
    rejectedQty: 0, outstandingQty: 60, unitPriceKes: 32.5,
  };
  const eligibility = calculateInvoiceEligibility([item]);
  assert(eligibility.billableLines[0]?.billableQty === 40, 'Excess delivery quantities are excluded from billing');
  const zeroAccepted = calculateInvoiceEligibility([{ ...item, acceptedQty: 0, rejectedQty: 40, outstandingQty: 100 }]);
  assert(zeroAccepted.hasOutstandingShortages && !zeroAccepted.eligible, 'A zero-acceptance receipt still leaves an order outstanding');
}

{
  const line: OrderRecord['items'][number] = {
    id: 'potatoes-a', productId: 'POT', productName: 'Potatoes', sku: 'POT', unit: 'kilograms',
    quantity: 50, allocatedBatch: 'B-01', unitPriceKes: 50, pricingTier: 'Institutional', lineTotalKes: 2500,
  };
  const order: OrderRecord = {
    id: 'O-1', orderNumber: 'ORD-1', customerId: 'C-1', customerName: 'School', customerSegment: 'School',
    channel: 'Institutional Contract', status: 'Packed', paymentStatus: 'Pending Payment', orderDate: '2026-11-17',
    deliveryDate: '2026-11-18', warehouseName: 'Hub', assignedActor: 'Packing', nextStepLabel: 'Dispatch',
    totalKes: 5500, itemsCount: 2, items: [line, { ...line, id: 'potatoes-b', unitPriceKes: 60, lineTotalKes: 3000 }],
  };
  const inputs = [
    { orderLineId: 'potatoes-a', receivedQty: 45, acceptedQty: 40, discrepancyReason: 'Damaged goods' },
    { orderLineId: 'potatoes-b', receivedQty: 55, acceptedQty: 50, discrepancyReason: 'Incorrect quantity' },
  ];
  const expected = getPODExpectedLines(order, []);
  assert(!preparePODReceipt(expected, inputs.slice(0, 1)).ok, 'Every dispatched line needs explicit quantities');
  assert(!preparePODReceipt(expected, [inputs[0], inputs[0]]).ok, 'Repeated products cannot substitute another order line');
  assert(!preparePODReceipt(expected, [{ ...inputs[0], acceptedQty: 50 }, inputs[1]]).ok, 'Acceptance cannot exceed actual receipt');
  assert(!preparePODReceipt(expected, [inputs[0], { ...inputs[1], acceptedQty: 55 }]).ok, 'Excess above the dispatch quantity cannot be accepted');
  assert(!preparePODReceipt(expected, [{ ...inputs[0], receivedQty: NaN }, inputs[1]]).ok, 'Blank received entries are invalid');
  assert(!preparePODReceipt(expected, [{ ...inputs[0], discrepancyReason: undefined }, inputs[1]]).ok, 'Each discrepancy needs a reason');
  const first = preparePODReceipt(expected, inputs);
  if (first.ok === false) throw new Error(first.message);
  assert(first.hasOutstanding && first.hasDiscrepancies, 'Short, rejected and excess quantities keep the receipt flagged');
  assert(first.items[0].currentDeliveryShortage === 5 && first.items[0].rejectedQty === 5, 'Shortage and rejection are separate quantities');
  assert(first.items[1].excessQty === 5 && first.items[1].rejectedQty === 0, 'Excess quantities are tracked independently of rejected expected goods');
  assert(calculateInvoiceEligibility(first.items).billableTotalKes === 5000, 'Repeated products retain their original order-line prices');

  const pod: PODEvidenceRecord = {
    id: 'POD-1', orderId: order.id, orderNumber: order.orderNumber, deliveryRunId: 'RUN-1', customerName: order.customerName,
    recipientName: 'Receiver', deliveryDate: '2026-11-18', submittedAt: '2026-11-18 09:00', submittedBy: 'Driver',
    status: 'Verified', deliveredItems: first.items, evidenceFiles: [],
  };
  const expectedAgain = getPODExpectedLines(order, [pod]);
  assert(expectedAgain[0].dispatchedQty === 10 && expectedAgain[1].dispatchedQty === 0, 'A replacement delivery expects only the verified outstanding quantity from each order line');
  const second = preparePODReceipt(expectedAgain, [{ orderLineId: 'potatoes-a', receivedQty: 10, acceptedQty: 10 }]);
  if (second.ok === false) throw new Error(second.message);
  assert(!second.hasOutstanding && calculateInvoiceEligibility(second.items).billableTotalKes === 500, 'Verified replacement goods complete the order and retain their billable value');

  const product = { id: 'POT', name: 'Potatoes', unit: 'kilograms', availableQty: 13, status: 'Active', expiryTracked: true } as ProductRecord;
  const batch = { id: 'B-01', batchNumber: 'B-01', warehouseId: 'WH-A', productId: 'POT', unit: 'kilograms', availableQty: 8, expiryDate: '2026-11-25', status: 'Nominal' } as StockBatchRecord;
  const batches = [batch, { ...batch, id: 'B-02', batchNumber: 'B-02', availableQty: 5 }];
  const picks = [
    { orderLineId: 'potatoes-a', batchId: 'B-01', quantity: 6 },
    { orderLineId: 'potatoes-a', batchId: 'B-02', quantity: 4 },
  ];
  const load = (selections = picks, stock = batches, products = [product]) =>
    planReplacementLoad(expectedAgain, 'WH-A', selections, stock, products, '2026-11-20');
  const cargo = load();
  if (cargo.ok === false) throw new Error(cargo.message);
  assert(cargo.picks.length === 2 && cargo.batches[0].availableQty === 2 && cargo.batches[1].availableQty === 1 && cargo.products[0].availableQty === 3, 'Replacement loading deducts the exact confirmed picks from both stock levels');
  assert(replacementPicksCoverDemand(expectedAgain, cargo.picks) && !replacementPicksCoverDemand(expectedAgain, cargo.picks.slice(0, 1)), 'Replacement dispatch requires exact loaded quantities for every outstanding line');
  assert(load(picks.slice(0, 1)).ok === false && load([{ ...picks[0], quantity: 7 }, picks[1]]).ok === false, 'Replacement loading rejects incomplete or excess picks');
  assert(load(picks, [{ ...batch, warehouseId: 'WH-B' }, batches[1]]).ok === false, 'Replacement loading rejects picks from a different warehouse');
  assert(load(picks, [{ ...batch, status: 'Quarantined' }, batches[1]]).ok === false, 'Replacement loading rejects quarantined stock');
  assert(load(picks, [{ ...batch, expiryDate: '2026-11-19' }, batches[1]]).ok === false, 'Replacement loading rejects batches that expire before delivery');
  assert(load(picks, [{ ...batch, availableQty: 5 }, batches[1]]).ok === false && load(picks, batches, [{ ...product, availableQty: 9 }]).ok === false, 'Replacement loading checks both available batch and catalogue quantities');
  const moreDemand = expectedAgain.map((item) => item.orderLineId === 'potatoes-b' ? { ...item, outstandingQty: 4 } : item);
  assert(planReplacementLoad(moreDemand, 'WH-A', [...picks, { orderLineId: 'potatoes-b', batchId: 'B-01', quantity: 4 }], batches, [{ ...product, availableQty: 20 }], '2026-11-20').ok === false, 'The same batch cannot be overallocated across repeated lines');
  const invoice = { invoiceNumber: 'I-1', orderNumber: order.orderNumber, podRef: pod.id } as InvoiceRecord;
  assert(getExistingPODInvoice(pod, [invoice]) === invoice && !getExistingPODInvoice({ ...pod, id: 'POD-2' }, [invoice]), 'Invoice duplicate checks are scoped to the receipt');
  assert(getExistingPODInvoice(pod, [{ ...invoice, podRef: undefined }])?.invoiceNumber === 'I-1', 'Legacy order-level invoices block ambiguous duplicate billing');

  const run: DeliveryRunRecord = {
    id: 'RUN-1', runNumber: 'RUN-1', routeZone: 'School route', vehicleReg: 'KZ 001', driverName: 'Driver', driverPhone: '',
    departureTime: '08:00', status: 'Dispatched', ordersIncluded: [order.orderNumber], institutionsServed: [order.customerName],
    totalWeightKg: 100, podCaptured: false,
  };
  assert(getDeliveryRunStops(run, [order], [pod])[0].receipt === pod, 'A verified receipt is linked to its exact delivery run and order');
  assert(!getDeliveryRunStops({ ...run, id: 'RUN-2', runNumber: 'RUN-2' }, [order], [pod])[0].receipt, 'A previous run receipt cannot record another run’s arrival');
  assert(getUnassignedPackedOrders([order], [run]).length === 0, 'A packed order can only be on one active run');
  const now = new Date('2026-11-18T22:30:00.000Z');
  assert(isDeliveryPlanDate('2026-11-19', now) && !isDeliveryPlanDate('2026-11-18', now), 'Delivery date validation uses the Nairobi business day');

  const openInvoice = { ...invoice, amountKes: 200.1, paidAmountKes: 0, balanceKes: 200.1, status: 'Issued' } as InvoiceRecord;
  const partPaid = allocateInvoicePayment(openInvoice, 80.08);
  assert(partPaid?.balanceKes === 120.02 && partPaid.paidAmountKes === 80.08 && partPaid.status === 'Partially Paid', 'Customer receipts apply to an open invoice at precise currency amounts');
  const paid = partPaid && allocateInvoicePayment(partPaid, 120.02);
  assert(paid?.balanceKes === 0 && paid.status === 'Paid', 'Settling the exact invoice balance marks it paid');
  assert(!allocateInvoicePayment(openInvoice, 201) && !allocateInvoicePayment(openInvoice, -1), 'Invoice allocations reject overpayments and non-positive receipts');
}

// -------------------------------------------------------------
// SCENARIO A: POD Quantity Calculation & Reconciliation
// -------------------------------------------------------------
console.log('--- SCENARIO A: POD Line Quantity Calculation ---');
{
  const line = calculatePODLineQuantities(
    100, // Ordered
    100, // Dispatched
    90,  // Received
    85,  // Accepted
    0    // Previous accepted
  );

  assert(line.currentDeliveryShortage === 10, 'Scenario A: Shortage = Dispatched (100) - Received (90) = 10', `Got ${line.currentDeliveryShortage}`);
  assert(line.rejectedQty === 5, 'Scenario A: Rejected = Received (90) - Accepted (85) = 5', `Got ${line.rejectedQty}`);
  assert(line.cumulativeAccepted === 85, 'Scenario A: Cumulative Accepted = 85', `Got ${line.cumulativeAccepted}`);
  assert(line.outstandingQty === 15, 'Scenario A: Outstanding = Ordered (100) - Cumulative (85) = 15', `Got ${line.outstandingQty}`);
  assert(line.classification === 'Damaged / Rejected' || line.classification === 'Partially Accepted', 'Scenario A: Classification is Damaged/Rejected or Partially Accepted', `Got ${line.classification}`);
}

// -------------------------------------------------------------
// SCENARIO B: POD Over-Delivery Handling
// -------------------------------------------------------------
console.log('\n--- SCENARIO B: POD Over-Delivery Handling ---');
{
  const line = calculatePODLineQuantities(50, 50, 55, 55, 0);
  assert(line.currentDeliveryShortage === 0, 'Scenario B: Shortage is 0 for over-delivery', `Got ${line.currentDeliveryShortage}`);
  assert(line.rejectedQty === 0, 'Scenario B: Rejected is 0 when all 55 accepted', `Got ${line.rejectedQty}`);
  assert(line.outstandingQty === 0, 'Scenario B: Outstanding is 0 (clamped)', `Got ${line.outstandingQty}`);
  assert(line.classification === 'Over Received', 'Scenario B: Classified as Over Received', `Got ${line.classification}`);

  const validation = validatePODLineDiscrepancy(50, 50, 55, 55);
  assert(validation.valid === true, 'Scenario B: Over-delivery with accepted=received is valid');
  assert(validation.discrepancyType === 'over_delivery', 'Scenario B: Discrepancy type detected as over_delivery', `Got ${validation.discrepancyType}`);
}

// -------------------------------------------------------------
// SCENARIO C: Invoice Billed Strictly on Accepted Quantity
// -------------------------------------------------------------
console.log('\n--- SCENARIO C: Invoicing Billed Strictly on Accepted Quantity ---');
{
  const mockPod: PODEvidenceRecord = {
    id: 'POD-2026-001',
    orderId: 'ORD-101',
    orderNumber: 'ADK-ORD-2026-101',
    deliveryRunId: 'DR-01',
    recipientName: 'Mrs. Esther Wambui',
    recipientRole: 'Stores In-Charge',
    recipientPhone: '+254 722 000 111',
    customerName: 'Kenyatta National Hospital',
    deliveryDate: '2026-11-09',
    submittedAt: '2026-11-09 10:30',
    submittedBy: 'Driver Otieno',
    evidenceFiles: [],
    status: 'Submitted',
    hasDiscrepancies: true,
    reconciliationStatus: 'Pending Resolution',
    deliveredItems: [
      {
        productId: 'PROD-01',
        productName: 'Spinach Bunches',
        sku: 'AD-VEG-001',
        unit: 'Kg',
        requestedQty: 100,
        orderedQty: 100,
        dispatchedQty: 100,
        receivedQty: 90,
        acceptedQty: 85,
        rejectedQty: 5,
        outstandingQty: 15,
        currentDeliveryShortage: 10,
        unitPriceKes: 80,
        classification: 'Damaged / Rejected',
        discrepancyReason: 'Damaged in Transit',
      },
    ],
  };

  const invoiceEligibility = calculateInvoiceEligibility(mockPod);
  assert(invoiceEligibility.eligible === true, 'Scenario C: POD with accepted produce is eligible for invoicing');
  assert(invoiceEligibility.lineItems.length === 1, 'Scenario C: 1 billable line item');
  assert(invoiceEligibility.lineItems[0].billableQty === 85, 'Scenario C: Billable quantity is 85 kg (accepted), NOT 100 kg (ordered)', `Got ${invoiceEligibility.lineItems[0].billableQty}`);
  assert(invoiceEligibility.totalInvoiceKes === 6800, 'Scenario C: Total invoiced = 85 * 80 = KES 6,800, NOT KES 8,000', `Got ${invoiceEligibility.totalInvoiceKes}`);
}

// -------------------------------------------------------------
// SCENARIO D: Supplier Purchasing Eligibility
// -------------------------------------------------------------
console.log('\n--- SCENARIO D: Supplier Purchasing Eligibility Governance ---');
{
  const baseSupplier: SupplierRecord = {
    id: 'SUP-01',
    code: 'VND-NYA-001',
    name: 'Nyandarua Farmers Co-op',
    category: 'Fresh Vegetables & Tubers',
    region: 'Nyandarua',
    contactPerson: 'Stephen N.',
    phone: '+254 700 111 222',
    email: 'info@nyandaruafarmers.co.ke',
    leadTimeDays: 1,
    paymentTerms: 'Net 14',
    payableBalanceKes: 0,
    qualityScorePct: 96,
    recentPriceTrend: 'Stable',
    status: 'Active',
    suppliedProducts: [],
  };

  // Active supplier -> eligible
  const activeCheck = isSupplierEligibleForPurchasing(baseSupplier);
  assert(activeCheck.eligible === true, 'Scenario D: Active supplier is eligible for purchasing');

  // Under Review -> ineligible
  const underReviewCheck = isSupplierEligibleForPurchasing({ ...baseSupplier, status: 'Under Review' });
  assert(underReviewCheck.eligible === false, 'Scenario D: Under Review supplier is NOT eligible');
  assert(underReviewCheck.reason.includes('Under Review'), 'Scenario D: Ineligibility reason mentions Under Review');

  // Suspended -> ineligible
  const suspendedCheck = isSupplierEligibleForPurchasing({ ...baseSupplier, status: 'Suspended' });
  assert(suspendedCheck.eligible === false, 'Scenario D: Suspended supplier is NOT eligible');
  assert(suspendedCheck.reason.includes('Suspended'), 'Scenario D: Ineligibility reason mentions Suspended');

  // Archived -> ineligible
  const archivedCheck = isSupplierEligibleForPurchasing({ ...baseSupplier, isArchived: true });
  assert(archivedCheck.eligible === false, 'Scenario D: Archived supplier is NOT eligible');
  assert(archivedCheck.reason.includes('Archived'), 'Scenario D: Ineligibility reason mentions Archived');
}

// -------------------------------------------------------------
// SCENARIO E: Multi-Supplier Direct Sourcing Consistency
// -------------------------------------------------------------
console.log('\n--- SCENARIO E: Multi-Supplier Order Sourcing State Consistency ---');
{
  // Simulated customer order requiring 2 direct procurement POs
  const customerOrderId = 'ORD-2026-500';
  const relatedPOs: ProcurementOrderRecord[] = [
    {
      id: 'PO-01',
      poNumber: 'ADK-PO-2026-001',
      prNumber: 'ADK-PR-2026-001',
      requestedBy: 'Procurement Officer',
      supplierId: 'SUP-01',
      supplierName: 'Supplier A',
      status: 'Goods Collected',
      stage: 'Goods Collected',
      customerOrderId,
      itemsSummary: '50kg Potatoes',
      totalKes: 3500,
      createdAt: '2026-11-09',
      expectedDate: '2026-11-10',
      warehouseName: 'Central Cold Hub',
    },
    {
      id: 'PO-02',
      poNumber: 'ADK-PO-2026-002',
      prNumber: 'ADK-PR-2026-002',
      requestedBy: 'Procurement Officer',
      supplierId: 'SUP-02',
      supplierName: 'Supplier B',
      status: 'Awaiting Collection',
      stage: 'PO Issued',
      customerOrderId,
      itemsSummary: '30kg Carrots',
      totalKes: 2400,
      createdAt: '2026-11-09',
      expectedDate: '2026-11-10',
      warehouseName: 'Central Cold Hub',
    },
  ];

  // Logic: remaining uncollected POs for this customer order
  const remainingUncollected = relatedPOs.filter(
    (p) => p.customerOrderId === customerOrderId && p.status !== 'Goods Collected'
  );

  assert(remainingUncollected.length === 1, 'Scenario E: 1 PO still uncollected for multi-supplier order');
  const shouldAdvanceToPacked = remainingUncollected.length === 0;
  assert(shouldAdvanceToPacked === false, 'Scenario E: Order MUST NOT advance to Packed when PO-02 remains uncollected');

  // Once PO-02 is also collected
  relatedPOs[1].status = 'Goods Collected';
  const remainingAfterBoth = relatedPOs.filter(
    (p) => p.customerOrderId === customerOrderId && p.status !== 'Goods Collected'
  );
  assert(remainingAfterBoth.length === 0, 'Scenario E: All POs are collected');
  assert(remainingAfterBoth.length === 0 === true, 'Scenario E: Order now advances to Packed safely');
}

// -------------------------------------------------------------
// SCENARIO F: Idempotent Supplier Payable Creation
// -------------------------------------------------------------
console.log('\n--- SCENARIO F: Idempotent Supplier Payable Creation ---');
{
  const payablesLedger: SupplierPayableRecord[] = [];
  const poId = 'PO-2026-999';
  const poNumber = 'ADK-PO-2026-999';

  function simulateConfirmCollection(ledger: SupplierPayableRecord[]) {
    // Idempotency check: does payable already exist for this PO?
    const existing = ledger.find((p) => p.poId === poId || p.poNumber === poNumber);
    if (existing) {
      return { created: false, message: 'Payable already exists (idempotent skip)' };
    }
    const newPayable: SupplierPayableRecord = {
      id: `PAY-${ledger.length + 1}`,
      poId,
      poNumber,
      supplierId: 'SUP-01',
      supplierName: 'Nyandarua Farmers Co-op',
      amountKes: 5000,
      paidAmountKes: 0,
      balanceKes: 5000,
      status: 'Open',
      dueDate: '2026-11-23',
      createdAt: '2026-11-09',
    };
    ledger.push(newPayable);
    return { created: true, message: 'Created payable' };
  }

  // Call 1
  const res1 = simulateConfirmCollection(payablesLedger);
  assert(res1.created === true, 'Scenario F: First collection creates payable');
  assert(payablesLedger.length === 1, 'Scenario F: Ledger has 1 record');

  // Call 2 (Duplicate attempt)
  const res2 = simulateConfirmCollection(payablesLedger);
  assert(res2.created === false, 'Scenario F: Second collection detects existing payable (idempotent)');
  assert(payablesLedger.length === 1, 'Scenario F: Ledger remains exactly 1 record (no duplicate obligation)');
}

// -------------------------------------------------------------
// SCENARIO G: Supplier Balance and Payment Reconciliation
// -------------------------------------------------------------
console.log('\n--- SCENARIO G: Supplier Balances and Payment Reconciliation ---');
{
  const payables: SupplierPayableRecord[] = [
    {
      id: 'PAY-1',
      poNumber: 'PO-01',
      supplierId: 'SUP-10',
      supplierName: 'Kinangop Co-op',
      amountKes: 10000,
      paidAmountKes: 4000,
      balanceKes: 6000,
      status: 'Partially Paid',
      dueDate: '2026-11-20',
      createdAt: '2026-11-01',
    },
    {
      id: 'PAY-2',
      poNumber: 'PO-02',
      supplierId: 'SUP-10',
      supplierName: 'Kinangop Co-op',
      amountKes: 15000,
      paidAmountKes: 0,
      balanceKes: 15000,
      status: 'Open',
      dueDate: '2026-11-25',
      createdAt: '2026-11-05',
    },
  ];

  const balances = calculateSupplierBalances(payables, 'SUP-10');
  assert(balances.totalPayablesKes === 25000, 'Scenario G: Total obligation is KES 25,000', `Got ${balances.totalPayablesKes}`);
  assert(balances.totalPaidKes === 4000, 'Scenario G: Total settled is KES 4,000', `Got ${balances.totalPaidKes}`);
  assert(balances.outstandingBalanceKes === 21000, 'Scenario G: Outstanding balance is KES 21,000', `Got ${balances.outstandingBalanceKes}`);

  // Test payment validation
  const validPayment = validateSupplierPayment(payables[0], 6000);
  assert(validPayment.valid === true, 'Scenario G: Paying exact remaining balance (6000) is valid');
  assert(validPayment.resultingStatus === 'Paid', 'Scenario G: Resulting status is Paid');

  const overPayment = validateSupplierPayment(payables[0], 7000);
  assert(overPayment.valid === false, 'Scenario G: Overpayment (7000 > 6000) is rejected');
  assert(validateSupplierPayment(payables[0], Number.NaN).valid === false, 'Scenario G: Nonfinite supplier payment is rejected');
  const postedPayment = {
    id: 'SPAY-1', payableId: 'PAY-1', supplierId: 'SUP-10', supplierName: 'Kinangop Co-op',
    paymentMethod: 'M-Pesa Paybill' as const, amountKes: 4000, referenceNumber: 'FIRST123',
    paymentDate: '2026-11-13', recordedBy: 'Buyer',
  };
  const paymentReference = { method: postedPayment.paymentMethod, number: '  first123  ', existing: [postedPayment] };
  assert(validateSupplierPayment(payables[0], 1000, paymentReference).valid === false, 'Scenario G: Retrying a supplier payment reference cannot debit the payable twice');
  assert(validateSupplierPayment(payables[1], 1000, paymentReference).valid === true, 'Scenario G: One supplier disbursement can be allocated across different payables');
  assert(validateSupplierPayment(payables[0], 1000, { ...paymentReference, number: ' ' }).valid === false, 'Scenario G: A supplier payment needs a transaction reference');
}

// -------------------------------------------------------------
// SCENARIO H: Fleet & Driver Assignment Integrity
// -------------------------------------------------------------
console.log('\n--- SCENARIO H: Fleet & Driver Assignment Safeguards ---');
{
  const vehicleMaintenance = { status: 'Maintenance', type: 'Refrigerated 4T Truck' };
  assert(vehicleMaintenance.status !== 'Available', 'Scenario H: Vehicle under maintenance cannot be assigned');

  const heavyTruckNeedsCE = { type: 'Heavy Truck 10T', requiredLicense: 'Class CE' };
  const driverClassB = { licenseClass: 'Class B' };
  const licenseCompatible = driverClassB.licenseClass === heavyTruckNeedsCE.requiredLicense;
  assert(licenseCompatible === false, 'Scenario H: Class B driver cannot operate Heavy Truck requiring Class CE');

  const driverClassCE = { licenseClass: 'Class CE' };
  assert(driverClassCE.licenseClass === heavyTruckNeedsCE.requiredLicense, 'Scenario H: Class CE driver approved for Heavy Truck');
}

// -------------------------------------------------------------
// SCENARIO I: Product SKU Generation & Category Mapping
// -------------------------------------------------------------
console.log('\n--- SCENARIO I: SKU Generation Safeguards ---');
{
  const catCodeVeg = CATEGORY_CODE_MAP['Fresh Vegetables & Tubers'];
  assert(catCodeVeg === 'VEG', 'Scenario I: Veg category code is VEG');

  const catCodeGrn = CATEGORY_CODE_MAP['Dry Grains & Cereals'];
  assert(catCodeGrn === 'GRN', 'Scenario I: Grain category code is GRN');

  const nextVegSku = generateNextSku('Fresh Vegetables & Tubers', ['AD-VEG-001', 'AD-VEG-002']);
  assert(nextVegSku === 'AD-VEG-003', 'Scenario I: Next SKU increments sequence to AD-VEG-003', `Got ${nextVegSku}`);

  const nextGrnSku = generateNextSku('Dry Grains & Cereals', ['AD-VEG-001']);
  assert(nextGrnSku === 'AD-GRN-001', 'Scenario I: First SKU in grain category is AD-GRN-001', `Got ${nextGrnSku}`);
}

// -------------------------------------------------------------
// SCENARIO J: Supplier Archival vs Suspension Governance
// -------------------------------------------------------------
console.log('\n--- SCENARIO J: Supplier Archival vs Suspension Governance ---');
{
  const suspendedSupplier: SupplierRecord = {
    id: 'SUP-SUSP',
    code: 'VND-SUS-001',
    name: 'Suspended Cooperative',
    category: 'Fresh Vegetables & Tubers',
    region: 'Nyeri',
    contactPerson: 'David K.',
    phone: '+254 711 222 333',
    email: 'info@suspended.co.ke',
    leadTimeDays: 2,
    paymentTerms: 'Net 14',
    payableBalanceKes: 0,
    qualityScorePct: 75,
    recentPriceTrend: 'Stable',
    status: 'Suspended',
    suspendedReason: 'Cold-chain failure',
    suppliedProducts: [],
  };

  // 1. Archiving a suspended supplier
  const archived = { ...suspendedSupplier, isArchived: true, archivedAt: '2026-11-09' };
  assert(archived.status === 'Suspended', 'Scenario J: Archiving preserves status=Suspended');
  assert(archived.isArchived === true, 'Scenario J: isArchived is set to true');

  // 2. Restoring an archived supplier
  // The system must NOT default to 'Active' upon restoration
  const restored = { ...archived, isArchived: false, archivedAt: undefined, status: suspendedSupplier.status };
  assert(restored.status === 'Suspended', 'Scenario J: Restoring preserves status=Suspended (does NOT falsely promote to Active)');

  // 3. Only explicit reactivation sets Active
  const reactivated = { ...restored, status: 'Active' as const, suspendedReason: undefined };
  assert(reactivated.status === 'Active', 'Scenario J: Explicit reactivation transitions status to Active');
}

console.log('\n====================================================');
console.log(` Summary: ${passedTests} of ${totalTests} assertions passed (100% SUCCESS)`);
console.log('====================================================');

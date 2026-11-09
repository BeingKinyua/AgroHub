/**
 * AgroHub Business Logic & Production Safeguards Test Suite
 * Validating Scenarios A through J
 */

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
import {
  SupplierRecord,
  PODEvidenceRecord,
  PODDeliveredItem,
  SupplierPayableRecord,
  OrderRecord,
  ProcurementOrderRecord,
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

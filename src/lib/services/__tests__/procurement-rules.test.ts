import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildPurchaseLines,
  getOrderSourcingLines,
  getSupplierDueDate,
  planPurchaseReceipt,
  reserveOrderStock,
  resolveOrderAllocation,
} from '../procurement-rules';
import type { OrderRecord, ProcurementOrderRecord, ProductRecord, SupplierRecord } from '../../../types/domain/bos';

const product = {
  id: 'P1', name: 'Potatoes', sku: 'POT-01', unit: 'kilograms', status: 'Active',
  availableQty: 50, reservedQty: 0,
} as ProductRecord;
const supplier = {
  suppliedProducts: [{ productId: 'P1', unit: 'kilograms', currentCostKes: 40, moq: 10 }],
} as SupplierRecord;
const order = {
  id: 'O1', orderNumber: 'ORD-1', status: 'Confirmed', items: [
    { id: 'L1', productId: 'P1', productName: 'Potatoes', unit: 'kilograms', quantity: 100, stockAllocatedQty: 40 },
    { id: 'L2', productId: 'P1', productName: 'Potatoes', unit: 'kilograms', quantity: 10, stockAllocatedQty: 0 },
  ],
} as OrderRecord;
const lines = [{
  id: 'PO-L1', customerOrderLineId: 'L1', productId: 'P1', productName: 'Potatoes',
  sku: 'POT-01', unit: 'kilograms' as const, quantity: 60, unitCostKes: 40, lineTotalKes: 2400,
}];
const po = {
  id: 'P01', stage: 'PO Issued', customerOrderId: 'O1', lines,
} as ProcurementOrderRecord;

test('stock and direct allocations must agree with quantity and sourcing mode', () => {
  assert.equal(resolveOrderAllocation({ productId: 'P1', quantity: 10, sourcingMode: 'mixed', stockAllocatedQty: 4, directProcuredQty: 5 }, 10).ok, false);
  assert.equal(resolveOrderAllocation({ productId: 'P1', quantity: 10, sourcingMode: 'direct_procurement', stockAllocatedQty: 4 }, 10).ok, false);
  assert.equal(resolveOrderAllocation({ productId: 'P1', quantity: 10, sourcingMode: 'existing_stock' }, 4).ok, false);
  assert.equal(resolveOrderAllocation({ productId: 'P1', quantity: Infinity }, 4).ok, false);
});

test('repeated products reserve the combined stock from their independent order lines', () => {
  const reserved = reserveOrderStock([product], [
    { productId: 'P1', stockAllocatedQty: 5 },
    { productId: 'P1', stockAllocatedQty: 7 },
  ]);
  assert.equal(reserved[0].availableQty, 38);
  assert.equal(reserved[0].reservedQty, 12);
});

test('outstanding direct demand follows collection quantities and distinguishes identical products', () => {
  const receipt = planPurchaseReceipt(po, [{ lineId: 'PO-L1', quantity: 35, unitCostKes: 37 }]);
  assert.equal(receipt.ok, true);
  if (!receipt.ok) return;
  const sourcing = getOrderSourcingLines(order, [{
    ...po,
    receipts: [{ id: 'R1', receivedAt: '2026-11-19', lines: receipt.lines, totalKes: receipt.totalKes, payableId: 'AP1' }],
  }]);
  assert.deepEqual(sourcing.map((line) => [line.directRequired, line.collected, line.outstanding, line.uncommitted]), [
    [60, 35, 25, 0],
    [10, 0, 10, 10],
  ]);
});

test('purchase lines derive totals and reject unoffered goods and overcommitment', () => {
  const demand = getOrderSourcingLines(order, []);
  const planned = buildPurchaseLines(supplier, [product], [
    { productId: 'P1', customerOrderLineId: 'L1', quantity: 10, unitCostKes: 39.50 },
    { productId: 'P1', customerOrderLineId: 'L2', quantity: 10, unitCostKes: 40 },
  ], demand);
  assert.equal(planned.ok && planned.totalKes, 795);
  assert.equal(buildPurchaseLines(supplier, [product], [{ productId: 'P2', quantity: 10, unitCostKes: 39 }]).ok, false);
  assert.equal(buildPurchaseLines(supplier, [product], [{ productId: 'P1', customerOrderLineId: 'L2', quantity: 12, unitCostKes: 39 }], demand).ok, false);
  assert.equal(buildPurchaseLines(supplier, [product], [{ productId: 'P1', quantity: 5, unitCostKes: 39 }]).ok, false);
});

test('partial receipts charge actual unit cost and prevent over-receipts', () => {
  const partial = planPurchaseReceipt(po, [{ lineId: 'PO-L1', quantity: 35, unitCostKes: 37 }]);
  assert.equal(partial.ok, true);
  if (!partial.ok) return;
  assert.equal(partial.totalKes, 1295);
  assert.equal(partial.complete, false);
  const received = { ...po, receipts: [{ id: 'R1', receivedAt: '2026-11-19', lines: partial.lines, totalKes: partial.totalKes, payableId: 'AP1' }] };
  assert.equal(planPurchaseReceipt(received, [{ lineId: 'PO-L1', quantity: 26, unitCostKes: 37 }]).ok, false);
  const full = planPurchaseReceipt(received, [{ lineId: 'PO-L1', quantity: 25, unitCostKes: 39 }]);
  assert.equal(full.ok && full.complete, true);
});

test('closing a short purchase releases the unreceived amount for another supplier', () => {
  const partial = planPurchaseReceipt(po, [{ lineId: 'PO-L1', quantity: 35, unitCostKes: 37 }]);
  assert.equal(partial.ok, true);
  if (!partial.ok) return;
  const sourcing = getOrderSourcingLines(order, [{
    ...po,
    stage: 'Closed Short',
    receipts: [{ id: 'R1', receivedAt: '2026-11-19', lines: partial.lines, totalKes: partial.totalKes, payableId: 'AP1' }],
  }]);
  assert.equal(sourcing[0].collected, 35);
  assert.equal(sourcing[0].uncommitted, 25);
});

test('supplier credit terms determine the due date without a generic fallback', () => {
  assert.equal(getSupplierDueDate('2026-11-19', 'Net 30'), '2026-12-19');
  assert.equal(getSupplierDueDate('2026-11-19', 'Cash on delivery'), '2026-11-19');
  assert.equal(getSupplierDueDate('2026-11-19', 'Special arrangement'), undefined);
});

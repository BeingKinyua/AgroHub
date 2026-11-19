import assert from 'node:assert/strict';
import type { ProductRecord, SupplierProductItem } from '../../../types/domain/bos';
import { reconcileSupplierOfferings } from '../supplier-offerings';

const product: Pick<ProductRecord, 'id' | 'name' | 'unit' | 'status'> = {
  id: 'TOMATO',
  name: 'Tomatoes',
  unit: 'kilograms',
  status: 'Active',
};
const quote = { productId: product.id, unit: product.unit, currentCostKes: 80, minOrderQty: 2.5 };
const options = {
  catalog: [product],
  supplierId: 'SUP-01',
  leadTimeDays: 2,
  recordedAt: '2026-11-19T08:00:00.000Z',
  recordedBy: 'Buyer',
};

for (const [drafts, expectedMessage] of [
  [[{ ...quote, productId: '' }], /choose a catalogue product/i],
  [[{ ...quote, productId: 'UNKNOWN' }], /choose a catalogue product/i],
  [[quote, quote], /already listed/i],
  [[{ ...quote, unit: 'bags' }], /kilograms/i],
  [[{ ...quote, currentCostKes: Number.NaN }], /quote/i],
  [[{ ...quote, currentCostKes: Number.POSITIVE_INFINITY }], /quote/i],
  [[{ ...quote, minOrderQty: 0 }], /minimum order/i],
  [[{ ...quote, minOrderQty: Number.POSITIVE_INFINITY }], /minimum order/i],
] as const) {
  const result = reconcileSupplierOfferings(drafts, options);
  assert.equal(result.ok, false);
  assert.match(result.message, expectedMessage);
}

const first = reconcileSupplierOfferings([quote], options);
const otherSupplier = reconcileSupplierOfferings([quote], { ...options, supplierId: 'SUP-02' });
assert(first.ok && otherSupplier.ok);
assert.notEqual(first.offerings[0].id, otherSupplier.offerings[0].id);
assert.equal(first.offerings[0].productName, 'Tomatoes');
assert.equal(first.offerings[0].currentCostKes, 80);
assert.equal(first.offerings[0].minOrderQty, 2.5);

const prior: SupplierProductItem = {
  ...first.offerings[0],
  id: 'existing-supplier-offering',
};
const updateOptions = {
  ...options,
  existing: [prior],
  recordedAt: '2026-11-20T10:00:00.000Z',
};
const unchanged = reconcileSupplierOfferings([{ ...quote, notes: 'Collect before noon' }], updateOptions);
assert(unchanged.ok);
assert.equal(unchanged.offerings[0].id, 'existing-supplier-offering');
assert.equal(unchanged.offerings[0].lastPriceUpdate, '2026-11-19');
assert.deepEqual(unchanged.offerings[0].quoteHistory?.map((event) => event.priceKes), [80]);

const changed = reconcileSupplierOfferings([{ ...quote, currentCostKes: 87 }], updateOptions);
assert(changed.ok);
assert.equal(changed.offerings[0].id, 'existing-supplier-offering');
assert.equal(changed.offerings[0].previousCostKes, 80);
assert.equal(changed.offerings[0].lastPriceUpdate, '2026-11-20');
assert.deepEqual(changed.offerings[0].quoteHistory?.map((event) => event.priceKes), [80, 87]);

const removed = reconcileSupplierOfferings([], updateOptions);
assert(removed.ok);
assert.deepEqual(removed.offerings, []);
const relinked = reconcileSupplierOfferings([{ ...quote, currentCostKes: 90 }], {
  ...updateOptions,
  existing: [],
  retired: removed.retired,
});
assert(relinked.ok);
assert.equal(relinked.offerings[0].id, 'existing-supplier-offering');
assert.deepEqual(relinked.offerings[0].quoteHistory?.map((event) => event.priceKes), [80, 90]);
assert.deepEqual(relinked.retired, []);

const legacy = reconcileSupplierOfferings([quote], {
  ...options,
  existing: [{ ...quote, id: product.id, productName: 'Tomatoes', previousCostKes: 75, lastUpdated: '2026-11-10' }],
});
assert(legacy.ok);
assert.equal(legacy.offerings[0].id, first.offerings[0].id);
assert.equal(legacy.offerings[0].lastUpdated, '2026-11-10');
assert.deepEqual(legacy.offerings[0].quoteHistory?.map((event) => event.priceKes), [75, 80]);

console.log('Supplier offering regression checks passed.');

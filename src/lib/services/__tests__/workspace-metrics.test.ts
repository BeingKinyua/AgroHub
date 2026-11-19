import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getBillingReport, getNairobiDate, getOpenPayables, isAssignedDeliveryRun } from '../workspace-metrics';
import type { DeliveryRunRecord, DriverRecord, InvoiceRecord, SupplierPayableRecord } from '../../../types/domain/bos';

test('uses the Nairobi business date at the UTC day boundary', () => {
  assert.equal(getNairobiDate(new Date('2026-11-18T22:00:00Z')), '2026-11-19');
});

test('shows only outstanding payables due by the cutoff in due-date order', () => {
  const payable = (id: string, dueDate: string, balanceKes: number) =>
    ({ id, dueDate, balanceKes } as SupplierPayableRecord);
  assert.deepEqual(getOpenPayables([
    payable('paid', '2026-11-01', 0),
    payable('upcoming', '2026-11-22', 300),
    payable('late', '2026-11-18', 600),
    payable('future', '2026-12-01', 900),
  ], '2026-11-26').map(({ id }) => id), ['late', 'upcoming']);
});

test('prefers the assigned driver ID to the display name when scoping a run', () => {
  const drivers = [{ id: 'driver-1', fullName: 'Joseph Omondi' }] as DriverRecord[];
  const run = { driverName: 'Joseph Omondi' } as DeliveryRunRecord;
  assert.equal(isAssignedDeliveryRun({ ...run, assignedDriverId: 'someone-else' }, drivers, 'Joseph Omondi'), false);
  assert.equal(isAssignedDeliveryRun({ ...run, assignedDriverId: 'driver-1', driverName: 'Old name' }, drivers, 'Joseph Omondi'), true);
  assert.equal(isAssignedDeliveryRun(run, drivers, 'Joseph Omondi'), true);
});

test('reports invoice records within the period and discloses missing line detail', () => {
  const invoice = (id: string, issueDate: string, amountKes: number, balanceKes: number) =>
    ({ id, issueDate, amountKes, balanceKes } as InvoiceRecord);
  const result = getBillingReport([
    invoice('too-early', '2026-10-31', 1000, 1000),
    invoice('legacy', '2026-11-01', 600, 100),
    invoice('future', '2026-11-20', 900, 900),
    {
      ...invoice('itemized', '2026-11-19', 250, 0),
      lineItems: [{ productId: 'P-1', productName: 'Potatoes', lineTotalKes: 250 } as InvoiceRecord['lineItems'][number]],
    },
  ], [], '2026-11-01', '2026-11-19');
  assert.deepEqual(result.invoices.map(({ id }) => id), ['itemized', 'legacy']);
  assert.equal(result.invoicedKes, 850);
  assert.equal(result.outstandingKes, 100);
  assert.equal(result.unitemizedKes, 600);
  assert.deepEqual(result.categories.map(({ category, amountKes }) => ({ category, amountKes })), [
    { category: 'Uncategorized products', amountKes: 250 },
  ]);
});

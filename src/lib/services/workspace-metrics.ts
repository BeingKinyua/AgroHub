import type { DeliveryRunRecord, DriverRecord, InvoiceRecord, ProductRecord, SupplierPayableRecord } from '../../types/domain/bos';

const nairobiDate = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Africa/Nairobi',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function getNairobiDate(date = new Date()) {
  return nairobiDate.format(date);
}

export function offsetBusinessDate(day: string, days: number) {
  const date = new Date(day + 'T00:00:00Z');
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function getOpenPayables(payables: SupplierPayableRecord[], dueThrough?: string) {
  return payables
    .filter((payable) => payable.balanceKes > 0 && (!dueThrough || (payable.dueDate && payable.dueDate <= dueThrough)))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export function isAssignedDeliveryRun(run: DeliveryRunRecord, drivers: DriverRecord[], fullName: string) {
  if (!run.assignedDriverId) return run.driverName === fullName;
  return drivers.some((driver) => driver.id === run.assignedDriverId && driver.fullName === fullName);
}

export function getBillingReport(invoices: InvoiceRecord[], products: ProductRecord[], from: string, through: string) {
  const rows = invoices
    .filter((invoice) => invoice.issueDate && invoice.issueDate >= from && invoice.issueDate <= through)
    .sort((a, b) => b.issueDate.localeCompare(a.issueDate) || a.invoiceNumber.localeCompare(b.invoiceNumber));
  const categoryByProduct = new Map(products.map((product) => [product.id, product.category]));
  const categories = new Map<string, { category: string; amountKes: number; invoices: InvoiceRecord[] }>();
  let invoicedKes = 0;
  let outstandingKes = 0;
  let unitemizedKes = 0;

  for (const invoice of rows) {
    invoicedKes += invoice.amountKes;
    outstandingKes += invoice.balanceKes;
    if (!invoice.lineItems?.length) unitemizedKes += invoice.amountKes;
    for (const line of invoice.lineItems ?? []) {
      const category = categoryByProduct.get(line.productId) ?? 'Uncategorized products';
      const entry = categories.get(category) ?? { category, amountKes: 0, invoices: [] };
      entry.amountKes += line.lineTotalKes;
      if (entry.invoices.at(-1) !== invoice) entry.invoices.push(invoice);
      categories.set(category, entry);
    }
  }

  return {
    invoices: rows,
    categories: [...categories.values()].sort((a, b) => b.amountKes - a.amountKes),
    invoicedKes,
    outstandingKes,
    unitemizedKes,
  };
}

'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { useBos } from '@/lib/services/bos-context';
import { Card, EmptyState, KPI, PageHeader } from '@/components/ui/primitives';
import { getBillingReport, getNairobiDate, offsetBusinessDate } from '@/lib/services/workspace-metrics';

const kes = (amount: number) => 'KES ' + amount.toLocaleString('en-KE', { maximumFractionDigits: 2 });
const csvCell = (value: string | number) => {
  const text = String(value);
  const safeText = typeof value === 'string' && /^[\s]*[=+@-]/.test(text) ? "'" + text : text;
  return '"' + safeText.replaceAll('"', '""') + '"';
};

export default function ReportsPage() {
  const { can, invoices, products } = useBos();
  const today = getNairobiDate();
  const [from, setFrom] = useState(() => offsetBusinessDate(today, -89));
  const [through, setThrough] = useState(today);
  const [category, setCategory] = useState('');
  const invalidDates = !from || !through || from > through;
  const report = getBillingReport(invalidDates ? [] : invoices, products, from, through);
  const selectedCategory = report.categories.find((row) => row.category === category);
  const rows = selectedCategory?.invoices ?? report.invoices;
  const dateControl = 'min-h-11 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 text-sm';

  const exportReport = () => {
    const csv = [
      'Invoice,Customer,Issue date,Due date,Invoiced (KES),Outstanding (KES),Status',
      ...rows.map((invoice) => [
        invoice.invoiceNumber, invoice.customerName, invoice.issueDate, invoice.dueDate,
        invoice.amountKes, invoice.balanceKes, invoice.status,
      ].map(csvCell).join(',')),
    ].join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'agrohub-billing-' + from + '-to-' + through + '.csv';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Reports"
        description="Review invoices issued in a period and drill down by product category."
        actions={can('reports.export') && (
          <button
            type="button"
            disabled={!rows.length}
            onClick={exportReport}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#1F6A37] px-4 text-sm font-semibold text-white hover:bg-[#12512C] disabled:opacity-50"
          >
            <Download className="size-4" aria-hidden="true" />
            Export invoices
          </button>
        )}
      />

      <Card padding="p-4">
        <fieldset>
          <legend className="mb-3 font-heading text-base font-semibold">Invoice issue date</legend>
          <div className="grid gap-3 sm:flex sm:flex-wrap sm:items-end">
            <label className="grid gap-1 text-sm">
              From
              <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className={dateControl} />
            </label>
            <label className="grid gap-1 text-sm">
              To
              <input type="date" value={through} onChange={(event) => setThrough(event.target.value)} className={dateControl} />
            </label>
            <button
              type="button"
              onClick={() => { setFrom(offsetBusinessDate(today, -89)); setThrough(today); }}
              className="min-h-11 justify-self-start px-2 text-sm font-medium text-[var(--brand-accent)] hover:underline"
            >
              Last 90 days
            </button>
          </div>
          {invalidDates && <p role="alert" className="mt-2 text-sm text-red-700 dark:text-red-300">Enter a valid date range. The start date must be on or before the end date.</p>}
        </fieldset>
      </Card>

      {!invalidDates && (
        <>
          <section aria-label="Billing totals" className="grid gap-4 sm:grid-cols-3">
            <KPI label="Invoices issued" value={String(report.invoices.length)} />
            <KPI label="Invoiced amount" value={kes(report.invoicedKes)} />
            <KPI label="Outstanding on these invoices" value={kes(report.outstandingKes)} />
          </section>

          {report.invoices.length ? (
            <Card padding="p-4 sm:p-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <h2 className="font-heading text-lg font-semibold">Invoice breakdown</h2>
                <label className="grid gap-1 text-sm">
                  Product category
                  <select
                    className={dateControl}
                    value={selectedCategory?.category ?? ''}
                    onChange={(event) => setCategory(event.target.value)}
                  >
                    <option value="">All invoices</option>
                    {report.categories.map((row) => <option key={row.category} value={row.category}>{row.category}</option>)}
                  </select>
                </label>
              </div>
              {selectedCategory && (
                <p className="mt-3 text-sm">
                  {kes(selectedCategory.amountKes)} in itemized sales for {selectedCategory.category}. The rows show full invoice amounts.
                </p>
              )}
              {report.unitemizedKes > 0 && (
                <p className="mt-3 text-sm text-[var(--text-secondary)]">
                  {kes(report.unitemizedKes)} is recorded on invoices without item details and appears under All invoices.
                </p>
              )}

              <div className="mt-4 hidden overflow-x-auto sm:block">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-[var(--border-subtle)] text-[var(--text-secondary)]">
                    <tr>
                      <th scope="col" className="py-2 pr-3 font-medium">Invoice</th>
                      <th scope="col" className="py-2 pr-3 font-medium">Customer</th>
                      <th scope="col" className="py-2 pr-3 font-medium">Issued</th>
                      <th scope="col" className="py-2 pr-3 text-right font-medium">Invoiced</th>
                      <th scope="col" className="py-2 text-right font-medium">Outstanding</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {rows.map((invoice) => (
                      <tr key={invoice.id}>
                        <th scope="row" className="py-3 pr-3 font-medium">{invoice.invoiceNumber}</th>
                        <td className="py-3 pr-3">{invoice.customerName}</td>
                        <td className="whitespace-nowrap py-3 pr-3">{invoice.issueDate}</td>
                        <td className="whitespace-nowrap py-3 pr-3 text-right font-mono-tabular">{kes(invoice.amountKes)}</td>
                        <td className="whitespace-nowrap py-3 text-right font-mono-tabular">{kes(invoice.balanceKes)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className="mt-3 divide-y divide-[var(--border-subtle)] sm:hidden">
                {rows.map((invoice) => (
                  <li key={invoice.id} className="py-3 text-sm">
                    <p className="font-semibold">{invoice.invoiceNumber}</p>
                    <p>{invoice.customerName}</p>
                    <p className="text-[var(--text-secondary)]">{invoice.issueDate} · {invoice.status}</p>
                    <p className="mt-1 font-mono-tabular">{kes(invoice.amountKes)} invoiced · {kes(invoice.balanceKes)} outstanding</p>
                  </li>
                ))}
              </ul>
            </Card>
          ) : (
            <EmptyState title="No invoices in this period" description="Choose a different date range to find issued invoices." />
          )}
        </>
      )}
    </div>
  );
}

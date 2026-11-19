'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useBos } from '@/lib/services/bos-context';
import { Card, FeedbackBanner, KPI, Modal, PageHeader, StatusBadge } from '@/components/ui/primitives';
import { calculateInvoiceEligibility } from '@/lib/services/business-rules';
import { getExistingPODInvoice } from '@/lib/services/delivery-workflow';

const money = (value: number) => `KES ${value.toLocaleString('en-KE', { maximumFractionDigits: 2 })}`;

export default function InvoicesPage() {
  const { invoices, orders, customers, podRecords, can, generateDraftInvoice } = useBos();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingIssueId, setPendingIssueId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const selected = invoices.find((invoice) => invoice.id === selectedId);
  const selectedCustomer = customers.find((customer) => customer.id === selected?.customerId);
  const readyToInvoice = podRecords.flatMap((pod) => {
    if (pod.status !== 'Verified' || getExistingPODInvoice(pod, invoices)) return [];
    const order = orders.find((entry) => entry.id === pod.orderId && entry.orderNumber === pod.orderNumber);
    const customer = customers.find((entry) => entry.id === order?.customerId);
    const billable = calculateInvoiceEligibility(pod);
    if (!order || !customer?.isInstitutional || customer.paymentTerms === 'Prepaid / M-Pesa' || !billable.eligible) return [];
    return [{ pod, order, amount: billable.billableTotalKes }];
  });
  const totalBilled = invoices.reduce((sum, invoice) => sum + invoice.amountKes, 0);
  const totalOutstanding = invoices.reduce((sum, invoice) => sum + invoice.balanceKes, 0);
  const overdue = invoices.filter((invoice) => invoice.status === 'Overdue');
  const overdueBalance = overdue.reduce((sum, invoice) => sum + invoice.balanceKes, 0);

  async function issue(orderId: string, podId: string) {
    if (pendingIssueId) return;
    setPendingIssueId(podId);
    try {
      const result = await generateDraftInvoice(orderId, podId);
      setFeedback({ msg: result.message, type: result.ok ? 'success' : 'error' });
    } finally {
      setPendingIssueId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Customer invoices" description="Issue invoices for verified receipts and track customer balances."
        actions={can('finance.record_payment') && can('finance.allocate_payment') ? <Link href="/payments" className="ui-button ui-button-primary">Record payment</Link> : undefined} />
      <FeedbackBanner message={feedback?.msg ?? null} type={feedback?.type} onDismiss={() => setFeedback(null)} />

      <div className="grid gap-3 sm:grid-cols-3">
        <KPI label="Total invoiced" value={money(totalBilled)} sublabel={`${invoices.length} invoice records`} tone="positive" />
        <KPI label="Open balance" value={money(totalOutstanding)} sublabel="Outstanding customer receivables" tone="neutral" />
        <KPI label="Overdue balance" value={money(overdueBalance)} sublabel={`${overdue.length} overdue invoices`} tone={overdue.length ? 'warning' : 'neutral'} />
      </div>

      {readyToInvoice.length > 0 && (
        <section className="space-y-3" id="ready-to-invoice">
          <h2 className="ui-section-title">Verified receipts ready to invoice</h2>
          <ul className="space-y-2">
            {readyToInvoice.map(({ pod, order, amount }) => (
              <li key={pod.id}>
                <Card padding="p-4" className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">{order.customerName}</p>
                    <p className="ui-meta">{order.orderNumber} · {pod.id}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <strong className="text-sm tabular-nums">{money(amount)}</strong>
                    {can('finance.record_payment') && <button type="button" className="ui-button ui-button-primary ui-button-compact" disabled={pendingIssueId !== null}
                      onClick={() => issue(order.id, pod.id)}>{pendingIssueId === pod.id ? 'Issuing…' : 'Issue invoice'}</button>}
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="ui-section-title">Issued invoices</h2>
        <ul className="space-y-2">
          {invoices.map((invoice) => (
            <li key={invoice.id} id={`invoice-${invoice.invoiceNumber}`} className="scroll-mt-24">
              <Card padding="p-4" className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center">
                <div className="space-y-1">
                  <p className="text-sm font-semibold">{invoice.customerName}</p>
                  <p className="ui-meta">{invoice.invoiceNumber} · {invoice.orderNumber}</p>
                </div>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div><dt className="ui-meta">Due</dt><dd>{invoice.dueDate}</dd></div>
                  <div><dt className="ui-meta">Balance</dt><dd className="font-semibold tabular-nums">{money(invoice.balanceKes)}</dd></div>
                </dl>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={invoice.status} />
                  <button type="button" className="ui-button ui-button-secondary ui-button-compact" onClick={() => setSelectedId(invoice.id)}>View invoice</button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
        {invoices.length === 0 && <p className="text-sm text-[var(--text-secondary)]">No invoices have been issued.</p>}
      </section>

      <Modal open={Boolean(selected)} onClose={() => setSelectedId(null)} size="xl"
        title={selected?.invoiceNumber ?? 'Invoice'} subtitle={selected?.customerName}>
        {selected && (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap items-center gap-2"><StatusBadge status={selected.status} /><span>{selected.orderNumber}</span></div>
            <dl className="ui-surface grid grid-cols-2 gap-3 bg-[var(--bg-subtle)] p-4 sm:grid-cols-4">
              <div><dt className="ui-meta">Issued</dt><dd>{selected.issueDate}</dd></div>
              <div><dt className="ui-meta">Due</dt><dd>{selected.dueDate}</dd></div>
              <div><dt className="ui-meta">Terms</dt><dd>{selected.paymentTerms || 'Unrecorded'}</dd></div>
              {selectedCustomer?.kraPin && <div><dt className="ui-meta">Customer KRA PIN</dt><dd>{selectedCustomer.kraPin}</dd></div>}
            </dl>
            {selected.podRef && <p>Proof of delivery <Link href={`/fulfillment?receipt=${selected.podRef}`} className="ui-link underline">{selected.podRef}</Link></p>}
            {selected.lineItems?.length ? (
              <ul className="space-y-2">
                {selected.lineItems.map((line, index) => (
                  <li key={line.id ?? index} className="flex flex-wrap justify-between gap-2 rounded-lg border border-[var(--border-subtle)] p-3">
                    <div>
                      <p className="font-semibold">{line.productName}</p>
                      <p className="text-[var(--text-secondary)]">{line.quantity} {line.unit} · {money(line.unitPriceKes)} per unit</p>
                    </div>
                    <p className="font-semibold tabular-nums">{money(line.lineTotalKes)}</p>
                  </li>
                ))}
              </ul>
            ) : <p className="text-[var(--text-secondary)]">Billed quantities are unavailable for this invoice.</p>}
            <dl className="ui-surface space-y-2 bg-[var(--bg-subtle)] p-4">
              <div className="flex justify-between"><dt>Invoiced total</dt><dd className="tabular-nums">{money(selected.amountKes)}</dd></div>
              <div className="flex justify-between"><dt>Paid</dt><dd className="tabular-nums">{money(selected.paidAmountKes)}</dd></div>
              <div className="flex justify-between border-t border-[var(--border-subtle)] pt-2 font-semibold"><dt>Balance due</dt><dd className="tabular-nums">{money(selected.balanceKes)}</dd></div>
            </dl>
            {can('finance.record_payment') && can('finance.allocate_payment') && selected.balanceKes > 0 &&
              <Link href={`/payments?invoice=${selected.invoiceNumber}`} className="ui-button ui-button-primary">Allocate payment</Link>}
          </div>
        )}
      </Modal>
    </div>
  );
}

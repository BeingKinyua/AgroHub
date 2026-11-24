'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Plus } from 'lucide-react';
import { useBos } from '@/lib/services/bos-context';
import {
  Card,
  FeedbackBanner,
  KPI,
  Modal,
  PageHeader,
  StatusBadge,
} from '@/components/ui/primitives';
import { PaymentRecord } from '@/types/domain/bos';

function PaymentsContent({ invoiceNumber }: { invoiceNumber: string }) {
  const {
    payments,
    invoices,
    can,
    recordPayment,
    reconcilePayment,
  } = useBos();

  const canAllocate = can('finance.record_payment') && can('finance.allocate_payment');
  const [createOpen, setCreateOpen] = useState(Boolean(invoiceNumber && canAllocate));
  const [method, setMethod] =
    useState<PaymentRecord['method']>('M-Pesa Paybill');
  const [referenceCode, setReferenceCode] = useState('');
  const [amountKes, setAmountKes] = useState('');
  const [allocatedToDoc, setAllocatedToDoc] = useState(invoiceNumber);
  const [submitting, setSubmitting] = useState(false);
  const [allocationError, setAllocationError] = useState('');
  const openInvoices = invoices.filter((invoice) => invoice.balanceKes > 0);
  const selectedInvoice = openInvoices.find((invoice) => invoice.invoiceNumber === allocatedToDoc);
  const [feedback, setFeedback] = useState<{
    msg: string;
    type: 'success' | 'error';
  } | null>(null);

  const handleRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice || submitting) return;
    setSubmitting(true);
    setAllocationError('');
    try {
      const res = await recordPayment({
        direction: 'Inbound (Customer AR)', counterpartyName: selectedInvoice.customerName,
        method, referenceCode, amountKes: Number(amountKes), allocatedToDoc,
      });
      if (res.ok) {
        setFeedback({ msg: res.message, type: 'success' });
        setReferenceCode('');
        setAmountKes('');
        setCreateOpen(false);
      } else setAllocationError(res.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Payments and allocations"
        description="Allocate customer receipts to invoices and reconcile recorded transactions."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {can('suppliers.view') && <Link href="/suppliers" className="ui-button ui-button-secondary">Supplier accounts</Link>}
            {canAllocate && (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="ui-button ui-button-primary"
            >
              <Plus className="size-4" aria-hidden="true" />
              <span>Record customer payment</span>
            </button>
            )}
          </div>
        }
      />

      <FeedbackBanner
        message={feedback?.msg || null}
        type={feedback?.type}
        onDismiss={() => setFeedback(null)}
      />

      <div className="bento-metrics mb-6">
        <KPI
          label="Inbound Customer Receipts"
          value={`KES ${payments
            .filter((p) => p.direction === 'Inbound (Customer AR)')
            .reduce((s, p) => s + p.amountKes, 0)
            .toLocaleString()}`}
          sublabel="Allocated to commercial invoices"
          tone="positive"
        />
        <KPI
          label="Outbound Cooperative Payouts"
          value={`KES ${payments
            .filter((p) => p.direction === 'Outbound (Supplier AP)')
            .reduce((s, p) => s + p.amountKes, 0)
            .toLocaleString()}`}
          sublabel="Allocated to supplier POs"
          tone="neutral"
        />
        <KPI
          label="Pending Statement Reconciliation"
          value={`${payments.filter((p) => !p.reconciled).length} Entry`}
          sublabel="Verify against M-Pesa / KCB bank feed"
          tone="warning"
        />
      </div>

      <Card padding="p-0" className="overflow-hidden">
        <div className="overflow-x-auto" role="region" aria-label="Recorded payments" tabIndex={0}>
          <table className="ui-table text-left">
            <thead>
              <tr>
                <th scope="col" className="px-4 py-3">Transaction Reference</th>
                <th scope="col" className="px-4 py-3">Direction & Method</th>
                <th scope="col" className="px-4 py-3">Counterparty</th>
                <th scope="col" className="px-4 py-3">Allocated Document</th>
                <th scope="col" className="px-4 py-3 text-right">Amount (KES)</th>
                <th scope="col" className="px-4 py-3">Reconciliation</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="py-3.5 px-4 font-mono-tabular font-semibold text-[var(--text-primary)]">
                    {p.referenceCode}
                    <div className="ui-meta font-sans font-normal">
                      {p.date} · By {p.recordedBy}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div>{p.direction}</div>
                    <div className="ui-meta">
                      {p.method}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-medium">
                    {p.counterpartyName}
                  </td>
                  <td className="px-4 py-3.5 font-mono-tabular font-semibold text-[var(--brand-accent)]">
                    {p.allocatedToDoc}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono-tabular font-semibold">
                    {p.amountKes.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4">
                    {p.reconciled ? (
                      <StatusBadge status="Approved" />
                    ) : can('finance.reconcile') ? (
                      <button
                        type="button"
                        onClick={async () => {
                          const res = await reconcilePayment(p.id);
                          setFeedback({
                            msg: res.message,
                            type: res.ok ? 'success' : 'error',
                          });
                        }}
                        className="ui-button ui-button-secondary ui-button-compact"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Reconcile</span>
                      </button>
                    ) : (
                      <StatusBadge status="Pending" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={createOpen && canAllocate} onClose={() => setCreateOpen(false)} title="Record customer payment">
        <form onSubmit={handleRecord} className="space-y-4">
          <label className="ui-label block space-y-1">
            <span>Open invoice</span>
            <select required className="ui-field w-full" value={selectedInvoice?.invoiceNumber ?? ''}
              onChange={(event) => { setAllocatedToDoc(event.target.value); setAllocationError(''); }}>
              <option value="">Select an invoice</option>
              {openInvoices.map((invoice) => (
                <option key={invoice.id} value={invoice.invoiceNumber}>{invoice.invoiceNumber} · {invoice.customerName}</option>
              ))}
            </select>
          </label>
          {selectedInvoice && <p className="text-sm text-[var(--text-secondary)]">Available balance for allocation · KES {selectedInvoice.balanceKes.toLocaleString('en-KE')}</p>}
          <label className="ui-label block space-y-1">
            <span>Payment channel</span>
            <select className="ui-field w-full" value={method} onChange={(event) => setMethod(event.target.value as PaymentRecord['method'])}>
              <option value="M-Pesa Paybill">M-Pesa Paybill</option>
              <option value="Bank EFT / RTGS">Bank EFT / RTGS</option>
              <option value="Corporate Cheque">Corporate Cheque</option>
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="ui-label block space-y-1">
              <span>Transaction reference</span>
              <input required className="ui-field w-full" value={referenceCode} onChange={(event) => setReferenceCode(event.target.value)} />
            </label>
            <label className="ui-label block space-y-1">
              <span>Amount (KES)</span>
              <input required type="number" inputMode="decimal" min="0.01" max={selectedInvoice?.balanceKes} step="0.01"
                className="ui-field w-full" value={amountKes} onChange={(event) => setAmountKes(event.target.value)} />
            </label>
          </div>
          {allocationError && <p role="alert" className="text-sm text-[var(--status-danger-fg)]">{allocationError}</p>}
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => setCreateOpen(false)} disabled={submitting} className="ui-button ui-button-secondary">Cancel</button>
            <button type="submit" disabled={submitting || !selectedInvoice} className="ui-button ui-button-primary">{submitting ? 'Saving…' : 'Allocate payment'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function PaymentsRoute() {
  const invoiceNumber = useSearchParams().get('invoice') ?? '';
  return <PaymentsContent key={invoiceNumber} invoiceNumber={invoiceNumber} />;
}

export default function PaymentsPage() {
  return <Suspense fallback={<p className="p-6 text-sm text-[var(--text-secondary)]">Loading payments…</p>}><PaymentsRoute /></Suspense>;
}

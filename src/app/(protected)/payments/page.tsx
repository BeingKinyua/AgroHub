'use client';

import React, { useState } from 'react';
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

export default function PaymentsPage() {
  const {
    payments,
    invoices,
    customers,
    suppliers,
    can,
    recordPayment,
    reconcilePayment,
  } = useBos();

  const [createOpen, setCreateOpen] = useState(false);
  const [direction, setDirection] = useState<PaymentRecord['direction']>(
    'Inbound (Customer AR)'
  );
  const [counterpartyName, setCounterpartyName] = useState(
    customers[0]?.name || ''
  );
  const [method, setMethod] =
    useState<PaymentRecord['method']>('M-Pesa Paybill');
  const [referenceCode, setReferenceCode] = useState('QKA41M98LP');
  const [amountKes, setAmountKes] = useState(168900);
  const [allocatedToDoc, setAllocatedToDoc] = useState(
    invoices[0]?.invoiceNumber || 'INV-2026-9041'
  );
  const [feedback, setFeedback] = useState<{
    msg: string;
    type: 'success' | 'error';
  } | null>(null);

  const handleRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await recordPayment({
      direction,
      counterpartyName,
      method,
      referenceCode,
      amountKes: Number(amountKes),
      allocatedToDoc,
    });
    setFeedback({ msg: res.message, type: res.ok ? 'success' : 'error' });
    if (res.ok) setCreateOpen(false);
  };

  return (
    <div>
      <PageHeader
        kicker="TREASURY, M-PESA PAYBILL & BANK SETTLEMENTS"
        title="Payments & Invoice Allocations"
        description="Record inbound customer receipts (M-Pesa Paybill 542900, RTGS, EFT) and outbound cooperative supplier payouts with direct document allocation."
        actions={
          can('finance.record_payment') && (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="h-10 px-4 rounded-xl bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-medium inline-flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Record Payment</span>
            </button>
          )
        }
      />

      <FeedbackBanner
        message={feedback?.msg || null}
        type={feedback?.type}
        onDismiss={() => setFeedback(null)}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
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
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]/50 text-[11px] font-semibold text-[var(--text-secondary)]">
                <th className="py-3 px-4">Transaction Reference</th>
                <th className="py-3 px-4">Direction & Method</th>
                <th className="py-3 px-4">Counterparty</th>
                <th className="py-3 px-4">Allocated Document</th>
                <th className="py-3 px-4 text-right">Amount (KES)</th>
                <th className="py-3 px-4">Reconciliation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)] text-xs">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-[var(--bg-canvas)]/60">
                  <td className="py-3.5 px-4 font-mono-tabular font-semibold text-[var(--text-primary)]">
                    {p.referenceCode}
                    <div className="text-[11px] font-normal text-[var(--text-secondary)]">
                      {p.date} · By {p.recordedBy}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div>{p.direction}</div>
                    <div className="text-[11px] text-[var(--text-secondary)]">
                      {p.method}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-medium">
                    {p.counterpartyName}
                  </td>
                  <td className="py-3.5 px-4 font-mono-tabular text-[#1F6A37] dark:text-[#4EB462] font-semibold">
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
                        className="px-3 py-1 rounded-lg bg-[#1F6A37] text-white text-xs font-medium inline-flex items-center gap-1 cursor-pointer"
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

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Record & Allocate Payment (KES)"
        subtitle="Allocates settlement directly to an open Customer Invoice or Supplier Purchase Order."
      >
        <form onSubmit={handleRecord} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1">
                Settlement Direction
              </label>
              <select
                value={direction}
                onChange={(e) => {
                  const dir = e.target.value as PaymentRecord['direction'];
                  setDirection(dir);
                  setCounterpartyName(
                    dir === 'Inbound (Customer AR)'
                      ? customers[0]?.name || ''
                      : suppliers[0]?.name || ''
                  );
                }}
                className="w-full h-10 px-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs"
              >
                <option value="Inbound (Customer AR)">
                  Inbound (Customer AR)
                </option>
                <option value="Outbound (Supplier AP)">
                  Outbound (Supplier AP)
                </option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                Payment Channel
              </label>
              <select
                value={method}
                onChange={(e) =>
                  setMethod(e.target.value as PaymentRecord['method'])
                }
                className="w-full h-10 px-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs"
              >
                <option value="M-Pesa Paybill">M-Pesa Paybill</option>
                <option value="Bank EFT / RTGS">Bank EFT / RTGS</option>
                <option value="Corporate Cheque">Corporate Cheque</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">
              Counterparty (Customer or Supplier)
            </label>
            <input
              type="text"
              required
              value={counterpartyName}
              onChange={(e) => setCounterpartyName(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">
                Reference Code
              </label>
              <input
                type="text"
                required
                value={referenceCode}
                onChange={(e) => setReferenceCode(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs font-mono-tabular"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                Amount (KES)
              </label>
              <input
                type="number"
                required
                value={amountKes}
                onChange={(e) => setAmountKes(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs font-mono-tabular"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                Allocate to Document #
              </label>
              <input
                type="text"
                required
                value={allocatedToDoc}
                onChange={(e) => setAllocatedToDoc(e.target.value)}
                placeholder="e.g., INV-2026-9041"
                className="w-full h-10 px-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs font-mono-tabular"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="px-4 py-2 rounded-xl border border-[var(--border-subtle)] text-xs font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-[#1F6A37] text-white text-xs font-medium cursor-pointer"
            >
              Post & Allocate Payment
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

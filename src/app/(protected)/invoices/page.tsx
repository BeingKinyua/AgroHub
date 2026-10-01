'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Eye, Receipt } from 'lucide-react';
import { useBos } from '@/lib/services/bos-context';
import {
  Card,
  KPI,
  Modal,
  PageHeader,
  StatusBadge,
} from '@/components/ui/primitives';
import { InvoiceRecord } from '@/types/domain/bos';

export default function InvoicesPage() {
  const { invoices } = useBos();
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRecord | null>(
    null
  );

  const totalBilled = invoices.reduce((s, i) => s + i.amountKes, 0);
  const totalOutstanding = invoices.reduce((s, i) => s + i.balanceKes, 0);

  return (
    <div>
      <PageHeader
        kicker="COMMERCIAL BILLING & RECEIVABLES"
        title="Customer Invoices (KES)"
        description="Track commercial tax invoices linked to institutional orders, Net 15/30/45 due dates, payment allocations, and aging buckets."
        actions={
          <Link
            href="/payments"
            className="h-10 px-4 rounded-xl bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-medium inline-flex items-center gap-2"
          >
            <span>Record / Allocate Payment</span>
          </Link>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <KPI
          label="Total Invoiced (Cycle)"
          value={`KES ${totalBilled.toLocaleString()}`}
          sublabel={`${invoices.length} commercial tax invoices`}
          tone="positive"
        />
        <KPI
          label="Open Invoice Balance"
          value={`KES ${totalOutstanding.toLocaleString()}`}
          sublabel="Awaiting M-Pesa / RTGS settlement"
          tone="neutral"
        />
        <KPI
          label="Overdue Invoices"
          value={`${invoices.filter((i) => i.status === 'Overdue').length}`}
          sublabel="INV-2026-8892 (KES 295,000 balance)"
          tone="warning"
        />
      </div>

      <Card padding="p-0" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]/50 text-[11px] font-semibold text-[var(--text-secondary)]">
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Order Ref</th>
                <th className="py-3 px-4">Institution / Customer</th>
                <th className="py-3 px-4">Issue & Due Date</th>
                <th className="py-3 px-4 text-right">Billed (KES)</th>
                <th className="py-3 px-4 text-right">Balance (KES)</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)] text-xs">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-[var(--bg-canvas)]/60">
                  <td className="py-3.5 px-4 font-mono-tabular font-semibold text-[#1F6A37] dark:text-[#4EB462]">
                    {inv.invoiceNumber}
                  </td>
                  <td className="py-3.5 px-4 font-mono-tabular text-[var(--text-secondary)]">
                    {inv.orderNumber}
                  </td>
                  <td className="py-3.5 px-4 font-semibold">
                    {inv.customerName}
                  </td>
                  <td className="py-3.5 px-4 font-mono-tabular text-[var(--text-secondary)]">
                    {inv.issueDate} → {inv.dueDate}
                    <div className="text-[10px]">{inv.agingBucket}</div>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono-tabular">
                    {inv.amountKes.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono-tabular font-semibold">
                    {inv.balanceKes.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={inv.status} />
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedInvoice(inv)}
                      className="px-2.5 py-1.5 rounded-lg border border-[var(--border-subtle)] text-xs font-medium inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={Boolean(selectedInvoice)}
        onClose={() => setSelectedInvoice(null)}
        title={`Commercial Tax Invoice · ${selectedInvoice?.invoiceNumber}`}
        subtitle={`Issued to ${selectedInvoice?.customerName}`}
      >
        {selectedInvoice && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] space-y-2">
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">
                  Supplier Entity:
                </span>
                <span className="font-semibold">
                  Agro-Deliveries Kenya Ltd (KRA PIN: P051928471K)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">
                  Linked Order:
                </span>
                <span className="font-mono-tabular font-semibold">
                  {selectedInvoice.orderNumber}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">
                  Total Invoice Amount:
                </span>
                <span className="font-mono-tabular font-semibold">
                  KES {selectedInvoice.amountKes.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">
                  Paid to Date:
                </span>
                <span className="font-mono-tabular text-[#1F6A37] dark:text-[#4EB462]">
                  KES {selectedInvoice.paidAmountKes.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[var(--border-subtle)]">
                <span className="font-semibold">Balance Due:</span>
                <span className="font-mono-tabular text-sm font-semibold">
                  KES {selectedInvoice.balanceKes.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

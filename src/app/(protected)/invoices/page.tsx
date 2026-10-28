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
  const { invoices, orders, customers } = useBos();
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
            className="h-10 px-4 rounded-full bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-medium inline-flex items-center gap-2"
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
                      className="px-3 py-1.5 rounded-full border border-[var(--border-subtle)] text-xs font-medium inline-flex items-center gap-1 cursor-pointer"
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
        size="lg"
        title={`Commercial Tax Invoice · ${selectedInvoice?.invoiceNumber}`}
        subtitle={`KRA eTIMS compliant invoice issued to ${selectedInvoice?.customerName}`}
      >
        {selectedInvoice && (() => {
          const linkedOrder = orders.find((o) => o.orderNumber === selectedInvoice.orderNumber);
          const customer = customers.find(
            (c) => c.id === selectedInvoice.customerId || c.name === selectedInvoice.customerName
          );

          return (
            <div className="space-y-4 text-xs">
              {/* Header Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)]">
                <div>
                  <div className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider mb-1 font-semibold">
                    Seller / Distribution Entity
                  </div>
                  <div className="font-semibold text-[var(--text-primary)]">
                    Agro-Deliveries Kenya Limited
                  </div>
                  <div className="text-[11px] text-[var(--text-secondary)]">
                    KRA PIN: <span className="font-mono-tabular font-medium">P051928471K</span>
                  </div>
                  <div className="text-[10px] text-[var(--text-secondary)]">
                    eTIMS Serial: <span className="font-mono-tabular">KRA-ETIMS-2026-9041</span>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider mb-1 font-semibold">
                    Buyer / Institutional Client
                  </div>
                  <div className="font-semibold text-[var(--text-primary)]">
                    {selectedInvoice.customerName}
                  </div>
                  <div className="text-[11px] text-[var(--text-secondary)]">
                    KRA PIN: <span className="font-mono-tabular font-medium">{customer?.kraPin || 'A009182341M'}</span>
                  </div>
                  <div className="text-[10px] text-[var(--text-secondary)]">
                    Payment Terms: {customer?.paymentTerms || 'Net 30 Days'} · Due: {selectedInvoice.dueDate}
                  </div>
                </div>
              </div>

              {/* Linked Order & Dates */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[11px]">
                <div>
                  <span className="text-[var(--text-secondary)]">Linked Order: </span>
                  <span className="font-mono-tabular font-semibold text-[#1F6A37] dark:text-[#4EB462]">
                    {selectedInvoice.orderNumber}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--text-secondary)]">Issue Date: </span>
                  <span className="font-mono-tabular font-medium">{selectedInvoice.issueDate}</span>
                </div>
                <div>
                  <span className="text-[var(--text-secondary)]">Aging: </span>
                  <span className="font-medium text-[var(--text-primary)]">{selectedInvoice.agingBucket}</span>
                </div>
                <div>
                  <StatusBadge status={selectedInvoice.status} />
                </div>
              </div>

              {/* Itemized Verified Lines */}
              {linkedOrder && linkedOrder.items && linkedOrder.items.length > 0 && (
                <div className="border border-[var(--border-subtle)] rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[var(--bg-canvas)] border-b border-[var(--border-subtle)] text-[10px] font-semibold text-[var(--text-secondary)]">
                        <th className="py-2 px-3">Product Description</th>
                        <th className="py-2 px-3 text-right">Delivered Qty</th>
                        <th className="py-2 px-3 text-right">Unit Price</th>
                        <th className="py-2 px-3 text-right">Total (KES)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)]">
                      {linkedOrder.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-[var(--bg-canvas)]/50">
                          <td className="py-2 px-3 font-medium text-[var(--text-primary)]">
                            {item.productName} ({item.sku})
                          </td>
                          <td className="py-2 px-3 text-right font-mono-tabular">
                            {item.quantity} {item.unit}
                          </td>
                          <td className="py-2 px-3 text-right font-mono-tabular">
                            KES {item.unitPriceKes.toLocaleString()}
                          </td>
                          <td className="py-2 px-3 text-right font-mono-tabular font-semibold">
                            KES {item.lineTotalKes.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Financial Balances */}
              <div className="p-3.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Gross Invoiced Amount:</span>
                  <span className="font-mono-tabular font-semibold">
                    KES {selectedInvoice.amountKes.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Paid to Date (Settled):</span>
                  <span className="font-mono-tabular text-[#1F6A37] dark:text-[#4EB462]">
                    KES {selectedInvoice.paidAmountKes.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-[var(--border-subtle)] text-sm">
                  <span className="font-bold text-[var(--text-primary)]">Net Balance Due:</span>
                  <span className="font-mono-tabular font-bold text-base text-[var(--text-primary)]">
                    KES {selectedInvoice.balanceKes.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedInvoice(null)}
                  className="h-9 px-4 rounded-lg border border-[var(--border-subtle)] text-xs font-medium hover:bg-[var(--bg-canvas)] cursor-pointer"
                >
                  Close
                </button>
                <Link
                  href={`/payments?invoice=${selectedInvoice.invoiceNumber}`}
                  className="h-9 px-4 rounded-lg bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Allocate Payment</span>
                </Link>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}

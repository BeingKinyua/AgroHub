'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, Plus } from 'lucide-react';
import { useBos } from '@/lib/services/bos-context';
import { Card, EmptyState, KPI, LoadingSkeleton, PageHeader, StatusBadge } from '@/components/ui/primitives';
import { getNairobiDate, getOpenPayables, offsetBusinessDate } from '@/lib/services/workspace-metrics';

const kes = (amount: number) => 'KES ' + amount.toLocaleString('en-KE', { maximumFractionDigits: 2 });
const tabs = [
  { id: 'aging', label: 'Customer receivables', href: '/finance' },
  { id: 'payables', label: 'Supplier payables', href: '/finance?tab=payables' },
  { id: 'payments', label: 'Payment activity', href: '/finance?tab=payments' },
] as const;

function FinanceContent() {
  const searchParams = useSearchParams();
  const { invoices, payments, supplierPayments, supplierPayables, can } = useBos();
  const canRecordReceipts = can('finance.record_payment') && can('finance.allocate_payment');
  const today = getNairobiDate();
  const openInvoices = invoices.filter((invoice) => invoice.balanceKes > 0)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const overdueInvoices = openInvoices.filter((invoice) => invoice.dueDate && invoice.dueDate < today);
  const openPayables = getOpenPayables(supplierPayables);
  const payableCutoff = offsetBusinessDate(today, 7);
  const duePayables = getOpenPayables(supplierPayables, payableCutoff);
  const requestedTab = searchParams.get('tab');
  const activeTab = requestedTab === 'cashflow' ? 'payments' : tabs.find((tab) => tab.id === requestedTab)?.id ?? 'aging';
  const receivables = searchParams.get('status') === 'overdue' ? overdueInvoices : openInvoices;
  const knownPayoutRefs = new Set(supplierPayments.map((payment) => payment.referenceNumber.trim().toLowerCase()));
  const paymentActivity = [
    ...payments.filter((payment) =>
      payment.direction !== 'Outbound (Supplier AP)' || !knownPayoutRefs.has(payment.referenceCode.trim().toLowerCase())
    ).map((payment) => ({
      id: payment.id,
      counterparty: payment.counterpartyName,
      reference: payment.referenceCode,
      allocation: payment.allocatedToDoc,
      date: payment.date,
      amount: payment.amountKes,
      inbound: payment.direction === 'Inbound (Customer AR)',
    })),
    ...supplierPayments.map((payment) => ({
      id: 'supplier-' + payment.id,
      counterparty: payment.supplierName,
      reference: payment.referenceNumber,
      allocation: payment.payableNumber ?? payment.supplierPayableId ?? '',
      date: payment.paymentDate,
      amount: payment.amountKes,
      inbound: false,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Accounts"
        description="Review customer balances, supplier obligations, and recorded payments."
        actions={canRecordReceipts && (
          <Link href="/payments" className="ui-button ui-button-primary">
            <Plus className="size-4" aria-hidden="true" /> Record receipt
          </Link>
        )}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KPI label="Customer receivables" value={kes(openInvoices.reduce((sum, invoice) => sum + invoice.balanceKes, 0))} />
        <KPI label="Overdue receivables" value={kes(overdueInvoices.reduce((sum, invoice) => sum + invoice.balanceKes, 0))} />
        <KPI label="Supplier payables" value={kes(openPayables.reduce((sum, payable) => sum + payable.balanceKes, 0))} />
        <KPI label="Supplier payments due" value={kes(duePayables.reduce((sum, payable) => sum + payable.balanceKes, 0))} sublabel="Overdue and due in the next 7 days" />
      </div>

      <nav aria-label="Accounts" className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Link key={tab.id} href={tab.href} aria-current={activeTab === tab.id ? 'page' : undefined}
            className="ui-tab"
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {activeTab === 'payables' ? (
        <Card padding="p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="ui-section-title">Open supplier payables</h2>
            {can('suppliers.view') && (
              <Link href="/suppliers?tab=payables" className="ui-button ui-button-secondary">
                Supplier accounts <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            )}
          </div>
          {!openPayables.length ? (
            <EmptyState title="No open supplier payables" description="Supplier obligations appear here after a qualifying purchase receipt." />
          ) : (
            <ul className="mt-2 divide-y divide-[var(--border-subtle)]">
              {openPayables.map((payable) => (
                <li key={payable.id} className="grid gap-1 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <p className="text-sm font-semibold">{payable.supplierName}</p>
                    <p className="ui-meta mt-0.5">{[payable.poNumber, payable.invoiceRef, payable.dueDate && 'Due ' + payable.dueDate].filter(Boolean).join(' · ')}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm sm:justify-end">
                    <strong className="font-mono-tabular">{kes(payable.balanceKes)}</strong>
                    <StatusBadge status={payable.dueDate && payable.dueDate < today ? 'Overdue' : payable.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : activeTab === 'payments' ? (
        <Card padding="p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="ui-section-title">Recorded payments</h2>
            <Link href="/payments" className="ui-button ui-button-secondary">
              Customer payment register <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
          {!paymentActivity.length ? (
            <EmptyState title="No recorded payments" description="Customer receipts and supplier payouts appear here once recorded." />
          ) : (
            <ul className="mt-2 divide-y divide-[var(--border-subtle)]">
              {paymentActivity.map((payment) => (
                <li key={payment.id} className="grid gap-1 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{payment.counterparty}</p>
                    <p className="ui-meta mt-0.5 wrap-break-word">
                      {[payment.date, payment.reference, payment.allocation].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm sm:justify-end">
                    <span>{payment.inbound ? 'Received' : 'Paid out'}</span>
                    <strong className="font-mono-tabular">{kes(payment.amount)}</strong>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : (
        <Card padding="p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="ui-section-title">Open customer invoices</h2>
            <div className="flex flex-wrap items-center gap-2">
              <Link href={searchParams.get('status') === 'overdue' ? '/finance' : '/finance?status=overdue'} className="ui-button ui-button-ghost">
                {searchParams.get('status') === 'overdue' ? 'Show all open' : 'Show overdue'}
              </Link>
              <Link href="/invoices" className="ui-button ui-button-secondary">
                All invoices <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </div>
          </div>
          {!receivables.length ? (
            <EmptyState title="No invoices match this view" description="Open invoices appear here when a customer has an outstanding balance." />
          ) : (
            <ul className="mt-2 divide-y divide-[var(--border-subtle)]">
              {receivables.map((invoice) => (
                <li key={invoice.id} className="grid gap-1 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <p className="text-sm font-semibold">{invoice.customerName}</p>
                    <p className="ui-meta mt-0.5">{invoice.invoiceNumber} · Due {invoice.dueDate}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm sm:justify-end">
                    <strong className="font-mono-tabular">{kes(invoice.balanceKes)}</strong>
                    <StatusBadge status={invoice.dueDate && invoice.dueDate < today ? 'Overdue' : invoice.status} />
                    {canRecordReceipts && (
                      <Link href={'/payments?invoice=' + encodeURIComponent(invoice.invoiceNumber)} className="ui-button ui-button-secondary ui-button-compact">
                        Record receipt
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}

export default function FinancePage() {
  return <Suspense fallback={<LoadingSkeleton />}><FinanceContent /></Suspense>;
}

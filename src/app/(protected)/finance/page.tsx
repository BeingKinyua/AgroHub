'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  Download,
  Filter,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { useBos } from '@/lib/services/bos-context';
import {
  Card,
  ChartCard,
  FeedbackBanner,
  KPI,
  Modal,
  PageHeader,
  StatusBadge,
  WorkQueue,
  WorkQueueItem,
} from '@/components/ui/primitives';

const AGING_DATA = [
  { bucket: 'Current (0-15d)', receivableKes: 1840000, payableKes: 607000 },
  { bucket: '16-30 Days', receivableKes: 1017700, payableKes: 1403500 },
  { bucket: '31-60 Days', receivableKes: 295000, payableKes: 0 },
  { bucket: '60+ Days', receivableKes: 0, payableKes: 0 },
];

function FinanceContent() {
  const searchParams = useSearchParams();
  const { customers, suppliers, payments, invoices, can } = useBos();

  const [activeTab, setActiveTab] = useState<'aging' | 'payables' | 'payments' | 'cashflow'>('aging');
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<string>('INV-2026-891');
  const [collectAmount, setCollectAmount] = useState<number>(295000);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Read search parameters for drill-down support (Section 14 & 25)
  useEffect(() => {
    const statusParam = searchParams.get('status');
    const tabParam = searchParams.get('tab');

    if (statusParam === 'overdue') {
      setActiveTab('aging');
    }

    if (tabParam === 'payables' || tabParam === 'payments' || tabParam === 'cashflow') {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Top Metrics (Section 25: Total Receivables, Overdue, Due This Week, Total Payables, Unallocated Payments)
  const totalAr = useMemo(
    () => customers.reduce((s, c) => s + c.outstandingBalanceKes, 0),
    [customers]
  );
  const overdueAr = useMemo(
    () => customers.reduce((s, c) => s + c.overdueBalanceKes, 0),
    [customers]
  );
  const dueThisWeekAp = 607000;
  const totalAp = useMemo(
    () => suppliers.reduce((s, v) => s + v.payableBalanceKes, 0),
    [suppliers]
  );
  const unallocatedCount = 1;
  const unallocatedAmount = 185000;

  // Primary Work Queue: Overdue Invoices Requiring Collection (Section 25)
  const collectionWorkQueueItems: WorkQueueItem[] = useMemo(() => {
    return customers
      .filter((c) => c.overdueBalanceKes > 0)
      .map((c) => ({
        id: `coll-${c.id}`,
        title: `${c.name} · Overdue Receivable`,
        subtitle: `${c.segment} · Terms: ${c.paymentTerms} (exceeded by 14d)`,
        tag: `KES ${c.overdueBalanceKes.toLocaleString()} overdue`,
        severity: 'critical' as const,
        actionLabel: 'Collect Payment',
        onAction: () => {
          setSelectedInvoice(`INV-${c.code}-001`);
          setCollectAmount(c.overdueBalanceKes);
          setPaymentModalOpen(true);
        },
        metadata: `Contact: ${c.procurementContact} (${c.phone})`,
      }));
  }, [customers]);

  const handleRecordCollection = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(`KES ${collectAmount.toLocaleString()} collection logged for ${selectedInvoice}. Ledger updated.`);
    setPaymentModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Page Header (Section 25 & 31) */}
      <PageHeader
        kicker="TREASURY, RECEIVABLES AGING & SETTLEMENTS"
        title="Treasury Aging & Exceptions"
        description="Resolve outstanding financial obligations: institutional receivables aging, cooperative payables schedules, M-Pesa reconciliation, and cash liquidity."
        actions={
          <button
            type="button"
            onClick={() => setPaymentModalOpen(true)}
            className="h-10 px-4 rounded-full bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-semibold inline-flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Record Payment / Receipt</span>
          </button>
        }
      />

      <FeedbackBanner
        message={feedback}
        type="success"
        onDismiss={() => setFeedback(null)}
      />

      {/* Top Decision Metrics (Section 25: Total Receivables, Overdue, Due This Week, Total Payables, Unallocated Payments) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KPI
          label="Total Receivables (AR)"
          value={`KES ${(totalAr / 1000000).toFixed(2)}M`}
          sublabel="Contracted institutional credit"
          tone="positive"
        />
        <KPI
          label="Overdue (>45 Days)"
          value={`KES ${(overdueAr / 1000).toFixed(0)}K`}
          sublabel="1 school account requires action"
          tone="danger"
        />
        <KPI
          label="AP Due This Week"
          value={`KES ${(dueThisWeekAp / 1000).toFixed(0)}K`}
          sublabel="Cooperative Friday payout run"
          tone="neutral"
        />
        <KPI
          label="Total Payables (AP)"
          value={`KES ${(totalAp / 1000000).toFixed(2)}M`}
          sublabel="Growers & grain millers"
          tone="neutral"
        />
        <KPI
          label="Unallocated M-Pesa"
          value={`${unallocatedCount} Receipt`}
          sublabel={`KES ${(unallocatedAmount / 1000).toFixed(0)}K unallocated`}
          tone="warning"
        />
      </div>

      {/* Primary Work Queue: Collections & Unallocated Payments (Section 25) */}
      {collectionWorkQueueItems.length > 0 && (
        <WorkQueue
          title="Priority Debt Collection & Exception Action Queue"
          subtitle="Accounts exceeding contracted payment terms requiring immediate bursar escalation"
          badgeCount={collectionWorkQueueItems.length}
          items={collectionWorkQueueItems}
        />
      )}

      {/* View Switcher Tabs (Section 25: Receivables Aging, Payables, Payments, Cash Movement) */}
      <div className="flex items-center gap-1 p-1 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)] w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('aging')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
            activeTab === 'aging'
              ? 'bg-[#1F6A37] text-white shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Receivables Aging (AR)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('payables')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
            activeTab === 'payables'
              ? 'bg-[#1F6A37] text-white shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Cooperative Payables (AP)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('payments')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
            activeTab === 'payments'
              ? 'bg-[#1F6A37] text-white shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          M-Pesa & EFT Settlements ({payments.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('cashflow')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
            activeTab === 'cashflow'
              ? 'bg-[#1F6A37] text-white shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Cash Liquidity Spread
        </button>
      </div>

      {/* Tab 1: Receivables Aging (Section 25) */}
      {activeTab === 'aging' && (
        <div className="space-y-6">
          <ChartCard
            title="Receivables (AR) vs. Payables (AP) Maturity Aging Profile (KES)"
            subtitle="Answering: Are overdue receipts putting upcoming cooperative payout obligations at risk?"
          >
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={AGING_DATA}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(61, 105, 74, 0.15)" />
                  <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: '#3D694A' }} />
                  <YAxis
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 11, fill: '#3D694A' }}
                  />
                  <Tooltip
                    formatter={(v: number) => `KES ${v.toLocaleString()}`}
                    contentStyle={{
                      borderRadius: '12px',
                      backgroundColor: '#08190C',
                      color: '#F4F6F3',
                      fontSize: '12px',
                    }}
                  />
                  <Bar
                    dataKey="receivableKes"
                    name="Institutional Receivables (AR)"
                    fill="#1F6A37"
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar
                    dataKey="payableKes"
                    name="Cooperative Payables (AP)"
                    fill="#4EB462"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <Card padding="p-0" className="overflow-hidden">
            <div className="p-4 border-b border-[var(--border-subtle)]">
              <h3 className="font-heading text-sm font-semibold text-[var(--text-primary)]">
                Institutional Accounts Aging Ledger
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Detailed customer balances with direct collection escalation actions
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]/50 text-[11px] font-semibold text-[var(--text-secondary)]">
                    <th className="py-3 px-4">Client / School</th>
                    <th className="py-3 px-4">Segment & Terms</th>
                    <th className="py-3 px-4 text-right">Total Outstanding</th>
                    <th className="py-3 px-4 text-right">Current (0-30d)</th>
                    <th className="py-3 px-4 text-right">Overdue (&gt;45d)</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)] text-xs">
                  {customers.map((c) => {
                    const isOverdue = c.overdueBalanceKes > 0;
                    return (
                      <tr key={c.id} className="hover:bg-[var(--bg-canvas)]/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-[var(--text-primary)]">{c.name}</div>
                          <div className="text-[11px] text-[var(--text-secondary)]">{c.code} · Contact: {c.procurementContact}</div>
                        </td>
                        <td className="py-3.5 px-4 text-[var(--text-secondary)]">
                          {c.segment} · {c.paymentTerms}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono-tabular font-semibold">
                          KES {c.outstandingBalanceKes.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono-tabular text-[var(--text-secondary)]">
                          KES {(c.outstandingBalanceKes - c.overdueBalanceKes).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono-tabular font-bold">
                          <span className={isOverdue ? 'text-red-600 dark:text-red-400' : 'text-[var(--text-secondary)]'}>
                            KES {c.overdueBalanceKes.toLocaleString()}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {isOverdue ? (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedInvoice(`INV-${c.code}-001`);
                                setCollectAmount(c.overdueBalanceKes);
                                setPaymentModalOpen(true);
                              }}
                              className="h-7 px-3 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <span>Collect</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          ) : (
                            <span className="text-[11px] text-[var(--text-secondary)]">Current</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 2: Cooperative Payables (AP) */}
      {activeTab === 'payables' && (
        <Card padding="p-0" className="overflow-hidden">
          <div className="p-4 border-b border-[var(--border-subtle)]">
            <h3 className="font-heading text-sm font-semibold text-[var(--text-primary)]">
              Supplier Payables Obligation Schedule
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Scheduled payouts for farm cooperatives and grain millers in Kenyan Shillings
            </p>
          </div>
          <div className="divide-y divide-[var(--border-subtle)]">
            {suppliers.map((sup) => (
              <div
                key={sup.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="font-semibold text-sm text-[var(--text-primary)]">
                    {sup.name}
                  </div>
                  <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                    Category: {sup.category} · Region: {sup.region} · Terms: <strong>{sup.paymentTerms}</strong>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="font-mono-tabular text-sm font-bold text-[#1F6A37] dark:text-[#4EB462]">
                      KES {sup.payableBalanceKes.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-[var(--text-secondary)]">Settlement Ready</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFeedback(`Scheduled Net payout release of KES ${sup.payableBalanceKes.toLocaleString()} to ${sup.name}.`);
                    }}
                    className="h-8 px-3 rounded-full bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-semibold cursor-pointer"
                  >
                    Release Payout
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Tab 3: Payments & M-Pesa Workbench */}
      {activeTab === 'payments' && (
        <Card padding="p-0" className="overflow-hidden">
          <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
            <div>
              <h3 className="font-heading text-sm font-semibold text-[var(--text-primary)]">
                M-Pesa B2B, RTGS & Cheque Settlement Stream
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Match incoming automated deposits against customer invoice ledger
              </p>
            </div>
            <span className="text-xs font-mono-tabular px-2.5 py-1 rounded-full bg-[#E5EFE6] dark:bg-[#142B1B] text-[#1F6A37] dark:text-[#4EB462] font-semibold">
              98% Matched
            </span>
          </div>
          <div className="divide-y divide-[var(--border-subtle)]">
            {/* Unallocated item */}
            <div className="p-4 bg-amber-500/[0.04] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono-tabular font-bold text-amber-700 dark:text-amber-400">
                    MPESA-B2B-994012A
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold text-[10px]">
                    Unallocated
                  </span>
                </div>
                <div className="text-[11px] text-[var(--text-secondary)] mt-1">
                  M-Pesa B2B Deposit via Paybill 400200 · Depositor: Alliance High School Accounts · Received 07:15 EAT
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono-tabular text-sm font-bold text-[var(--text-primary)]">
                  KES 185,000
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setFeedback('Receipt MPESA-B2B-994012A allocated to invoice #INV-2026-891.');
                  }}
                  className="h-8 px-3.5 rounded-full bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-semibold cursor-pointer"
                >
                  Allocate to Invoice
                </button>
              </div>
            </div>

            {payments.map((p) => (
              <div
                key={p.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono-tabular font-semibold text-[var(--text-primary)]">
                      {p.referenceCode}
                    </span>
                    <span className="text-[11px] text-[var(--text-secondary)]">({p.method})</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      p.reconciled
                        ? 'bg-[#E5EFE6] dark:bg-[#142B1B] text-[#1F6A37] dark:text-[#4EB462]'
                        : 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                    }`}>
                      {p.reconciled ? 'Reconciled' : 'Unallocated'}
                    </span>
                  </div>
                  <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                    {p.counterpartyName} · Linked Doc: {p.allocatedToDoc || 'Unallocated'} · {p.date}
                  </div>
                </div>
                <div className="font-mono-tabular text-sm font-bold text-[#1F6A37] dark:text-[#4EB462]">
                  KES {p.amountKes.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Tab 4: Cash Liquidity Spread */}
      {activeTab === 'cashflow' && (
        <Card padding="p-6" variant="raised">
          <div className="space-y-4">
            <h3 className="font-heading text-base font-semibold text-[var(--text-primary)]">
              Net Working Capital Spread & Cash Velocity
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Agro-Deliveries Kenya treasury model maintains a minimum 1.35x liquidity coverage ratio of institutional receivables over cooperative settlements.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)]">
                <div className="text-xs text-[var(--text-secondary)]">Total Customer Receivables</div>
                <div className="font-mono-tabular text-xl font-bold text-[#1F6A37] dark:text-[#4EB462] mt-1">
                  +KES {totalAr.toLocaleString()}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)]">
                <div className="text-xs text-[var(--text-secondary)]">Total Supplier Payables</div>
                <div className="font-mono-tabular text-xl font-bold text-amber-700 dark:text-amber-400 mt-1">
                  -KES {totalAp.toLocaleString()}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-[var(--bg-canvas)] border border-[#4EB462]/35">
                <div className="text-xs text-[var(--text-secondary)]">Net Treasury Spread</div>
                <div className="font-mono-tabular text-xl font-bold text-[var(--text-primary)] mt-1">
                  +KES {(totalAr - totalAp).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Collect / Reconcile Payment Modal */}
      <Modal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        title="Record Debt Collection / Payment"
        subtitle="Post cash settlement or M-Pesa receipt against open invoice"
      >
        <form onSubmit={handleRecordCollection} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1">Target Open Invoice</label>
            <input
              type="text"
              value={selectedInvoice}
              onChange={(e) => setSelectedInvoice(e.target.value)}
              className="w-full h-10 px-3 rounded-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs font-mono-tabular"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Settlement Amount (KES)</label>
            <input
              type="number"
              value={collectAmount}
              onChange={(e) => setCollectAmount(Number(e.target.value))}
              className="w-full h-10 px-3 rounded-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs font-mono-tabular"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Payment Method / Channel</label>
            <select className="w-full h-10 px-3 rounded-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs">
              <option value="M-Pesa B2B">M-Pesa B2B (Paybill 400200)</option>
              <option value="RTGS / Wire">RTGS / Bank Wire Transfer</option>
              <option value="Institutional Cheque">Institutional Bankers Cheque</option>
            </select>
          </div>

          <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setPaymentModalOpen(false)}
              className="h-10 px-4 rounded-full border border-[var(--border-subtle)] text-xs font-medium hover:bg-[var(--bg-canvas)] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-10 px-5 rounded-full bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-semibold cursor-pointer"
            >
              Post Collection
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default function FinancePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-[var(--text-secondary)]">Loading Finance Workbench...</div>}>
      <FinanceContent />
    </Suspense>
  );
}

'use client';

import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { useBos } from '@/lib/services/bos-context';
import {
  Card,
  ChartCard,
  KPI,
  PageHeader,
  StatusBadge,
} from '@/components/ui/primitives';

const AGING_DATA = [
  { bucket: 'Current (0-15d)', receivableKes: 1840000, payableKes: 607000 },
  { bucket: '16-30 Days', receivableKes: 1017700, payableKes: 1403500 },
  { bucket: '31-60 Days', receivableKes: 295000, payableKes: 0 },
  { bucket: '60+ Days', receivableKes: 0, payableKes: 0 },
];

export default function FinancePage() {
  const { customers, suppliers, payments } = useBos();

  const totalAr = customers.reduce((s, c) => s + c.outstandingBalanceKes, 0);
  const overdueAr = customers.reduce((s, c) => s + c.overdueBalanceKes, 0);
  const totalAp = suppliers.reduce((s, v) => s + v.payableBalanceKes, 0);
  const netWorkingPosition = totalAr - totalAp;

  return (
    <div>
      <PageHeader
        kicker="TREASURY, RECEIVABLES AGING & PAYABLES"
        title="Financial Control & Reconciliation (KES)"
        description="Unified treasury ledger comparing institutional Accounts Receivable (AR) against cooperative Accounts Payable (AP) and M-Pesa/RTGS reconciliation."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPI
          label="Accounts Receivable (AR)"
          value={`KES ${totalAr.toLocaleString()}`}
          sublabel={`Overdue: KES ${overdueAr.toLocaleString()}`}
          tone="positive"
        />
        <KPI
          label="Accounts Payable (AP)"
          value={`KES ${totalAp.toLocaleString()}`}
          sublabel="Farm cooperatives & grain millers"
          tone="neutral"
        />
        <KPI
          label="Net Working Capital Spread"
          value={`+KES ${netWorkingPosition.toLocaleString()}`}
          sublabel="AR minus AP obligations"
          tone="positive"
        />
        <KPI
          label="Reconciliation Rate"
          value={`${Math.round(
            (payments.filter((p) => p.reconciled).length / payments.length) *
              100
          )}%`}
          sublabel={`${payments.filter((p) => p.reconciled).length} of ${
            payments.length
          } settlements matched`}
          tone="positive"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <ChartCard
          title="Receivables (AR) vs. Payables (AP) Aging Profile (KES)"
          subtitle="Maturity distribution across 15, 30, and 60-day institutional credit terms"
          className="lg:col-span-7"
        >
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={AGING_DATA}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(61, 105, 74, 0.15)"
                />
                <XAxis
                  dataKey="bucket"
                  tick={{ fontSize: 11, fill: '#3D694A' }}
                />
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
                  name="Customer Receivables (AR)"
                  fill="#1F6A37"
                  radius={[6, 6, 0, 0]}
                />
                <Bar
                  dataKey="payableKes"
                  name="Supplier Payables (AP)"
                  fill="#4EB462"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <Card className="lg:col-span-5 space-y-3">
          <h3 className="font-heading text-base font-semibold">
            Supplier Obligation Schedule (AP)
          </h3>
          <p className="text-xs text-[var(--text-secondary)]">
            Upcoming cooperative and miller payouts in Kenyan Shillings (KES)
          </p>
          <div className="space-y-2.5 pt-2">
            {suppliers.map((sup) => (
              <div
                key={sup.id}
                className="p-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-semibold text-[var(--text-primary)]">
                    {sup.name}
                  </div>
                  <div className="text-[11px] text-[var(--text-secondary)]">
                    Terms: {sup.paymentTerms} · {sup.region}
                  </div>
                </div>
                <div className="font-mono-tabular font-semibold text-[#1F6A37] dark:text-[#4EB462]">
                  KES {sup.payableBalanceKes.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

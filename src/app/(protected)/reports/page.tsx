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
import { Download } from 'lucide-react';
import { useBos } from '@/lib/services/bos-context';
import { ChartCard, KPI, PageHeader } from '@/components/ui/primitives';

const CATEGORY_MARGIN_DATA = [
  { category: 'Dry Grains & Rice', revenueKes: 1420000, marginPct: 16.8 },
  { category: 'Fresh Vegetables', revenueKes: 860000, marginPct: 24.5 },
  { category: 'Fruits & Avocados', revenueKes: 540000, marginPct: 28.2 },
  { category: 'Root & Tubers', revenueKes: 490000, marginPct: 22.1 },
  { category: 'Dairy & Eggs', revenueKes: 380000, marginPct: 18.4 },
];

export default function ReportsPage() {
  const { can } = useBos();

  const handleExport = () => {
    const csv = [
      'Category,Monthly Revenue (KES),Gross Margin (%)',
      ...CATEGORY_MARGIN_DATA.map(
        (r) => `"${r.category}",${r.revenueKes},${r.marginPct}`
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'agro-deliveries-margin-report.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader
        kicker="EXECUTIVE & OPERATIONAL ANALYTICS"
        title="Business Intelligence & Reports"
        description="Analyze category gross margins, institutional contract utilization, FEFO spoilage containment, and last-mile delivery SLA performance."
        actions={
          can('reports.export') && (
            <button
              type="button"
              onClick={handleExport}
              className="h-10 px-4 rounded-xl bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-medium inline-flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export Analytics CSV</span>
            </button>
          )
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPI
          label="Blended Gross Margin"
          value="21.4%"
          sublabel="Net of cold-chain & transit costs"
          delta="+1.8% vs Aug"
          tone="positive"
        />
        <KPI
          label="Cold-Chain Wastage Rate"
          value="0.38%"
          sublabel="FEFO allocation saved ~KES 84,000"
          delta="Target < 1.0%"
          tone="positive"
        />
        <KPI
          label="Institutional On-Time SLA"
          value="98.2%"
          sublabel="Delivered before 06:30 EAT cutoff"
          tone="positive"
        />
        <KPI
          label="Supplier QC Acceptance"
          value="98.4%"
          sublabel="Across 4 primary farm cooperatives"
          tone="positive"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <ChartCard
          title="Revenue by Product Category (KES)"
          subtitle="Monthly institutional & wholesale distribution volume"
          className="lg:col-span-7"
        >
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={CATEGORY_MARGIN_DATA}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(61, 105, 74, 0.15)"
                />
                <XAxis
                  dataKey="category"
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
                  dataKey="revenueKes"
                  name="Category Revenue (KES)"
                  fill="#1F6A37"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title="Gross Margin % by Category"
          subtitle="Spread between institutional contract price and cooperative cost"
          className="lg:col-span-5"
        >
          <div className="space-y-3 pt-2">
            {CATEGORY_MARGIN_DATA.map((item) => (
              <div
                key={item.category}
                className="p-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)]"
              >
                <div className="flex items-center justify-between text-xs font-medium mb-1.5">
                  <span>{item.category}</span>
                  <span className="font-mono-tabular font-semibold text-[#1F6A37] dark:text-[#4EB462]">
                    {item.marginPct}% Margin
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#E5EFE6] dark:bg-[#122719] overflow-hidden">
                  <div
                    className="h-full bg-[#1F6A37] dark:bg-[#4EB462]"
                    style={{ width: `${Math.min(100, item.marginPct * 3)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

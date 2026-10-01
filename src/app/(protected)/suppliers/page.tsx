'use client';

import React from 'react';
import { useBos } from '@/lib/services/bos-context';
import { Card, KPI, PageHeader, StatusBadge } from '@/components/ui/primitives';

export default function SuppliersPage() {
  const { suppliers } = useBos();

  return (
    <div>
      <PageHeader
        kicker="VENDOR DIRECTORY & FARMGATE PRICE TRACKING"
        title="Suppliers & Historical Cost Intelligence"
        description="Monitor Kenyan farm cooperatives, orchard unions, and grain millers including lead times, payment terms, QC reliability, and historical supplier cost changes."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPI
          label="Contracted Suppliers"
          value={`${suppliers.length} Vendors`}
          sublabel="Nyandarua, Kirinyaga, Murang’a, Eldoret"
          tone="positive"
        />
        <KPI
          label="Total Accounts Payable (AP)"
          value={`KES ${suppliers
            .reduce((s, v) => s + v.payableBalanceKes, 0)
            .toLocaleString()}`}
          sublabel="Net 14 & Net 30 cooperative terms"
          tone="neutral"
        />
        <KPI
          label="Average Lead Time"
          value="1.75 Days"
          sublabel="Direct farmgate & miller dispatch"
          tone="positive"
        />
        <KPI
          label="Supplier Price Variance Alerts"
          value="1 Increase"
          sublabel="Kinangop Roma Tomatoes (+6%)"
          tone="warning"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {suppliers.map((sup) => (
          <Card key={sup.id} className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-mono-tabular text-xs font-semibold text-[#1F6A37] dark:text-[#4EB462]">
                  {sup.code} · {sup.region}
                </div>
                <h3 className="font-heading text-lg font-semibold mt-0.5">
                  {sup.name}
                </h3>
                <div className="text-xs text-[var(--text-secondary)]">
                  {sup.category} · Contact: {sup.contactPerson} ({sup.phone})
                </div>
              </div>
              <StatusBadge status={sup.recentPriceTrend} />
            </div>

            <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs">
              <div>
                <div className="text-[11px] text-[var(--text-secondary)]">
                  Lead Time & Terms
                </div>
                <div className="font-semibold mt-0.5">
                  {sup.leadTimeDays}d · {sup.paymentTerms}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-[var(--text-secondary)]">
                  QC Pass Score
                </div>
                <div className="font-mono-tabular font-semibold text-[#1F6A37] dark:text-[#4EB462] mt-0.5">
                  {sup.qualityScorePct}%
                </div>
              </div>
              <div>
                <div className="text-[11px] text-[var(--text-secondary)]">
                  Payable Balance
                </div>
                <div className="font-mono-tabular font-semibold mt-0.5">
                  KES {sup.payableBalanceKes.toLocaleString()}
                </div>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold mb-2">
                Contracted SKUs & Historical Cost Comparison
              </div>
              <div className="space-y-2">
                {sup.suppliedProducts.map((sp) => (
                  <div
                    key={sp.productId}
                    className="p-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-medium text-[var(--text-primary)]">
                        {sp.productName}
                      </div>
                      <div className="text-[11px] text-[var(--text-secondary)]">
                        Last updated {sp.lastUpdated} · Previous cost: KES{' '}
                        {sp.previousCostKes.toLocaleString()}/{sp.unit}
                      </div>
                    </div>
                    <div className="text-right font-mono-tabular">
                      <div className="font-semibold text-[var(--text-primary)]">
                        KES {sp.currentCostKes.toLocaleString()} / {sp.unit}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

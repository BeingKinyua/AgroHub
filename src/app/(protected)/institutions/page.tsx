'use client';

import React from 'react';
import Link from 'next/link';
import { Building2, CalendarClock, FileCheck, Phone } from 'lucide-react';
import { useBos } from '@/lib/services/bos-context';
import { Card, KPI, PageHeader, StatusBadge } from '@/components/ui/primitives';

export default function InstitutionsPage() {
  const { customers } = useBos();
  const institutions = customers.filter((c) => c.isInstitutional);

  return (
    <div>
      <PageHeader
        kicker="TENDERS, CONTRACTS & RECURRING SUPPLY"
        title="Institutional Supply Contracts"
        description="Manage schools, hospitals, hotels, and restaurant groups operating under multi-month tenders, recurring delivery schedules, and contract pricing."
        actions={
          <Link
            href="/orders"
            className="h-10 px-4 rounded-xl bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-medium inline-flex items-center gap-2"
          >
            <span>View Institutional Orders</span>
          </Link>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPI
          label="Contracted Institutions"
          value={`${institutions.length} Organizations`}
          sublabel="Schools, Hospitals, Hotels & Restaurants"
          tone="positive"
        />
        <KPI
          label="Daily / Twice-Weekly Schedules"
          value={`${
            institutions.filter(
              (i) => i.orderCadence === 'Daily' || i.orderCadence === 'Twice Weekly'
            ).length
          } Accounts`}
          sublabel="Automated morning cold-chain runs"
          tone="positive"
        />
        <KPI
          label="Upcoming Tender Renewals"
          value={`${
            institutions.filter((i) => i.status === 'Tender Renewal').length
          } Contract`}
          sublabel="Carnivore & Tamarind Group (Oct 2026)"
          tone="warning"
        />
        <KPI
          label="Contracted Credit Exposure"
          value={`KES ${institutions
            .reduce((s, i) => s + i.outstandingBalanceKes, 0)
            .toLocaleString()}`}
          sublabel="Against KES 11.8M combined limit"
          tone="neutral"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {institutions.map((inst) => (
          <Card key={inst.id} className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-mono-tabular text-xs font-semibold text-[#1F6A37] dark:text-[#4EB462]">
                  {inst.code} · {inst.segment}
                </div>
                <h3 className="font-heading text-lg font-semibold mt-0.5">
                  {inst.name}
                </h3>
                <div className="text-xs text-[var(--text-secondary)]">
                  {inst.deliveryZone} · {inst.county} County
                </div>
              </div>
              <StatusBadge status={inst.status} />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs">
              <div>
                <div className="text-[11px] text-[var(--text-secondary)]">
                  Contract / Tender Ref
                </div>
                <div className="font-mono-tabular font-semibold mt-0.5">
                  {inst.contractRef}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-[var(--text-secondary)]">
                  Recurring Cadence
                </div>
                <div className="font-semibold mt-0.5">{inst.orderCadence}</div>
              </div>
              <div>
                <div className="text-[11px] text-[var(--text-secondary)]">
                  Pricing & Terms
                </div>
                <div className="font-semibold text-[#1F6A37] dark:text-[#4EB462] mt-0.5">
                  {inst.paymentTerms} ({inst.priceTier})
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[var(--text-secondary)] pt-1">
              <div>
                <strong className="text-[var(--text-primary)]">
                  {inst.procurementContact}
                </strong>{' '}
                ({inst.contactRole}) · {inst.phone}
              </div>
              <div className="font-mono-tabular text-[var(--text-primary)] font-semibold">
                AR: KES {inst.outstandingBalanceKes.toLocaleString()}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

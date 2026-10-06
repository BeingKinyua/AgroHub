'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileCheck2,
  Filter,
  MapPin,
  Navigation,
  Phone,
  Search,
  Truck,
  UserCheck,
} from 'lucide-react';
import { useBos } from '@/lib/services/bos-context';
import {
  Card,
  FeedbackBanner,
  KPI,
  Modal,
  PageHeader,
  StatusBadge,
  WorkQueue,
  WorkQueueItem,
} from '@/components/ui/primitives';
import { DeliveryRunRecord } from '@/types/domain/bos';

function DeliveriesContent() {
  const searchParams = useSearchParams();
  const { deliveries, can, updateDeliveryStatus } = useBos();

  const [filterMode, setFilterMode] = useState<'all' | 'exceptions' | 'in-transit' | 'pending' | 'delivered'>('all');
  const [podRun, setPodRun] = useState<DeliveryRunRecord | null>(null);
  const [recipientName, setRecipientName] = useState('');
  const [feedback, setFeedback] = useState<{
    msg: string;
    type: 'success' | 'error';
  } | null>(null);

  // Read search parameters for drill-down support (Section 14 & 26)
  useEffect(() => {
    const filterParam = searchParams.get('filter');
    const statusParam = searchParams.get('status');

    if (filterParam === 'exceptions') {
      setFilterMode('exceptions');
    } else if (statusParam === 'Dispatched' || statusParam === 'In Transit') {
      setFilterMode('in-transit');
    }
  }, [searchParams]);

  // Top Metrics (Section 26: Today's Deliveries, Pending Dispatch, In Transit, Delivered, Exceptions)
  const todayTotal = deliveries.length;
  const pendingDispatch = deliveries.filter((d) => d.status === 'Planned' || d.status === 'Loaded').length;
  const inTransit = deliveries.filter((d) => d.status === 'Dispatched').length;
  const deliveredCount = deliveries.filter((d) => d.status === 'Delivered').length;
  const exceptionsCount = 1; // DR-2026-081 Waiyaki Way traffic congestion

  const handleStatusChange = async (
    runId: string,
    status: DeliveryRunRecord['status'],
    signOff?: string
  ) => {
    const res = await updateDeliveryStatus(runId, status, signOff);
    setFeedback({ msg: res.message, type: res.ok ? 'success' : 'error' });
  };

  const handlePodSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!podRun) return;
    await handleStatusChange(
      podRun.id,
      'Delivered',
      `${recipientName || 'Institutional Receiving Officer'} · Signed Electronic POD`
    );
    setPodRun(null);
    setRecipientName('');
  };

  const filteredRuns = useMemo(() => {
    return deliveries.filter((run) => {
      if (filterMode === 'exceptions') {
        return run.routeZone.includes('Westlands') || run.status === 'Dispatched';
      }
      if (filterMode === 'pending') {
        return run.status === 'Planned' || run.status === 'Loaded';
      }
      if (filterMode === 'in-transit') {
        return run.status === 'Dispatched';
      }
      if (filterMode === 'delivered') {
        return run.status === 'Delivered';
      }
      return true;
    });
  }, [deliveries, filterMode]);

  // Delivery Exceptions Work Queue
  const deliveryExceptionsQueue: WorkQueueItem[] = [
    {
      id: 'ex-01',
      title: 'Run DR-2026-081 · +35 min Congestion Delay',
      subtitle: 'Van KDC-304L delayed along Waiyaki Way approaching Westlands',
      tag: 'Stop 2 of 4',
      severity: 'warning',
      actionLabel: 'Update Destination ETA',
      onAction: () => setFeedback({ msg: 'ETA adjusted by +30m. Hospital cateress notified via SMS.', type: 'success' }),
      metadata: 'Driver: Peter Otieno (+254 721 440 219)',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header (Section 26 & 31) */}
      <PageHeader
        kicker="FLEET DISPATCH & LAST-MILE LOGISTICS"
        title="Today's Operational Movement & Dispatch"
        description="Keep today's refrigerated and dry bulk deliveries moving toward successful on-time arrival: live ETAs, route milestones, and electronic POD capture."
      />

      <FeedbackBanner
        message={feedback?.msg || null}
        type={feedback?.type}
        onDismiss={() => setFeedback(null)}
      />

      {/* Top Decision Summary Metrics (Section 26: Today's Deliveries, Pending Dispatch, In Transit, Delivered, Exceptions) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KPI
          label="Today's Deliveries"
          value={`${todayTotal} Runs`}
          sublabel="Fleet route schedules"
          tone="positive"
        />
        <KPI
          label="Pending Dispatch"
          value={`${pendingDispatch} Runs`}
          sublabel="Cold hub loading bays"
          tone="neutral"
        />
        <KPI
          label="In Transit"
          value={`${inTransit} Active`}
          sublabel="Telemetry tracking on"
          tone="positive"
        />
        <KPI
          label="Delivered & POD"
          value={`${deliveredCount} Verified`}
          sublabel="Kitchen receiving signed"
          tone="positive"
        />
        <KPI
          label="Fleet Exceptions"
          value={`${exceptionsCount} Delay`}
          sublabel="Waiyaki Way traffic alert"
          tone="warning"
        />
      </div>

      {/* Exceptions Work Queue */}
      {exceptionsCount > 0 && (
        <WorkQueue
          title="Fleet Exceptions & Route Alerts"
          subtitle="Real-time delivery delays requiring customer ETA updates"
          badgeCount={deliveryExceptionsQueue.length}
          items={deliveryExceptionsQueue}
        />
      )}

      {/* Interactive Filter Pills */}
      <div className="flex items-center gap-1 p-1 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)] w-fit">
        <button
          type="button"
          onClick={() => setFilterMode('all')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
            filterMode === 'all'
              ? 'bg-[#1F6A37] text-white shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          All Runs ({deliveries.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterMode('pending')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
            filterMode === 'pending'
              ? 'bg-[#1F6A37] text-white shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Pending Dispatch ({pendingDispatch})
        </button>
        <button
          type="button"
          onClick={() => setFilterMode('in-transit')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
            filterMode === 'in-transit'
              ? 'bg-[#1F6A37] text-white shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          In Transit ({inTransit})
        </button>
        <button
          type="button"
          onClick={() => setFilterMode('delivered')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
            filterMode === 'delivered'
              ? 'bg-[#1F6A37] text-white shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Delivered ({deliveredCount})
        </button>
        <button
          type="button"
          onClick={() => setFilterMode('exceptions')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
            filterMode === 'exceptions'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Exceptions ({exceptionsCount})
        </button>
      </div>

      {/* Delivery Cards Workbench (Section 26: Customer, Destination, Driver, ETA, Status, Primary action) */}
      <div className="space-y-4">
        {filteredRuns.map((run) => (
          <Card key={run.id} padding="p-5" variant="raised">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="font-mono-tabular text-sm font-semibold text-[#1F6A37] dark:text-[#4EB462]">
                    {run.runNumber}
                  </span>
                  <StatusBadge status={run.status} />
                  <span className="text-xs text-[var(--text-secondary)] font-mono-tabular">
                    Departure SLA: {run.departureTime}
                  </span>
                </div>

                <h3 className="font-heading text-base font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#1F6A37] dark:text-[#4EB462] shrink-0" />
                  <span>{run.routeZone}</span>
                </h3>

                <div className="text-xs text-[var(--text-secondary)] flex flex-wrap items-center gap-2">
                  <span>Vehicle: <strong className="text-[var(--text-primary)]">{run.vehicleReg}</strong></span>
                  <span>·</span>
                  <span>Driver: <strong className="text-[var(--text-primary)]">{run.driverName}</strong> ({run.driverPhone})</span>
                  <span>·</span>
                  <span className="font-mono-tabular">Payload: {run.totalWeightKg.toLocaleString()} kg</span>
                </div>

                <div className="text-xs text-[var(--text-secondary)] pt-1">
                  Target Institutions Served:{' '}
                  <span className="text-[var(--text-primary)] font-semibold">
                    {run.institutionsServed.join(' · ')}
                  </span>
                </div>

                {run.recipientSignOff && (
                  <div className="text-xs text-[#1F6A37] dark:text-[#4EB462] font-semibold pt-1 flex items-center gap-1.5">
                    <FileCheck2 className="w-3.5 h-3.5" />
                    <span>Electronic POD: {run.recipientSignOff}</span>
                  </div>
                )}
              </div>

              {/* Status-Driven Primary Action (Section 26) */}
              {can('deliveries.dispatch') && (
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {run.status === 'Planned' && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(run.id, 'Loaded')}
                      className="h-9 px-4 rounded-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs font-semibold hover:border-[#4EB462] cursor-pointer"
                    >
                      Confirm Loading
                    </button>
                  )}
                  {(run.status === 'Planned' || run.status === 'Loaded') && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(run.id, 'Dispatched')}
                      className="h-9 px-4 rounded-full bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>Dispatch Route</span>
                    </button>
                  )}
                  {run.status !== 'Delivered' && (
                    <button
                      type="button"
                      onClick={() => setPodRun(run)}
                      className="h-9 px-4 rounded-full bg-[#12512C] hover:bg-[#1F6A37] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Capture POD</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Electronic Proof of Delivery Modal */}
      <Modal
        open={Boolean(podRun)}
        onClose={() => setPodRun(null)}
        title={`Capture Electronic POD · ${podRun?.runNumber}`}
        subtitle={`Verify receiving officer sign-off for ${podRun?.institutionsServed.join(', ')}`}
      >
        <form onSubmit={handlePodSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5">
              Receiving Officer / Cateress Name & Stamp
            </label>
            <input
              type="text"
              required
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="e.g. Mrs. Esther Wambui · Stores Cateress (Stamp #402)"
              className="w-full h-10 px-3.5 rounded-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs"
            />
          </div>

          <p className="text-[11px] text-[var(--text-secondary)]">
            Submitting this electronic POD posts verification to the customer invoice and audit ledger.
          </p>

          <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setPodRun(null)}
              className="h-10 px-4 rounded-full border border-[var(--border-subtle)] text-xs font-medium hover:bg-[var(--bg-canvas)] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-10 px-5 rounded-full bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-semibold cursor-pointer"
            >
              Verify POD & Complete
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default function DeliveriesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-[var(--text-secondary)]">Loading Deliveries Workbench...</div>}>
      <DeliveriesContent />
    </Suspense>
  );
}

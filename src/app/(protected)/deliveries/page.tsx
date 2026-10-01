'use client';

import React, { useState } from 'react';
import { CheckCircle2, FileCheck2, MapPin, Truck } from 'lucide-react';
import { useBos } from '@/lib/services/bos-context';
import {
  Card,
  FeedbackBanner,
  KPI,
  Modal,
  PageHeader,
  StatusBadge,
} from '@/components/ui/primitives';
import { DeliveryRunRecord } from '@/types/domain/bos';

export default function DeliveriesPage() {
  const { deliveries, can, updateDeliveryStatus } = useBos();
  const [podRun, setPodRun] = useState<DeliveryRunRecord | null>(null);
  const [recipientName, setRecipientName] = useState('');
  const [feedback, setFeedback] = useState<{
    msg: string;
    type: 'success' | 'error';
  } | null>(null);

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

  return (
    <div>
      <PageHeader
        kicker="FLEET & LAST-MILE LOGISTICS"
        title="Delivery Runs & Proof of Delivery"
        description="Coordinate refrigerated and dry-bulk route runs, driver assignments, dispatch status, and electronic Proof of Delivery (POD) verification."
      />

      <FeedbackBanner
        message={feedback?.msg || null}
        type={feedback?.type}
        onDismiss={() => setFeedback(null)}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPI
          label="Scheduled & Active Runs"
          value={`${deliveries.length} Runs`}
          sublabel="Nairobi, Kiambu & Thika Road corridors"
          tone="positive"
        />
        <KPI
          label="In Transit / Dispatched"
          value={`${
            deliveries.filter(
              (d) => d.status === 'Dispatched' || d.status === 'Loaded'
            ).length
          }`}
          sublabel="Cold-chain telemetry active"
          tone="positive"
        />
        <KPI
          label="Total Dispatched Payload"
          value={`${deliveries
            .reduce((s, d) => s + d.totalWeightKg, 0)
            .toLocaleString()} kg`}
          sublabel="Across 3 fleet vehicles"
          tone="neutral"
        />
        <KPI
          label="Verified Electronic PODs"
          value={`${deliveries.filter((d) => d.podCaptured).length} / ${
            deliveries.length
          }`}
          sublabel="Linked to Invoices & Audit Log"
          tone="positive"
        />
      </div>

      <div className="space-y-4">
        {deliveries.map((run) => (
          <Card key={run.id}>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="font-mono-tabular text-sm font-semibold text-[#1F6A37] dark:text-[#4EB462]">
                    {run.runNumber}
                  </span>
                  <StatusBadge status={run.status} />
                  <span className="text-xs text-[var(--text-secondary)]">
                    Departure: {run.departureTime}
                  </span>
                </div>

                <h3 className="font-heading text-base font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#1F6A37] dark:text-[#4EB462] shrink-0" />
                  <span>{run.routeZone}</span>
                </h3>

                <div className="text-xs text-[var(--text-secondary)] flex flex-wrap items-center gap-2">
                  <span>Vehicle: {run.vehicleReg}</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    Driver: <strong>{run.driverName}</strong> ({run.driverPhone})
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-tabular">
                    Payload: {run.totalWeightKg.toLocaleString()} kg
                  </span>
                </div>

                <div className="text-xs text-[var(--text-secondary)] pt-1">
                  Institutions Served:{' '}
                  <span className="text-[var(--text-primary)] font-medium">
                    {run.institutionsServed.join(' · ')}
                  </span>{' '}
                  ({run.ordersIncluded.join(', ')})
                </div>

                {run.recipientSignOff && (
                  <div className="text-xs text-[#1F6A37] dark:text-[#4EB462] font-medium pt-1 flex items-center gap-1.5">
                    <FileCheck2 className="w-3.5 h-3.5" />
                    <span>POD Verified: {run.recipientSignOff}</span>
                  </div>
                )}
              </div>

              {can('deliveries.dispatch') && (
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {run.status === 'Planned' && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(run.id, 'Loaded')}
                      className="px-3.5 py-2 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs font-medium hover:border-[#4EB462] cursor-pointer"
                    >
                      Mark Vehicle Loaded
                    </button>
                  )}
                  {(run.status === 'Planned' || run.status === 'Loaded') && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(run.id, 'Dispatched')}
                      className="px-3.5 py-2 rounded-xl bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>Dispatch Route Run</span>
                    </button>
                  )}
                  {run.status !== 'Delivered' && (
                    <button
                      type="button"
                      onClick={() => setPodRun(run)}
                      className="px-3.5 py-2 rounded-xl bg-[#12512C] hover:bg-[#1F6A37] text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Capture POD & Complete</span>
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
        subtitle={`Verify institutional kitchen sign-off for ${podRun?.institutionsServed.join(
          ', '
        )}`}
      >
        <form onSubmit={handlePodSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5">
              Receiving Officer / Cateress Name & Stamp Reference
            </label>
            <input
              type="text"
              required
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="e.g., Mrs. Esther Wambui · Stores Officer (Stamp #402)"
              className="w-full h-10 px-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs"
            />
          </div>
          <div className="p-3.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">
            Orders covered in this POD:{' '}
            <strong className="font-mono-tabular text-[var(--text-primary)]">
              {podRun?.ordersIncluded.join(', ')}
            </strong>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setPodRun(null)}
              className="px-4 py-2 rounded-xl border border-[var(--border-subtle)] text-xs font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-[#1F6A37] text-white text-xs font-medium cursor-pointer"
            >
              Confirm POD & Mark Delivered
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

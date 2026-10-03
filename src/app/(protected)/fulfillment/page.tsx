'use client';

import React, { useState } from 'react';
import { ArrowRight, Boxes, CheckCircle2, PackageCheck, Truck } from 'lucide-react';
import { useBos } from '@/lib/services/bos-context';
import {
  Card,
  FeedbackBanner,
  KPI,
  PageHeader,
  StatusBadge,
} from '@/components/ui/primitives';
import { OrderLifecycleStatus } from '@/types/domain/bos';

const STAGES: {
  status: OrderLifecycleStatus;
  title: string;
  actor: string;
  nextStatus?: OrderLifecycleStatus;
  nextButtonLabel?: string;
}[] = [
  {
    status: 'Confirmed',
    title: '01. Confirmed & FEFO Reserved',
    actor: 'Operations / Storekeeper',
    nextStatus: 'Picking',
    nextButtonLabel: 'Start Warehouse Picking',
  },
  {
    status: 'Picking',
    title: '02. Cold & Dry Hub Picking',
    actor: 'Samuel Mutua (Storekeeper)',
    nextStatus: 'Packed',
    nextButtonLabel: 'Confirm Crates Packed',
  },
  {
    status: 'Packed',
    title: '03. Packed & Cross-Dock Staged',
    actor: 'Dispatch Coordinator',
    nextStatus: 'Dispatched',
    nextButtonLabel: 'Hand Over to Route Driver',
  },
  {
    status: 'Dispatched',
    title: '04. In Transit on Route Run',
    actor: 'Joseph Omondi (Delivery Driver)',
    nextStatus: 'Delivered',
    nextButtonLabel: 'Confirm POD & Delivery',
  },
];

export default function FulfillmentPage() {
  const { orders, can, advanceOrderStatus } = useBos();
  const [feedback, setFeedback] = useState<{
    msg: string;
    type: 'success' | 'error';
  } | null>(null);

  const handleAdvance = async (
    orderId: string,
    nextStatus: OrderLifecycleStatus
  ) => {
    const res = await advanceOrderStatus(orderId, nextStatus);
    setFeedback({ msg: res.message, type: res.ok ? 'success' : 'error' });
  };

  return (
    <div>
      <PageHeader
        kicker="WAREHOUSE & STAGING WORKFLOW"
        title="Fulfillment Pipeline"
        description="Connects institutional orders to FEFO inventory batches, picking, crate packing, cross-dock staging, and route dispatch."
      />

      <FeedbackBanner
        message={feedback?.msg || null}
        type={feedback?.type}
        onDismiss={() => setFeedback(null)}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {STAGES.map((st) => {
          const count = orders.filter((o) => o.status === st.status).length;
          return (
            <KPI
              key={st.status}
              label={st.title}
              value={`${count} Orders`}
              sublabel={`Responsible: ${st.actor}`}
              tone={count > 0 ? 'positive' : 'neutral'}
            />
          );
        })}
      </div>

      {/* Stage Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {STAGES.map((stage) => {
          const stageOrders = orders.filter((o) => o.status === stage.status);
          return (
            <Card key={stage.status} className="flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 pb-4 mb-4 border-b border-[var(--border-subtle)]">
                  <div>
                    <h2 className="font-heading text-base font-semibold text-[var(--text-primary)]">
                      {stage.title}
                    </h2>
                    <p className="text-xs text-[var(--text-secondary)]">
                      Responsible Actor: {stage.actor}
                    </p>
                  </div>
                  <StatusBadge status={stage.status} />
                </div>

                {stageOrders.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[var(--text-secondary)]">
                    No orders currently in {stage.status} state.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {stageOrders.map((ord) => (
                      <div
                        key={ord.id}
                        className="p-4 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] space-y-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono-tabular text-xs font-semibold text-[#1F6A37] dark:text-[#4EB462]">
                            {ord.orderNumber}
                          </span>
                          <span className="text-[11px] text-[var(--text-secondary)]">
                            Hub: {ord.warehouseName}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-[var(--text-primary)]">
                          {ord.customerName}
                        </div>
                        <div className="space-y-1">
                          {ord.items.map((item, idx) => (
                            <div
                              key={idx}
                              className="text-[11px] text-[var(--text-secondary)] flex items-center justify-between"
                            >
                              <span>
                                {item.quantity} {item.unit} · {item.productName}
                              </span>
                              <span className="font-mono-tabular text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-card)]">
                                {item.allocatedBatch}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between gap-2">
                          <span className="text-[11px] text-[var(--text-secondary)]">
                            Next: {ord.nextStepLabel}
                          </span>
                          {stage.nextStatus &&
                            (can('fulfillment.manage') ||
                              can('deliveries.dispatch')) && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleAdvance(ord.id, stage.nextStatus!)
                                }
                                className="px-3 py-1.5 rounded-full bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer shrink-0"
                              >
                                <span>{stage.nextButtonLabel}</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

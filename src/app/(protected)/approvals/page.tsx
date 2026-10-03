'use client';

import React, { useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { useBos } from '@/lib/services/bos-context';
import {
  Card,
  FeedbackBanner,
  KPI,
  PageHeader,
  StatusBadge,
} from '@/components/ui/primitives';

export default function ApprovalsPage() {
  const { approvals, can, resolveApproval } = useBos();
  const [comments, setComments] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<{
    msg: string;
    type: 'success' | 'error';
  } | null>(null);

  const handleDecision = async (
    id: string,
    decision: 'Approved' | 'Rejected'
  ) => {
    const comment = comments[id] || `${decision} via Governance Inbox`;
    const res = await resolveApproval(id, decision, comment);
    setFeedback({ msg: res.message, type: res.ok ? 'success' : 'error' });
  };

  return (
    <div>
      <PageHeader
        kicker="GOVERNANCE & AUTHORITY WORKFLOW"
        title="Centralized Approval Center"
        description="Review and authorize high-value Purchase Orders, Institutional Price Overrides, Credit Limit Extensions, and Inventory Wastage Write-Offs."
      />

      <FeedbackBanner
        message={feedback?.msg || null}
        type={feedback?.type}
        onDismiss={() => setFeedback(null)}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <KPI
          label="Pending Decisions"
          value={`${approvals.filter((a) => a.status === 'Pending').length}`}
          sublabel="Requires Executive / Manager authority"
          tone="warning"
        />
        <KPI
          label="Value Awaiting Sign-Off"
          value={`KES ${approvals
            .filter((a) => a.status === 'Pending')
            .reduce((s, a) => s + a.valueKes, 0)
            .toLocaleString()}`}
          sublabel="PO-2026-515 & Credit Release OVR-2026-042"
          tone="warning"
        />
        <KPI
          label="Completed Governance Decisions"
          value={`${approvals.filter((a) => a.status !== 'Pending').length}`}
          sublabel="Logged to immutable Audit Trail"
          tone="positive"
        />
      </div>

      <div className="space-y-4">
        {approvals.map((apr) => (
          <Card key={apr.id} className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-mono-tabular text-sm font-semibold text-[#1F6A37] dark:text-[#4EB462]">
                  {apr.reference}
                </span>
                <span className="text-xs font-medium px-2.5 py-0.5 rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)]">
                  {apr.category}
                </span>
                <StatusBadge status={apr.status} />
              </div>
              <div className="font-mono-tabular text-sm font-semibold">
                KES {apr.valueKes.toLocaleString()}
              </div>
            </div>

            <div>
              <h3 className="font-heading text-base font-semibold text-[var(--text-primary)]">
                {apr.entityTitle}
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                <strong>Operational Reason:</strong> {apr.reason}
              </p>
              <div className="text-[11px] text-[var(--text-secondary)] mt-1">
                Requested by <strong>{apr.requesterName}</strong> (
                {apr.requesterRole}) · {apr.requestedAt}
              </div>
            </div>

            {apr.status === 'Pending' ? (
              can('approvals.approve') ? (
                <div className="pt-3 border-t border-[var(--border-subtle)] flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <input
                    type="text"
                    value={comments[apr.id] || ''}
                    onChange={(e) =>
                      setComments((prev) => ({
                        ...prev,
                        [apr.id]: e.target.value,
                      }))
                    }
                    placeholder="Add governance review comment (optional)..."
                    className="flex-1 h-10 px-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs"
                  />
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleDecision(apr.id, 'Approved')}
                      className="h-10 px-4 rounded-full bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Approve</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDecision(apr.id, 'Rejected')}
                      className="h-10 px-4 rounded-full bg-red-600/15 hover:bg-red-600/25 text-red-700 dark:text-red-300 text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-[var(--text-secondary)] italic">
                  Requires &lsquo;approvals.approve&rsquo; authority to act on
                  this request.
                </div>
              )
            ) : (
              <div className="p-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">
                Decision by <strong>{apr.decisionBy}</strong> ({apr.decisionAt}):
                &ldquo;{apr.decisionComment}&rdquo;
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

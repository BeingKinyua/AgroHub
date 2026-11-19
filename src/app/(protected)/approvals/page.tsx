'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  DollarSign,
  FileCheck,
  FileText,
  Filter,
  MessageSquare,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { useBos } from '@/lib/services/bos-context';
import {
  Card,
  FeedbackBanner,
  KPI,
  Modal,
  PageHeader,
  StatusBadge,
} from '@/components/ui/primitives';

function ApprovalsContent() {
  const searchParams = useSearchParams();
  const { approvals, can, resolveApproval } = useBos();

  const [filterMode, setFilterMode] = useState<'pending' | 'resolved' | 'all'>('pending');
  const [comments, setComments] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<{
    msg: string;
    type: 'success' | 'error';
  } | null>(null);

  useEffect(() => {
    const statusParam = searchParams.get('status');
    if (statusParam === 'pending') {
      setFilterMode('pending');
    } else if (statusParam === 'all') {
      setFilterMode('all');
    }
  }, [searchParams]);

  const handleDecision = async (
    id: string,
    decision: 'Approved' | 'Rejected'
  ) => {
    const comment = comments[id] || `${decision} via Governance Decision Center`;
    const res = await resolveApproval(id, decision, comment);
    setFeedback({ msg: res.message, type: res.ok ? 'success' : 'error' });
  };

  const pendingApprovals = useMemo(
    () => approvals.filter((a) => a.status === 'Pending'),
    [approvals]
  );

  const pendingValueKes = useMemo(
    () => pendingApprovals.reduce((s, a) => s + a.valueKes, 0),
    [pendingApprovals]
  );

  const filteredApprovals = useMemo(() => {
    if (filterMode === 'pending') return approvals.filter((a) => a.status === 'Pending');
    if (filterMode === 'resolved') return approvals.filter((a) => a.status !== 'Pending');
    return approvals;
  }, [approvals, filterMode]);

  // Operational risk assessment helper
  const getRiskAssessment = (category: string, valueKes: number) => {
    if (valueKes >= 500000) {
      return {
        level: 'High Financial Commitment',
        color: 'text-[var(--status-warning-fg)] bg-[var(--status-warning-bg)]',
        detail: 'Significant cash-flow outlay. Exceeds standard procurement threshold of KES 250,000.',
        nextStepIfApproved: 'PO will be issued directly to the supplier; supplier receives dispatch notification.',
        nextStepIfRejected: 'Requisition returned to Procurement Officer for renegotiation or quantity downsizing.',
      };
    }
    if (category === 'Price Override') {
      return {
        level: 'Margin Compression Risk',
        color: 'text-[var(--status-warning-fg)] bg-[var(--status-warning-bg)]',
        detail: 'Price concession reduces gross contract margin by 3.2% to win termly school volume.',
        nextStepIfApproved: 'Order pricing is unlocked; sales order proceeds immediately to warehouse picking.',
        nextStepIfRejected: 'Sales rep must invoice at standard tier pricing or seek bursar counter-offer.',
      };
    }
    return {
      level: 'Standard Governance Review',
      color: 'ui-tone-success',
      detail: 'Standard operational protocol compliant with internal limits.',
      nextStepIfApproved: 'Immediate inventory release and invoice ledger posting.',
      nextStepIfRejected: 'Action halted and returned for operator re-verification.',
    };
  };

  return (
    <div className="space-y-6">
      {/* Page Header (Section 28 & 31) */}
      <PageHeader
        title="Approvals"
        description="Review purchase orders, pricing overrides, and other requests that require approval."
      />

      <FeedbackBanner
        message={feedback?.msg || null}
        type={feedback?.type}
        onDismiss={() => setFeedback(null)}
      />

      {/* Top Decision Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPI
          label="Pending Decisions"
          value={`${pendingApprovals.length} Requests`}
          sublabel="Requires Manager / Executive Sign-Off"
          tone={pendingApprovals.length > 0 ? 'warning' : 'positive'}
        />
        <KPI
          label="Value Awaiting Authorization"
          value={`KES ${pendingValueKes.toLocaleString()}`}
          sublabel="POs ≥ KES 250k & Price Overrides"
          tone="warning"
        />
        <KPI
          label="Completed Decisions"
          value={`${approvals.filter((a) => a.status !== 'Pending').length} Decisions`}
          sublabel="Logged to immutable PostgreSQL Audit Trail"
          tone="positive"
        />
      </div>

      {/* Filter Switcher */}
      <div className="flex flex-wrap items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-1 w-fit">
        <button
          type="button"
          onClick={() => setFilterMode('pending')}
          aria-pressed={filterMode === 'pending'}
          className="ui-tab whitespace-nowrap"
        >
          Pending Decisions ({pendingApprovals.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterMode('resolved')}
          aria-pressed={filterMode === 'resolved'}
          className="ui-tab whitespace-nowrap"
        >
          Resolved History ({approvals.filter((a) => a.status !== 'Pending').length})
        </button>
        <button
          type="button"
          onClick={() => setFilterMode('all')}
          aria-pressed={filterMode === 'all'}
          className="ui-tab whitespace-nowrap"
        >
          All Requests ({approvals.length})
        </button>
      </div>

      {/* Decision Cards (Section 28: What? Who requested? Why? Amount? Risk? What happens next?) */}
      <div className="space-y-5">
        {filteredApprovals.length === 0 ? (
          <Card padding="p-8" className="text-center">
            <CheckCircle2 className="w-8 h-8 text-[var(--brand-accent)] mx-auto mb-2" />
            <h3 className="ui-section-title">
              All Governance Approvals Cleared
            </h3>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              There are no pending decisions requiring your authority right now.
            </p>
          </Card>
        ) : (
          filteredApprovals.map((apr) => {
            const risk = getRiskAssessment(apr.category, apr.valueKes);
            const isPending = apr.status === 'Pending';

            return (
              <Card key={apr.id} padding="p-6" variant="raised" className="space-y-4">
                {/* Header & Badges */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono-tabular text-sm font-semibold text-[var(--brand-accent)]">
                      {apr.reference}
                    </span>
                    <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)]">
                      {apr.category}
                    </span>
                    <StatusBadge status={apr.status} />
                  </div>

                  <div className="text-right">
                    <div className="ui-meta uppercase tracking-wider">
                      Decision Value
                    </div>
                    <div className="font-mono-tabular text-lg font-bold text-[var(--text-primary)]">
                      KES {apr.valueKes.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Structured Decision Framework (Section 28) */}
                <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
                  {/* Left Column: What & Who & Why */}
                  <div className="space-y-3">
                    <div>
                      <div className="ui-meta font-semibold uppercase tracking-wider">
                        1. What is being authorized?
                      </div>
                      <div className="font-heading text-sm font-semibold text-[var(--text-primary)] mt-0.5">
                        {apr.entityTitle}
                      </div>
                    </div>

                    <div>
                      <div className="ui-meta font-semibold uppercase tracking-wider">
                        2. Who requested this?
                      </div>
                      <div className="text-[var(--text-primary)] mt-0.5">
                        <strong>{apr.requesterName}</strong> ({apr.requesterRole}) · Requested at {apr.requestedAt}
                      </div>
                    </div>

                    <div>
                      <div className="ui-meta font-semibold uppercase tracking-wider">
                        3. Why? (Operational Justification)
                      </div>
                      <div className="text-[var(--text-secondary)] bg-[var(--bg-canvas)] p-2.5 rounded-xl border border-[var(--border-subtle)] mt-1">
                        {apr.reason}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Risk & What Happens Next */}
                  <div className="space-y-3">
                    <div>
                      <div className="ui-meta font-semibold uppercase tracking-wider">
                        4. Operational & Financial Risk Evaluation
                      </div>
                      <div className={`mt-1 p-2.5 rounded-xl border border-[var(--border-subtle)] ${risk.color}`}>
                        <div className="text-sm font-semibold">{risk.level}</div>
                        <div className="text-xs mt-0.5">{risk.detail}</div>
                      </div>
                    </div>

                    <div>
                      <div className="ui-meta font-semibold uppercase tracking-wider">
                        5. What happens next?
                      </div>
                      <div className="bg-[var(--bg-canvas)] p-2.5 rounded-xl border border-[var(--border-subtle)] ui-meta space-y-1 mt-1">
                        <div>
                          <strong className="text-[var(--brand-accent)]">If Approved:</strong> {risk.nextStepIfApproved}
                        </div>
                        <div>
                          <strong className="text-[var(--status-danger-fg)]">If Rejected:</strong> {risk.nextStepIfRejected}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Primary Decision Action Bar (Section 28) */}
                {isPending && can('approvals.approve') ? (
                  <div className="pt-4 border-t border-[var(--border-subtle)] space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1">
                        <input
                          type="text"
                          aria-label={`Decision comment for ${apr.reference}`}
                          placeholder="Add decision comment / condition (optional)..."
                          value={comments[apr.id] || ''}
                          onChange={(e) =>
                            setComments({ ...comments, [apr.id]: e.target.value })
                          }
                          className="ui-field w-full"
                        />
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleDecision(apr.id, 'Rejected')}
                          className="ui-button ui-button-danger"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Reject</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDecision(apr.id, 'Approved')}
                          className="ui-button ui-button-primary"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Approve</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="pt-3 border-t border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">
                    Decision recorded: <strong>{apr.status}</strong> · Logged to Governance Audit Trail
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function ApprovalsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-[var(--text-secondary)]">Loading Approval Center...</div>}>
      <ApprovalsContent />
    </Suspense>
  );
}

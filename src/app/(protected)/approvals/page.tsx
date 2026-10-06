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
        color: 'text-amber-700 dark:text-amber-400 bg-amber-500/10',
        detail: 'Significant cash-flow outlay. Exceeds standard procurement threshold of KES 250,000.',
        nextStepIfApproved: 'PO will be issued directly to the supplier; supplier receives dispatch notification.',
        nextStepIfRejected: 'Requisition returned to Procurement Officer for renegotiation or quantity downsizing.',
      };
    }
    if (category === 'Price Override') {
      return {
        level: 'Margin Compression Risk',
        color: 'text-amber-700 dark:text-amber-400 bg-amber-500/10',
        detail: 'Price concession reduces gross contract margin by 3.2% to win termly school volume.',
        nextStepIfApproved: 'Order pricing is unlocked; sales order proceeds immediately to warehouse picking.',
        nextStepIfRejected: 'Sales rep must invoice at standard tier pricing or seek bursar counter-offer.',
      };
    }
    return {
      level: 'Standard Governance Review',
      color: 'text-[#1F6A37] dark:text-[#4EB462] bg-[#E5EFE6] dark:bg-[#142B1B]',
      detail: 'Standard operational protocol compliant with internal limits.',
      nextStepIfApproved: 'Immediate inventory release and invoice ledger posting.',
      nextStepIfRejected: 'Action halted and returned for operator re-verification.',
    };
  };

  return (
    <div className="space-y-6">
      {/* Page Header (Section 28 & 31) */}
      <PageHeader
        kicker="EXECUTIVE & MANAGER GOVERNANCE"
        title="Centralized Decision Center"
        description="High-clarity decision environment: evaluate operational justifications, evaluate financial and supply risks, and authorize high-value procurement and pricing overrides."
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
      <div className="flex items-center gap-1 p-1 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)] w-fit">
        <button
          type="button"
          onClick={() => setFilterMode('pending')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
            filterMode === 'pending'
              ? 'bg-[#1F6A37] text-white shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Pending Decisions ({pendingApprovals.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterMode('resolved')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
            filterMode === 'resolved'
              ? 'bg-[#1F6A37] text-white shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Resolved History ({approvals.filter((a) => a.status !== 'Pending').length})
        </button>
        <button
          type="button"
          onClick={() => setFilterMode('all')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
            filterMode === 'all'
              ? 'bg-[#1F6A37] text-white shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          All Requests ({approvals.length})
        </button>
      </div>

      {/* Decision Cards (Section 28: What? Who requested? Why? Amount? Risk? What happens next?) */}
      <div className="space-y-5">
        {filteredApprovals.length === 0 ? (
          <Card padding="p-8" className="text-center">
            <CheckCircle2 className="w-8 h-8 text-[#1F6A37] dark:text-[#4EB462] mx-auto mb-2" />
            <h3 className="font-heading text-base font-semibold text-[var(--text-primary)]">
              All Governance Approvals Cleared
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
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
                    <span className="font-mono-tabular text-sm font-semibold text-[#1F6A37] dark:text-[#4EB462]">
                      {apr.reference}
                    </span>
                    <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)]">
                      {apr.category}
                    </span>
                    <StatusBadge status={apr.status} />
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">
                      Decision Value
                    </div>
                    <div className="font-mono-tabular text-lg font-bold text-[var(--text-primary)]">
                      KES {apr.valueKes.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Structured Decision Framework (Section 28) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* Left Column: What & Who & Why */}
                  <div className="space-y-3">
                    <div>
                      <div className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                        1. What is being authorized?
                      </div>
                      <div className="font-heading text-sm font-semibold text-[var(--text-primary)] mt-0.5">
                        {apr.entityTitle}
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                        2. Who requested this?
                      </div>
                      <div className="text-[var(--text-primary)] mt-0.5">
                        <strong>{apr.requesterName}</strong> ({apr.requesterRole}) · Requested at {apr.requestedAt}
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
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
                      <div className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                        4. Operational & Financial Risk Evaluation
                      </div>
                      <div className={`mt-1 p-2.5 rounded-xl border border-[var(--border-subtle)] ${risk.color}`}>
                        <div className="font-semibold text-xs">{risk.level}</div>
                        <div className="text-[11px] mt-0.5">{risk.detail}</div>
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                        5. What happens next?
                      </div>
                      <div className="bg-[var(--bg-canvas)] p-2.5 rounded-xl border border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)] space-y-1 mt-1">
                        <div>
                          <strong className="text-[#1F6A37] dark:text-[#4EB462]">If Approved:</strong> {risk.nextStepIfApproved}
                        </div>
                        <div>
                          <strong className="text-red-600 dark:text-red-400">If Rejected:</strong> {risk.nextStepIfRejected}
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
                          placeholder="Add decision comment / condition (optional)..."
                          value={comments[apr.id] || ''}
                          onChange={(e) =>
                            setComments({ ...comments, [apr.id]: e.target.value })
                          }
                          className="w-full h-9 px-3.5 rounded-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs focus:outline-none"
                        />
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleDecision(apr.id, 'Rejected')}
                          className="h-9 px-4 rounded-full bg-red-600/10 text-red-600 hover:bg-red-600 hover:text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Reject</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDecision(apr.id, 'Approved')}
                          className="h-9 px-5 rounded-full bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
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

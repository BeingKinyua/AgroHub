'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  Search,
  UserCheck,
  Users,
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
import { CrmTicketRecord } from '@/types/domain/bos';

function CrmContent() {
  const searchParams = useSearchParams();
  const { crmTickets, customers, can, createCrmTicket, resolveCrmTicket } = useBos();

  const [activeTab, setActiveTab] = useState<'actions' | 'customers'>('actions');
  const [filterType, setFilterType] = useState<'all' | 'contracts' | 'follow-up' | 'overdue'>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [customerName, setCustomerName] = useState(customers[0]?.name || '');
  const [type, setType] = useState<CrmTicketRecord['type']>('Contract Renewal');
  const [priority, setPriority] = useState<CrmTicketRecord['priority']>('High');
  const [dueDate, setDueDate] = useState('2026-10-05');
  const [summary, setSummary] = useState('');
  const [feedback, setFeedback] = useState<{
    msg: string;
    type: 'success' | 'error';
  } | null>(null);

  // Read search parameters for drill-down support (Section 14 & 27)
  useEffect(() => {
    const filterParam = searchParams.get('filter');
    if (filterParam === 'contracts') {
      setActiveTab('actions');
      setFilterType('contracts');
    } else if (filterParam === 'follow-up') {
      setActiveTab('actions');
      setFilterType('follow-up');
    } else if (filterParam === 'overdue') {
      setActiveTab('customers');
    }
  }, [searchParams]);

  // Top Metrics (Section 27: Follow-ups Due, Contracts Expiring, Overdue Customers, Open Complaints, Inactive Accounts)
  const followUpsDue = crmTickets.filter((t) => t.status !== 'Resolved').length;
  const contractsExpiring = 2; // St. Mary's School & Strathmore <= 14d
  const overdueCustomers = customers.filter((c) => c.overdueBalanceKes > 0).length;
  const openComplaints = crmTickets.filter((t) => t.type === 'Quality Claim' && t.status !== 'Resolved').length;
  const inactiveAccounts = customers.filter((c) => c.status !== 'Active').length;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await createCrmTicket({
      customerName,
      type,
      priority,
      dueDate,
      summary,
    });
    setFeedback({ msg: res.message, type: res.ok ? 'success' : 'error' });
    if (res.ok) {
      setCreateOpen(false);
      setSummary('');
    }
  };

  const handleResolve = async (id: string) => {
    const res = await resolveCrmTicket(id);
    setFeedback({ msg: res.message, type: res.ok ? 'success' : 'error' });
  };

  // Primary Work Queue (Section 27)
  const crmWorkQueueItems: WorkQueueItem[] = useMemo(() => {
    return crmTickets
      .filter((t) => t.status !== 'Resolved')
      .map((t) => ({
        id: t.id,
        title: `${t.ticketNumber} · ${t.customerName}`,
        subtitle: `${t.type} — ${t.summary}`,
        tag: `Due ${t.dueDate}`,
        severity: t.priority === 'High' ? ('critical' as const) : ('warning' as const),
        actionLabel: 'Resolve Issue',
        onAction: () => handleResolve(t.id),
        metadata: `Priority: ${t.priority}`,
      }));
  }, [crmTickets]);

  const filteredTickets = useMemo(() => {
    return crmTickets.filter((t) => {
      if (filterType === 'contracts') return t.type === 'Contract Renewal';
      if (filterType === 'follow-up') return t.status !== 'Resolved';
      return true;
    });
  }, [crmTickets, filterType]);

  return (
    <div className="space-y-6">
      {/* Page Header (Section 27 & 31) */}
      <PageHeader
        kicker="RELATIONSHIP RETENTION & CONTRACT RENEWALS"
        title="CRM & Customer Action Center"
        description="Drive proactive institutional customer success: resolve procurement inquiries, manage tender renewals, enforce payment collection follow-ups, and ensure account retention."
        actions={
          can('crm.manage') && (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="h-10 px-4 rounded-full bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-semibold inline-flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Log Relationship Action</span>
            </button>
          )
        }
      />

      <FeedbackBanner
        message={feedback?.msg || null}
        type={feedback?.type}
        onDismiss={() => setFeedback(null)}
      />

      {/* Top Decision Summary Metrics (Section 27: Follow-ups Due, Contracts Expiring, Overdue Customers, Open Complaints, Inactive Accounts) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KPI
          label="Follow-ups Due"
          value={`${followUpsDue} Actions`}
          sublabel="Immediate attention needed"
          tone="warning"
        />
        <KPI
          label="Contracts Expiring"
          value={`${contractsExpiring} Tenders`}
          sublabel="Due for renewal <= 14d"
          tone="warning"
        />
        <KPI
          label="Overdue Accounts"
          value={`${overdueCustomers} Client`}
          sublabel="Exceeds Net 30 terms"
          tone="danger"
        />
        <KPI
          label="Open Quality Claims"
          value={`${openComplaints} Issue`}
          sublabel="Freshness / crate check"
          tone={openComplaints > 0 ? 'warning' : 'positive'}
        />
        <KPI
          label="Inactive Accounts"
          value={`${inactiveAccounts} Dormant`}
          sublabel="No order > 45 days"
          tone="neutral"
        />
      </div>

      {/* Primary Work Queue: High-Priority Customer Actions */}
      {crmWorkQueueItems.length > 0 && (
        <WorkQueue
          title="High-Priority Client Touchpoints"
          subtitle="Tender proposal deadlines and special customer requests"
          badgeCount={crmWorkQueueItems.length}
          items={crmWorkQueueItems}
        />
      )}

      {/* View Switcher Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)] w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('actions')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
            activeTab === 'actions'
              ? 'bg-[#1F6A37] text-white shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Relationship Action Queue ({crmTickets.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('customers')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
            activeTab === 'customers'
              ? 'bg-[#1F6A37] text-white shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Customer Portfolio & Contacts ({customers.length})
        </button>
      </div>

      {/* Tab 1: Relationship Action Queue */}
      {activeTab === 'actions' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">Filter:</span>
            <div className="flex items-center gap-1 p-0.5 rounded-full bg-[var(--bg-canvas)]">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer ${
                  filterType === 'all' ? 'bg-[#1F6A37] text-white' : 'text-[var(--text-secondary)]'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setFilterType('contracts')}
                className={`px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer ${
                  filterType === 'contracts' ? 'bg-[#1F6A37] text-white' : 'text-[var(--text-secondary)]'
                }`}
              >
                Contract Renewals
              </button>
              <button
                type="button"
                onClick={() => setFilterType('follow-up')}
                className={`px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer ${
                  filterType === 'follow-up' ? 'bg-[#1F6A37] text-white' : 'text-[var(--text-secondary)]'
                }`}
              >
                Open Follow-Ups
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {filteredTickets.map((t) => (
              <Card key={t.id} padding="p-5" variant="raised">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono-tabular text-xs font-semibold text-[#1F6A37] dark:text-[#4EB462]">
                        {t.ticketNumber}
                      </span>
                      <StatusBadge status={t.status} />
                      <span className="text-xs text-[var(--text-secondary)] font-medium">
                        {t.type}
                      </span>
                    </div>

                    <h3 className="font-heading text-base font-semibold text-[var(--text-primary)]">
                      {t.customerName}
                    </h3>

                    <p className="text-xs text-[var(--text-secondary)]">{t.summary}</p>

                    <div className="text-[11px] text-[var(--text-secondary)] flex items-center gap-2 pt-1">
                      <span>Due Date: <strong className="text-[var(--text-primary)]">{t.dueDate}</strong></span>
                      <span>·</span>
                      <span>Priority: <strong className="text-[var(--text-primary)]">{t.priority}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {t.status !== 'Resolved' && can('crm.manage') && (
                      <button
                        type="button"
                        onClick={() => handleResolve(t.id)}
                        className="h-8 px-4 rounded-full bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Resolve Action</span>
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Customer List (Section 27) */}
      {activeTab === 'customers' && (
        <Card padding="p-0" className="overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]/50 text-[11px] font-semibold text-[var(--text-secondary)]">
                  <th className="py-3 px-4">Institution / Client</th>
                  <th className="py-3 px-4">Segment</th>
                  <th className="py-3 px-4">Procurement Officer</th>
                  <th className="py-3 px-4">Payment Terms</th>
                  <th className="py-3 px-4 text-right">Outstanding Balance</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] text-xs">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-[var(--bg-canvas)]/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[var(--text-primary)]">{c.name}</div>
                      <div className="text-[11px] text-[var(--text-secondary)]">{c.code} · {c.deliveryZone || c.county}</div>
                    </td>
                    <td className="py-3.5 px-4 text-[var(--text-secondary)]">{c.segment}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium">{c.procurementContact}</div>
                      <div className="text-[11px] text-[var(--text-secondary)]">{c.phone}</div>
                    </td>
                    <td className="py-3.5 px-4 text-[var(--text-secondary)]">{c.paymentTerms}</td>
                    <td className="py-3.5 px-4 text-right font-mono-tabular font-semibold">
                      <span className={c.overdueBalanceKes > 0 ? 'text-red-600 dark:text-red-400 font-bold' : ''}>
                        KES {c.outstandingBalanceKes.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setCustomerName(c.name);
                          setType(c.overdueBalanceKes > 0 ? 'Tender Pricing Inquiry' : 'Contract Renewal');
                          setCreateOpen(true);
                        }}
                        className="h-7 px-3 rounded-full bg-[#E5EFE6] dark:bg-[#142B1B] text-[#12512C] dark:text-[#4EB462] hover:bg-[#1F6A37] hover:text-white text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>Follow Up</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Log Ticket Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Log Customer Relationship Action"
        subtitle="Schedule a tender contract follow-up, pricing discussion, or service ticket"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1">Customer / Client</label>
            <select
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full h-10 px-3 rounded-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name} ({c.segment})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Action Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as CrmTicketRecord['type'])}
                className="w-full h-10 px-3 rounded-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs"
              >
                <option value="Contract Renewal">Contract Renewal</option>
                <option value="Billing Inquiry">Billing Inquiry</option>
                <option value="Quality Claim">Quality Claim</option>
                <option value="Delivery Schedule Adjustment">Delivery Schedule Adjustment</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as CrmTicketRecord['priority'])}
                className="w-full h-10 px-3 rounded-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs"
              >
                <option value="High">High (Immediate Action)</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Follow-Up Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full h-10 px-3 rounded-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Action Summary / Notes</label>
            <textarea
              required
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="e.g. Discuss termly vegetable pricing with Bursar, review delivery time window..."
              className="w-full p-3 rounded-2xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs focus:outline-none"
            />
          </div>

          <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="h-10 px-4 rounded-full border border-[var(--border-subtle)] text-xs font-medium hover:bg-[var(--bg-canvas)] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-10 px-5 rounded-full bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-semibold cursor-pointer"
            >
              Save Action
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default function CrmPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-[var(--text-secondary)]">Loading CRM Workbench...</div>}>
      <CrmContent />
    </Suspense>
  );
}

'use client';

import React, { useState } from 'react';
import { CheckCircle2, Plus } from 'lucide-react';
import { useBos } from '@/lib/services/bos-context';
import {
  Card,
  FeedbackBanner,
  KPI,
  Modal,
  PageHeader,
  StatusBadge,
} from '@/components/ui/primitives';
import { CrmTicketRecord } from '@/types/domain/bos';

export default function CrmPage() {
  const { crmTickets, customers, can, createCrmTicket, resolveCrmTicket } =
    useBos();

  const [createOpen, setCreateOpen] = useState(false);
  const [customerName, setCustomerName] = useState(customers[0]?.name || '');
  const [type, setType] =
    useState<CrmTicketRecord['type']>('Contract Renewal');
  const [priority, setPriority] =
    useState<CrmTicketRecord['priority']>('High');
  const [dueDate, setDueDate] = useState('2026-10-05');
  const [summary, setSummary] = useState('');
  const [feedback, setFeedback] = useState<{
    msg: string;
    type: 'success' | 'error';
  } | null>(null);

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

  return (
    <div>
      <PageHeader
        kicker="RELATIONSHIP MANAGEMENT, SUPPORT & RENEWALS"
        title="CRM, Follow-Ups & Service Desk"
        description="Track institutional procurement follow-ups, tender renewals, delivery window adjustments, and quality claims."
        actions={
          can('crm.manage') && (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="h-10 px-4 rounded-xl bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-medium inline-flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Log Ticket / Follow-Up</span>
            </button>
          )
        }
      />

      <FeedbackBanner
        message={feedback?.msg || null}
        type={feedback?.type}
        onDismiss={() => setFeedback(null)}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <KPI
          label="Open Follow-Ups & Tickets"
          value={`${crmTickets.filter((t) => t.status !== 'Resolved').length}`}
          sublabel="Contract renewals & tender inquiries"
          tone="warning"
        />
        <KPI
          label="Resolved This Month"
          value={`${crmTickets.filter((t) => t.status === 'Resolved').length}`}
          sublabel="Average resolution < 6 hours"
          tone="positive"
        />
        <KPI
          label="Institutional Retention Rate"
          value="98.5%"
          sublabel="Across school & hospital contracts"
          tone="positive"
        />
      </div>

      <div className="space-y-4">
        {crmTickets.map((t) => (
          <Card key={t.id}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono-tabular text-xs font-semibold text-[#1F6A37] dark:text-[#4EB462]">
                    {t.ticketNumber}
                  </span>
                  <StatusBadge status={t.status} />
                  <span className="text-xs text-[var(--text-secondary)]">
                    {t.type} · Priority: <strong>{t.priority}</strong>
                  </span>
                </div>
                <h3 className="font-heading text-base font-semibold">
                  {t.customerName}
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  {t.summary}
                </p>
                <div className="text-[11px] text-[var(--text-secondary)]">
                  Assigned to: {t.assignedTo} · Target Date: {t.dueDate}
                </div>
              </div>

              {t.status !== 'Resolved' && can('crm.manage') && (
                <button
                  type="button"
                  onClick={async () => {
                    const res = await resolveCrmTicket(t.id);
                    setFeedback({
                      msg: res.message,
                      type: res.ok ? 'success' : 'error',
                    });
                  }}
                  className="px-3.5 py-2 rounded-xl bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Mark Resolved</span>
                </button>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Log Institutional CRM Follow-Up or Support Ticket"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1">
              Customer / Institution
            </label>
            <select
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Category</label>
              <select
                value={type}
                onChange={(e) =>
                  setType(e.target.value as CrmTicketRecord['type'])
                }
                className="w-full h-10 px-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs"
              >
                <option value="Contract Renewal">Contract Renewal</option>
                <option value="Tender Pricing Inquiry">
                  Tender Pricing Inquiry
                </option>
                <option value="Delivery Window Change">
                  Delivery Window Change
                </option>
                <option value="Quality Claim">Quality Claim</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) =>
                  setPriority(e.target.value as CrmTicketRecord['priority'])
                }
                className="w-full h-10 px-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs"
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Normal">Normal</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">
              Action Summary / Notes
            </label>
            <input
              type="text"
              required
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Describe follow-up objective or client request..."
              className="w-full h-10 px-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="px-4 py-2 rounded-xl border border-[var(--border-subtle)] text-xs font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-[#1F6A37] text-white text-xs font-medium cursor-pointer"
            >
              Save CRM Record
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

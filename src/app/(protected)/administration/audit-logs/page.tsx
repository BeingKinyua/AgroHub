'use client';

import React, { useMemo, useState } from 'react';
import { ArrowRight, Download, FileSpreadsheet, Search } from 'lucide-react';
import { useBos } from '@/lib/services/bos-context';
import {
  Avatar,
  Card,
  EmptyState,
  FilterBar,
  KPI,
  PageHeader,
} from '@/components/ui/primitives';

export default function AuditLogsAdministrationPage() {
  const { auditLogs } = useBos();
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('All');

  const modules = useMemo(() => {
    const set = new Set(auditLogs.map((l) => l.module));
    return ['All', ...Array.from(set)];
  }, [auditLogs]);

  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      const matchesModule =
        moduleFilter === 'All' || log.module === moduleFilter;
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        log.actorName.toLowerCase().includes(q) ||
        log.actorEmail.toLowerCase().includes(q) ||
        log.entity.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.beforeValue.toLowerCase().includes(q) ||
        log.afterValue.toLowerCase().includes(q);
      return matchesModule && matchesSearch;
    });
  }, [auditLogs, moduleFilter, search]);

  const handleExportCsv = () => {
    const rows = [
      'Timestamp,Actor Name,Actor Role,Actor Email,Module,Entity,Action,Before State,After State',
      ...filteredLogs.map(
        (l) =>
          `"${l.timestamp}","${l.actorName}","${l.actorRole}","${l.actorEmail}","${l.module}","${l.entity}","${l.action}","${l.beforeValue}","${l.afterValue}"`
      ),
    ].join('\n');
    const blob = new Blob([rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'agro-deliveries-audit-trail.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: 'Workspace', href: '/dashboard' },
          { label: 'Administration' },
          { label: 'Audit Logs' },
        ]}
        kicker="IMMUTABLE GOVERNANCE & COMPLIANCE LEDGER"
        title="System Security & Operational Audit Trail"
        description="Every price change, FEFO stock adjustment, approval decision, payment reconciliation, and RBAC permission change is recorded with before/after values."
        actions={
          <button
            type="button"
            onClick={handleExportCsv}
            className="h-10 px-4 rounded-full bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-medium inline-flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Audit CSV</span>
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPI
          label="Total Logged Events"
          value={`${auditLogs.length} Entries`}
          sublabel="Append-only PostgreSQL audit table"
          tone="positive"
        />
        <KPI
          label="Identity & RBAC Events"
          value={`${
            auditLogs.filter(
              (l) => l.module === 'Administration' || l.module === 'Profile'
            ).length
          }`}
          sublabel="Onboarding, status & role updates"
          tone="neutral"
        />
        <KPI
          label="Approval & Pricing Events"
          value={`${
            auditLogs.filter(
              (l) => l.module === 'Approvals' || l.module === 'Products'
            ).length
          }`}
          sublabel="Price overrides & PO sign-offs"
          tone="positive"
        />
        <KPI
          label="Inventory & Wastage Logs"
          value={`${
            auditLogs.filter((l) => l.module === 'Inventory').length
          }`}
          sublabel="FEFO batch adjustments & spoilage"
          tone="warning"
        />
      </div>

      <FilterBar
        activeFilterCount={moduleFilter !== 'All' ? 1 : 0}
        mobileDrawerContent={
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Filter by Module
            </label>
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs"
            >
              {modules.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        }
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search actor, entity ID, action, before/after state..."
              className="w-full h-10 pl-9 pr-3.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#4EB462]"
            />
          </div>

          <div className="hidden sm:flex flex-wrap items-center gap-1.5">
            {modules.map((mod) => (
              <button
                key={mod}
                type="button"
                onClick={() => setModuleFilter(mod)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                  moduleFilter === mod
                    ? 'bg-[#1F6A37] text-white'
                    : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {mod}
              </button>
            ))}
          </div>
        </div>
      </FilterBar>

      {filteredLogs.length === 0 ? (
        <EmptyState
          title="No audit events matched your filter"
          description="Clear the search or module filter to inspect the complete system audit trail."
        />
      ) : (
        <Card padding="p-0" className="overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]/50 text-[11px] font-semibold text-[var(--text-secondary)]">
                  <th className="py-3.5 px-4">Timestamp (EAT)</th>
                  <th className="py-3.5 px-4">Operator & Role</th>
                  <th className="py-3.5 px-4">Module & Entity</th>
                  <th className="py-3.5 px-4">Governed Action</th>
                  <th className="py-3.5 px-4">State Transition (Before → After)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] text-xs">
                {filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-[var(--bg-canvas)]/60 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono-tabular text-[var(--text-secondary)] whitespace-nowrap">
                      {log.timestamp}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <Avatar fullName={log.actorName} size="sm" />
                        <div>
                          <div className="font-semibold text-[var(--text-primary)]">
                            {log.actorName}
                          </div>
                          <div className="text-[11px] text-[var(--text-secondary)]">
                            {log.actorRole}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[11px] font-medium">
                        {log.module}
                      </span>
                      <div className="font-mono-tabular font-semibold text-[#1F6A37] dark:text-[#4EB462] mt-1">
                        {log.entity}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-[var(--text-primary)]">
                      {log.action}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="inline-flex flex-wrap items-center gap-1.5 font-mono-tabular text-[11px]">
                        <span className="px-2 py-0.5 rounded bg-[var(--bg-canvas)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                          {log.beforeValue}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                        <span className="px-2 py-0.5 rounded bg-[#E5EFE6] dark:bg-[#142B1B] text-[#12512C] dark:text-[#4EB462] font-semibold">
                          {log.afterValue}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden divide-y divide-[var(--border-subtle)]">
            {filteredLogs.map((log) => (
              <div key={log.id} className="p-4 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
                  <span className="font-mono-tabular">{log.timestamp}</span>
                  <span className="px-2 py-0.5 rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)]">
                    {log.module}
                  </span>
                </div>
                <div className="text-xs font-semibold">
                  {log.action} ·{' '}
                  <span className="font-mono-tabular text-[#1F6A37] dark:text-[#4EB462]">
                    {log.entity}
                  </span>
                </div>
                <div className="text-[11px] text-[var(--text-secondary)]">
                  Actor: <strong>{log.actorName}</strong> ({log.actorRole})
                </div>
                <div className="text-[11px] font-mono-tabular pt-1">
                  {log.beforeValue} →{' '}
                  <strong className="text-[#1F6A37] dark:text-[#4EB462]">
                    {log.afterValue}
                  </strong>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

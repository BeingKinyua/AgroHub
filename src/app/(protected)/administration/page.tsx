'use client';

import React from 'react';
import Link from 'next/link';
import {
  FileSpreadsheet,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Users,
  ArrowRight,
  Lock,
} from 'lucide-react';
import { useBos } from '@/lib/services/bos-context';
import { Card, KPI, PageHeader } from '@/components/ui/primitives';

export default function AdministrationOverviewPage() {
  const { users, roles, auditLogs, can } = useBos();

  const activeUsersCount = users.filter((u) => u.status === 'Active').length;
  const adminUsersCount = users.filter(
    (u) => u.roleId === 'admin' || u.roleId === 'super_admin'
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="ENTERPRISE ACCESS GOVERNANCE & AUDIT"
        title="Administration & System Governance"
        description="Govern system operators, multi-role RBAC authorization policies, permission matrix, and immutable compliance audit trails."
      />

      {/* Governance Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KPI
          label="Provisioned Operators"
          value={`${users.length} Users`}
          sublabel={`${activeUsersCount} active on shift`}
          tone="positive"
        />
        <KPI
          label="RBAC Roles Defined"
          value={`${roles.length} Roles`}
          sublabel="Granular permission sets"
          tone="neutral"
        />
        <KPI
          label="Privileged Administrators"
          value={`${adminUsersCount} Admins`}
          sublabel="Super Admin & Operations Admin"
          tone="warning"
        />
        <KPI
          label="Audit Log Entries"
          value={`${auditLogs.length} Events`}
          sublabel="Cryptographically signed events"
          tone="positive"
        />
      </div>

      {/* Governance Modules */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card padding="p-5" variant="raised" className="flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-[#E5EFE6] dark:bg-[#142B1B] text-[#1F6A37] dark:text-[#4EB462] flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading text-sm font-semibold text-[var(--text-primary)]">
                  Operator Management
                </h3>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  {users.length} registered system accounts
                </p>
              </div>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Provision, invite, and maintain operational accounts across AgroHub logistics, cold storage, finance, and procurement desks.
            </p>
          </div>

          <div className="mt-5 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between">
            <span className="text-[11px] font-mono-tabular text-[var(--text-secondary)]">
              {activeUsersCount} Active
            </span>
            <Link
              href="/administration/users"
              className="h-8 px-4 rounded-full bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Manage Users</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </Card>

        <Card padding="p-5" variant="raised" className="flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-[#E5EFE6] dark:bg-[#142B1B] text-[#1F6A37] dark:text-[#4EB462] flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading text-sm font-semibold text-[var(--text-primary)]">
                  RBAC Roles Matrix
                </h3>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  {roles.length} system authorization roles
                </p>
              </div>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Configure fine-grained permissions for Executive, Storekeeper, Finance Clerk, Logistics Dispatcher, and Sales Representatives.
            </p>
          </div>

          <div className="mt-5 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between">
            <span className="text-[11px] font-mono-tabular text-[var(--text-secondary)]">
              Strict Least Privilege
            </span>
            <Link
              href="/administration/roles"
              className="h-8 px-4 rounded-full bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Inspect Roles</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </Card>

        <Card padding="p-5" variant="raised" className="flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-[#E5EFE6] dark:bg-[#142B1B] text-[#1F6A37] dark:text-[#4EB462] flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading text-sm font-semibold text-[var(--text-primary)]">
                  Compliance Audit Trail
                </h3>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Immutable operational activity logs
                </p>
              </div>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Complete chronological audit trail capturing order approvals, pricing overrides, stock movements, and financial reconciliations.
            </p>
          </div>

          <div className="mt-5 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between">
            <span className="text-[11px] font-mono-tabular text-[var(--text-secondary)]">
              Real-time Capture
            </span>
            <Link
              href="/administration/audit-logs"
              className="h-8 px-4 rounded-full bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>View Audit Logs</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

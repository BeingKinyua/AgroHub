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
        title="Administration"
        description="Manage workspace users, role permissions, and audit logs."
      />

      {/* Governance Summary Metrics */}
      <div className="bento-metrics">
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
          sublabel="Recorded workspace activity"
          tone="positive"
        />
      </div>

      {/* Governance Modules */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card padding="p-5" variant="raised" className="flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full ui-tone-success flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="ui-section-title">
                  Operator Management
                </h2>
                <p className="ui-meta">
                  {users.length} registered system accounts
                </p>
              </div>
            </div>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              Provision, invite, and maintain operational accounts across AgroHub logistics, cold storage, finance, and procurement desks.
            </p>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-subtle)] pt-3">
            <span className="ui-meta font-mono-tabular">
              {activeUsersCount} Active
            </span>
            <Link
              href="/administration/users"
              className="ui-button ui-button-secondary ui-button-compact"
            >
              <span>Manage Users</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </Card>

        <Card padding="p-5" variant="raised" className="flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full ui-tone-success flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h2 className="ui-section-title">
                  RBAC Roles Matrix
                </h2>
                <p className="ui-meta">
                  {roles.length} system authorization roles
                </p>
              </div>
            </div>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              Configure fine-grained permissions for Executive, Storekeeper, Finance Clerk, Logistics Dispatcher, and Sales Representatives.
            </p>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-subtle)] pt-3">
            <span className="ui-meta font-mono-tabular">
              Role-based access
            </span>
            <Link
              href="/administration/roles"
              className="ui-button ui-button-secondary ui-button-compact"
            >
              <span>Inspect Roles</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </Card>

        <Card padding="p-5" variant="raised" className="flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full ui-tone-success flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h2 className="ui-section-title">
                  Compliance Audit Trail
                </h2>
                <p className="ui-meta">
                  Recorded actions and changes
                </p>
              </div>
            </div>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              Review order approvals, pricing overrides, stock movements, and financial reconciliations.
            </p>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-subtle)] pt-3">
            <span className="ui-meta font-mono-tabular">
              Recorded events
            </span>
            <Link
              href="/administration/audit-logs"
              className="ui-button ui-button-secondary ui-button-compact"
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

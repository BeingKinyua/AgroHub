'use client';

import React, { useMemo, useState } from 'react';
import { CheckCircle2, Lock, Shield } from 'lucide-react';
import { useBos } from '@/lib/services/bos-context';
import { ALL_PERMISSIONS } from '@/lib/permissions/rbac';
import {
  Card,
  FeedbackBanner,
  KPI,
  PageHeader,
} from '@/components/ui/primitives';
import { PermissionKey } from '@/types/domain/bos';

export default function RolesAdministrationPage() {
  const { roles, users, can, toggleRolePermission } = useBos();
  const [selectedRoleId, setSelectedRoleId] = useState<string>(
    roles[0]?.id || 'executive'
  );
  const [feedback, setFeedback] = useState<{
    msg: string;
    type: 'success' | 'error';
  } | null>(null);

  const selectedRole = useMemo(
    () => roles.find((r) => r.id === selectedRoleId) || roles[0],
    [roles, selectedRoleId]
  );

  const permissionsByModule = useMemo(() => {
    const map: Record<string, typeof ALL_PERMISSIONS> = {};
    ALL_PERMISSIONS.forEach((p) => {
      if (!map[p.module]) map[p.module] = [];
      map[p.module].push(p);
    });
    return map;
  }, []);

  const handleToggle = async (permKey: PermissionKey) => {
    if (!selectedRole) return;
    const res = await toggleRolePermission(selectedRole.id, permKey);
    setFeedback({ msg: res.message, type: res.ok ? 'success' : 'error' });
  };

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: 'Workspace', href: '/dashboard' },
          { label: 'Administration' },
          { label: 'RBAC Role Matrix' },
        ]}
        kicker="ROLE-BASED ACCESS CONTROL & PERMISSION GOVERNANCE"
        title="Roles & Granular Permission Matrix"
        description="Inspect and govern the 9 internal operational roles across Agro-Deliveries Kenya. All UI views, navigation items, and server actions verify these exact permission keys."
      />

      <FeedbackBanner
        message={feedback?.msg || null}
        type={feedback?.type}
        onDismiss={() => setFeedback(null)}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <KPI
          label="Configured Internal Roles"
          value={`${roles.length} Roles`}
          sublabel="Executive, Operations, Sales, Procurement, Warehouse, Finance, Driver, Admin"
          tone="positive"
        />
        <KPI
          label="Granular Permission Keys"
          value={`${ALL_PERMISSIONS.length} Keys`}
          sublabel="Enforced in UI, API routes, and PostgreSQL RLS"
          tone="positive"
        />
        <KPI
          label="Selected Role Scope"
          value={`${selectedRole?.permissions.length || 0} Granted`}
          sublabel={selectedRole?.name || ''}
          tone="neutral"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Role Selector List */}
        <div className="lg:col-span-4 space-y-2.5">
          {roles.map((r) => {
            const active = r.id === selectedRole?.id;
            const assignedCount = users.filter((u) => u.roleId === r.id).length;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelectedRoleId(r.id)}
                className={`w-full text-left p-4 rounded-full border transition-all cursor-pointer ${
                  active
                    ? 'bg-[#142B1B] text-[#F4F6F3] border-[#4EB462]/45 shadow-[var(--shadow-md)]'
                    : 'bg-[var(--bg-card)] text-[var(--text-primary)] border-[var(--border-subtle)] hover:border-[#4EB462]/40'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-heading text-sm font-semibold">
                    {r.name}
                  </span>
                  <span
                    className={`font-mono-tabular text-[11px] px-2 py-0.5 rounded-md ${
                      active
                        ? 'bg-[#1F6A37]/50 text-[#4EB462]'
                        : 'bg-[var(--bg-canvas)] text-[#1F6A37] dark:text-[#4EB462]'
                    }`}
                  >
                    {r.permissions.length} perms
                  </span>
                </div>
                <p
                  className={`text-xs mt-1 leading-relaxed ${
                    active ? 'text-[#A9BEAE]' : 'text-[var(--text-secondary)]'
                  }`}
                >
                  {r.description}
                </p>
                <div
                  className={`mt-2.5 pt-2 border-t flex items-center justify-between text-[11px] ${
                    active
                      ? 'border-white/10 text-[#A9BEAE]'
                      : 'border-[var(--border-subtle)] text-[var(--text-secondary)]'
                  }`}
                >
                  <span>{assignedCount} assigned operator(s)</span>
                  <span>Updated {r.lastModified || '2026-09-30'}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right: Interactive Permission Matrix */}
        <div className="lg:col-span-8">
          {selectedRole && (
            <Card variant="raised" className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border-subtle)]">
                <div>
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#1F6A37] dark:text-[#4EB462]" />
                    <h2 className="font-heading text-lg font-semibold text-[var(--text-primary)]">
                      {selectedRole.name} — Permission Matrix
                    </h2>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Default Command Focus: {selectedRole.defaultFocus}
                  </p>
                </div>

                {!can('administration.roles.manage') && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Read-Only (Requires Administrator)</span>
                  </span>
                )}
              </div>

              <div className="space-y-4">
                {Object.entries(permissionsByModule).map(
                  ([moduleName, perms]) => (
                    <div
                      key={moduleName}
                      className="p-4 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-heading text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)]">
                          {moduleName} Module
                        </span>
                        <span className="font-mono-tabular text-[11px] text-[var(--text-secondary)]">
                          {
                            perms.filter((p) =>
                              selectedRole.permissions.includes(p.key)
                            ).length
                          }{' '}
                          / {perms.length} enabled
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {perms.map((p) => {
                          const granted = selectedRole.permissions.includes(
                            p.key
                          );
                          const editable = can('administration.roles.manage');
                          return (
                            <button
                              key={p.key}
                              type="button"
                              disabled={!editable}
                              onClick={() => handleToggle(p.key)}
                              className={`px-4 py-3 rounded-full border text-left flex items-start justify-between gap-3 transition-colors ${
                                granted
                                  ? 'bg-[var(--bg-card)] border-[#4EB462]/45'
                                  : 'bg-[var(--bg-card)]/50 border-[var(--border-subtle)] opacity-70'
                              } ${
                                editable
                                  ? 'cursor-pointer hover:border-[#4EB462]'
                                  : 'cursor-default'
                              }`}
                            >
                              <div className="min-w-0">
                                <div className="font-mono-tabular text-xs font-semibold text-[var(--text-primary)] truncate">
                                  {p.key}
                                </div>
                                <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                                  {p.description}
                                </div>
                              </div>
                              <div className="shrink-0 mt-0.5">
                                {granted ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#E5EFE6] dark:bg-[#142B1B] text-[#1F6A37] dark:text-[#4EB462] text-[10px] font-semibold">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>Granted</span>
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded bg-[var(--bg-canvas)] text-[var(--text-secondary)] text-[10px]">
                                    Revoked
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

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
        title="Roles and permissions"
        description="Choose a role to review what its members can see or do in AgroHub."
      />

      <FeedbackBanner
        message={feedback?.msg || null}
        type={feedback?.type}
        onDismiss={() => setFeedback(null)}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <KPI
          label="Workspace roles"
          value={`${roles.length} Roles`}
          sublabel="Executive, Operations, Sales, Procurement, Warehouse, Finance, Driver, Admin"
          tone="positive"
        />
        <KPI
          label="Available permissions"
          value={String(ALL_PERMISSIONS.length)}
          tone="positive"
        />
        <KPI
          label="Permissions granted"
          value={String(selectedRole?.permissions.length ?? 0)}
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
                aria-pressed={active}
                onClick={() => setSelectedRoleId(r.id)}
                className={`ui-button ui-button-secondary block w-full p-4 text-left font-normal ${active ? 'border-[var(--status-success-border)] bg-[var(--action-selected-bg)]' : ''}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-[var(--text-primary)]">
                    {r.name}
                  </span>
                  <span
                    className="ui-badge ui-tone-neutral shrink-0 tabular-nums"
                  >
                    {r.permissions.length} permissions
                  </span>
                </div>
                <p
                  className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]"
                >
                  {r.description}
                </p>
                <div
                  className="ui-meta mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-subtle)] pt-2"
                >
                  <span>{assignedCount} {assignedCount === 1 ? 'member' : 'members'}</span>
                  {r.lastModified && <span>Updated {r.lastModified}</span>}
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
                    <Shield className="w-4 h-4 text-[var(--brand-accent)]" />
                    <h2 className="ui-section-title">
                      {selectedRole.name}
                    </h2>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                    {selectedRole.defaultFocus}
                  </p>
                </div>

                {!can('administration.roles.manage') && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">
                    <Lock className="w-3.5 h-3.5" />
                    <span>View only</span>
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
                        <span className="ui-section-title">
                          {moduleName} Module
                        </span>
                        <span className="font-mono-tabular ui-meta">
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
                              aria-pressed={granted}
                              aria-label={p.description}
                              disabled={!editable}
                              onClick={() => handleToggle(p.key)}
                              className={`ui-button ui-button-secondary w-full items-start justify-between gap-3 p-3 text-left font-normal disabled:opacity-100 ${granted ? 'border-[var(--status-success-border)]' : ''}`}
                            >
                              <div className="min-w-0">
                                <div className="text-sm font-semibold leading-snug text-[var(--text-primary)]">
                                  {p.description}
                                </div>
                                <div className="ui-meta mt-0.5 break-all">
                                  {p.key}
                                </div>
                              </div>
                              <div className="shrink-0 mt-0.5">
                                {granted ? (
                                  <span className="ui-badge ui-tone-success">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>Granted</span>
                                  </span>
                                ) : (
                                  <span className="ui-badge ui-tone-neutral">
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

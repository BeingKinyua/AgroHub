'use client';

import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Lock,
  Plus,
  Search,
  ShieldAlert,
  UserCheck,
  UserPlus,
  XCircle,
} from 'lucide-react';
import { useBos } from '@/lib/services/bos-context';
import {
  Avatar,
  Card,
  ConfirmDialog,
  EmptyState,
  FeedbackBanner,
  FilterBar,
  KPI,
  Modal,
  PageHeader,
  StatusBadge,
} from '@/components/ui/primitives';
import { AccountStatus, InternalUser } from '@/types/domain/bos';

const STATUS_FILTERS: ('All' | AccountStatus)[] = [
  'All',
  'Active',
  'Invited',
  'Suspended',
  'Disabled',
];

export default function UsersAdministrationPage() {
  const {
    users,
    roles,
    can,
    inviteInternalMember,
    updateUserAccountStatus,
  } = useBos();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] =
    useState<'All' | AccountStatus>('All');
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [inviteOpen, setInviteOpen] = useState(false);

  // Invite form state
  const [fullName, setFullName] = useState('');
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState(roles[2]?.id || 'sales_rep');
  const [department, setDepartment] = useState('Institutional Sales & Tenders');
  const [branch, setBranch] = useState('Nairobi HQ (Industrial Area)');
  const [phone, setPhone] = useState('+254 722 000 000');

  // Governance Confirm Dialog state
  const [pendingAction, setPendingAction] = useState<{
    user: InternalUser;
    nextStatus: AccountStatus;
  } | null>(null);

  const [feedback, setFeedback] = useState<{
    msg: string;
    type: 'success' | 'error';
  } | null>(null);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesStatus =
        statusFilter === 'All' || u.status === statusFilter;
      const matchesRole = roleFilter === 'All' || u.roleId === roleFilter;
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        u.fullName.toLowerCase().includes(q) ||
        u.nickname.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.department.toLowerCase().includes(q) ||
        u.branch.toLowerCase().includes(q);
      return matchesStatus && matchesRole && matchesSearch;
    });
  }, [users, statusFilter, roleFilter, search]);

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await inviteInternalMember({
      fullName,
      nickname: nickname || fullName.split(' ')[0],
      email,
      roleId,
      department,
      branch,
      phone,
    });
    setFeedback({ msg: res.message, type: res.ok ? 'success' : 'error' });
    if (res.ok) {
      setInviteOpen(false);
      setFullName('');
      setNickname('');
      setEmail('');
    }
  };

  return (
    <div>
      <PageHeader
        title="Workspace users"
        description="Invite employees, assign roles, and manage account access."
        actions={
          can('administration.users.create') && (
            <button
              type="button"
              onClick={() => setInviteOpen(true)}
              className="ui-button ui-button-primary"
            >
              <UserPlus className="w-4 h-4" />
              <span>Invite Internal Member</span>
            </button>
          )
        }
      />

      <FeedbackBanner
        message={feedback?.msg || null}
        type={feedback?.type}
        onDismiss={() => setFeedback(null)}
      />

      {/* KPI Row */}
      <div className="bento-metrics mb-6">
        <KPI
          label="Total Provisioned Accounts"
          value={`${users.length} Operators`}
          tone="positive"
        />
        <KPI
          label="Active Workspace Operators"
          value={`${users.filter((u) => u.status === 'Active').length} Active`}
          sublabel="Authorized for BOS operations"
          tone="positive"
        />
        <KPI
          label="Pending Invitations"
          value={`${users.filter((u) => u.status === 'Invited').length} Invited`}
          sublabel="Awaiting first credential sign-in"
          tone="neutral"
        />
        <KPI
          label="Suspended / Disabled"
          value={`${
            users.filter(
              (u) => u.status === 'Suspended' || u.status === 'Disabled'
            ).length
          } Restricted`}
          sublabel="Cannot sign in to the workspace"
          tone="warning"
        />
      </div>

      {/* Filter Bar */}
      <FilterBar
        activeFilterCount={
          (statusFilter !== 'All' ? 1 : 0) + (roleFilter !== 'All' ? 1 : 0)
        }
        mobileDrawerContent={
          <div className="space-y-3">
            <div>
              <label htmlFor="administration/users-status" className="ui-label block mb-1">
                Account State
              </label>
              <select id="administration/users-status"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as 'All' | AccountStatus)
                }
                className="ui-field w-full"
              >
                {STATUS_FILTERS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="administration/users-role-filter" className="ui-label block mb-1">
                RBAC Role
              </label>
              <select id="administration/users-role-filter"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="ui-field w-full"
              >
                <option value="All">All Roles</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        }
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none w-4 h-4 text-[var(--text-secondary)] absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              type="search"
              aria-label="Search workspace users"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search operators by name, @nickname, work email, branch..."
              className="ui-field w-full pl-9 pr-3.5"
            />
          </div>

          <div className="hidden sm:flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap items-center gap-1 rounded-lg bg-[var(--bg-subtle)] p-1">
              {STATUS_FILTERS.map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  aria-pressed={statusFilter === st}
                  className="ui-tab whitespace-nowrap"
                >
                  {st}
                </button>
              ))}
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              aria-label="Filter by Role"
              className="ui-field"
            >
              <option value="All">All RBAC Roles</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </FilterBar>

      {filteredUsers.length === 0 ? (
        <EmptyState
          title="No internal operators matched your filter"
          description="Adjust your search query or account status filter to view directory members."
        />
      ) : (
        <Card padding="p-0" className="overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="ui-table w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-subtle)]">
                  <th className="py-3.5 px-4">Operator Identity</th>
                  <th className="py-3.5 px-4">RBAC Role</th>
                  <th className="py-3.5 px-4">Department & Hub Branch</th>
                  <th className="py-3.5 px-4">Onboarded By & Activity</th>
                  <th className="py-3.5 px-4">Account State</th>
                  <th className="py-3.5 px-4 text-right">
                    Governance Controls
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {filteredUsers.map((u) => (
                  <tr
                    key={u.id}
                    className="hover:bg-[var(--bg-canvas)]/60 transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar
                          fullName={u.fullName}
                          avatarUrl={u.avatarUrl}
                          size="md"
                        />
                        <div>
                          <div className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                            <span>{u.fullName}</span>
                            <span className="font-mono-tabular text-xs text-[var(--brand-accent)]">
                              @{u.nickname}
                            </span>
                          </div>
                          <div className="font-mono-tabular ui-meta">
                            {u.email} · {u.phone}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-[var(--text-primary)]">
                        {u.roleName}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div>{u.department}</div>
                      <div className="ui-meta">
                        {u.branch}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="ui-meta">
                        By {u.invitedBy}
                      </div>
                      <div className="font-medium mt-0.5">{u.lastActiveAt}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={u.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {can('administration.users.edit') ? (
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {u.status !== 'Active' && (
                            <button
                              type="button"
                              onClick={() =>
                                setPendingAction({
                                  user: u,
                                  nextStatus: 'Active',
                                })
                              }
                              className="ui-button ui-button-primary ui-button-compact"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Activate</span>
                            </button>
                          )}
                          {u.status !== 'Suspended' && (
                            <button
                              type="button"
                              onClick={() =>
                                setPendingAction({
                                  user: u,
                                  nextStatus: 'Suspended',
                                })
                              }
                              className="ui-button ui-button-secondary ui-button-compact hover:border-[var(--status-warning-border)] hover:bg-[var(--status-warning-bg)] hover:text-[var(--status-warning-fg)]"
                            >
                              Suspend
                            </button>
                          )}
                          {u.status !== 'Disabled' && (
                            <button
                              type="button"
                              onClick={() =>
                                setPendingAction({
                                  user: u,
                                  nextStatus: 'Disabled',
                                })
                              }
                              className="ui-button ui-button-danger ui-button-compact"
                            >
                              Disable
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="ui-meta inline-flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          <span>Read-only</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Operator Cards */}
          <div className="md:hidden divide-y divide-[var(--border-subtle)]">
            {filteredUsers.map((u) => (
              <div key={u.id} className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar
                      fullName={u.fullName}
                      avatarUrl={u.avatarUrl}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold truncate">
                        {u.fullName} (@{u.nickname})
                      </div>
                      <div className="ui-meta truncate">
                        {u.email}
                      </div>
                    </div>
                  </div>
                  <StatusBadge status={u.status} />
                </div>

                <div className="ui-meta">
                  <strong>{u.roleName}</strong> · {u.department} ({u.branch})
                </div>

                {can('administration.users.edit') && (
                  <div className="flex items-center gap-2 pt-1">
                    {u.status !== 'Active' && (
                      <button
                        type="button"
                        onClick={() =>
                          setPendingAction({ user: u, nextStatus: 'Active' })
                        }
                        className="ui-button ui-button-primary ui-button-compact"
                      >
                        Activate
                      </button>
                    )}
                    {u.status !== 'Suspended' && (
                      <button
                        type="button"
                        onClick={() =>
                          setPendingAction({
                            user: u,
                            nextStatus: 'Suspended',
                          })
                        }
                        className="ui-button ui-button-secondary ui-button-compact hover:border-[var(--status-warning-border)] hover:bg-[var(--status-warning-bg)] hover:text-[var(--status-warning-fg)]"
                      >
                        Suspend
                      </button>
                    )}
                    {u.status !== 'Disabled' && (
                      <button
                        type="button"
                        onClick={() =>
                          setPendingAction({
                            user: u,
                            nextStatus: 'Disabled',
                          })
                        }
                        className="ui-button ui-button-danger ui-button-compact"
                      >
                        Disable
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Administrator Invite Member Modal */}
      <Modal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invite user"
        subtitle="Enter the employee’s work details and choose their starting role."
      >
        <form onSubmit={handleInviteSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="administration/users-name" className="ui-label block mb-1">
                Full Name
              </label>
              <input id="administration/users-name"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g., Esther Nyambura"
                className="ui-field w-full"
              />
            </div>
            <div>
              <label htmlFor="administration/users-nickname" className="ui-label block mb-1">
                Workspace Nickname
              </label>
              <input id="administration/users-nickname"
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="e.g., Esther"
                className="ui-field w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="administration/users-email" className="ui-label block mb-1">
                Work Email
              </label>
              <input id="administration/users-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.nyambura@agrodeliveries.co.ke"
                className="ui-field w-full"
              />
            </div>
            <div>
              <label htmlFor="administration/users-phone" className="ui-label block mb-1">
                Phone Number (KE)
              </label>
              <input id="administration/users-phone"
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="ui-field w-full font-mono-tabular"
              />
            </div>
          </div>

          <div>
            <label htmlFor="administration/users-role" className="ui-label block mb-1">
              Assign Internal RBAC Role
            </label>
            <select id="administration/users-role"
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              className="ui-field w-full"
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.permissions.length} permissions)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="administration/users-department" className="ui-label block mb-1">
                Department
              </label>
              <input id="administration/users-department"
                type="text"
                required
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="ui-field w-full"
              />
            </div>
            <div>
              <label htmlFor="administration/users-branch" className="ui-label block mb-1">
                Assigned Hub Branch
              </label>
              <select id="administration/users-branch"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="ui-field w-full"
              >
                <option value="Nairobi HQ (Industrial Area)">
                  Nairobi HQ (Industrial Area)
                </option>
                <option value="Nairobi Cold Hub A">Nairobi Cold Hub A</option>
                <option value="Embakasi Dry Bulk B">Embakasi Dry Bulk B</option>
                <option value="Westlands Cross-Dock C">
                  Westlands Cross-Dock C
                </option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setInviteOpen(false)}
              className="ui-button ui-button-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="ui-button ui-button-primary"
            >
              <Plus className="w-4 h-4" />
              <span>Send Workspace Invitation</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Account Status Change Dialog */}
      <ConfirmDialog
        open={Boolean(pendingAction)}
        onClose={() => setPendingAction(null)}
        title={`Set Account Status to ${pendingAction?.nextStatus}`}
        affectedItem={
          pendingAction
            ? `${pendingAction.user.fullName} (${pendingAction.user.email}) — ${pendingAction.user.roleName}`
            : ''
        }
        consequence={
          pendingAction?.nextStatus === 'Active'
            ? 'Activating this account restores full RBAC workspace access and allows the operator to authenticate immediately.'
            : 'Suspending or disabling this account immediately revokes workspace access at the authentication gateway and PostgreSQL Row Level Security layer.'
        }
        confirmLabel={`Confirm ${pendingAction?.nextStatus}`}
        destructive={pendingAction?.nextStatus !== 'Active'}
        onConfirm={async () => {
          if (!pendingAction) return;
          const res = await updateUserAccountStatus(
            pendingAction.user.id,
            pendingAction.nextStatus
          );
          setFeedback({
            msg: res.message,
            type: res.ok ? 'success' : 'error',
          });
        }}
      />
    </div>
  );
}

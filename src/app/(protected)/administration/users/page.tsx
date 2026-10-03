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
        breadcrumbs={[
          { label: 'Workspace', href: '/dashboard' },
          { label: 'Administration' },
          { label: 'Internal Operators' },
        ]}
        kicker="ADMINISTRATOR-CONTROLLED IDENTITY GOVERNANCE"
        title="Internal Employee Directory & Onboarding"
        description="Public registration is disabled. Only authorized Administrators may invite internal operators, assign RBAC roles, or transition accounts between Active, Suspended, and Disabled states."
        actions={
          can('administration.users.create') && (
            <button
              type="button"
              onClick={() => setInviteOpen(true)}
              className="h-10 px-4 rounded-full bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-medium inline-flex items-center gap-2 transition-colors cursor-pointer"
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPI
          label="Total Provisioned Accounts"
          value={`${users.length} Operators`}
          sublabel="Across 9 governed RBAC roles"
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
          sublabel="Blocked at authentication & RLS layer"
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
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Account State
              </label>
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as 'All' | AccountStatus)
                }
                className="w-full h-10 px-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs"
              >
                {STATUS_FILTERS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                RBAC Role
              </label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs"
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
            <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search operators by name, @nickname, work email, branch..."
              className="w-full h-10 pl-9 pr-3.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#4EB462]"
            />
          </div>

          <div className="hidden sm:flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 rounded-full bg-[var(--bg-canvas)]">
              {STATUS_FILTERS.map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                    statusFilter === st
                      ? 'bg-[#1F6A37] text-white'
                      : 'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              aria-label="Filter by Role"
              className="h-9 px-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs"
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
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]/50 text-[11px] font-semibold text-[var(--text-secondary)]">
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
              <tbody className="divide-y divide-[var(--border-subtle)] text-xs">
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
                            <span className="font-mono-tabular text-[11px] text-[#1F6A37] dark:text-[#4EB462]">
                              @{u.nickname}
                            </span>
                          </div>
                          <div className="font-mono-tabular text-[11px] text-[var(--text-secondary)]">
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
                      <div className="text-[11px] text-[var(--text-secondary)]">
                        {u.branch}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-[11px] text-[var(--text-secondary)]">
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
                              className="px-3 py-1.5 rounded-full bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-medium inline-flex items-center gap-1 cursor-pointer"
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
                              className="px-3 py-1.5 rounded-full border border-amber-500/35 text-amber-800 dark:text-amber-300 hover:bg-amber-500/10 text-xs font-medium cursor-pointer"
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
                              className="px-3 py-1.5 rounded-full border border-red-500/30 text-red-700 dark:text-red-300 hover:bg-red-500/10 text-xs font-medium cursor-pointer"
                            >
                              Disable
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-[var(--text-secondary)] inline-flex items-center gap-1">
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
                      <div className="text-[11px] text-[var(--text-secondary)] truncate">
                        {u.email}
                      </div>
                    </div>
                  </div>
                  <StatusBadge status={u.status} />
                </div>

                <div className="text-[11px] text-[var(--text-secondary)]">
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
                        className="px-3 py-1.5 rounded-full bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-medium cursor-pointer"
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
                        className="px-3 py-1.5 rounded-full border border-amber-500/35 text-amber-800 dark:text-amber-300 hover:bg-amber-500/10 text-xs font-medium cursor-pointer"
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
                        className="px-3 py-1.5 rounded-full border border-red-500/30 text-red-700 dark:text-red-300 hover:bg-red-500/10 text-xs font-medium cursor-pointer"
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
        title="Invite New Internal Operator"
        subtitle="Dispatches an administrator-governed workspace invitation and assigns initial RBAC authority."
      >
        <form onSubmit={handleInviteSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g., Esther Nyambura"
                className="w-full h-10 px-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                Workspace Nickname
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="e.g., Esther"
                className="w-full h-10 px-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1">
                Work Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.nyambura@agrodeliveries.co.ke"
                className="w-full h-10 px-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                Phone Number (KE)
              </label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs font-mono-tabular"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">
              Assign Internal RBAC Role
            </label>
            <select
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs"
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
              <label className="block text-xs font-medium mb-1">
                Department
              </label>
              <input
                type="text"
                required
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                Assigned Hub Branch
              </label>
              <select
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs"
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
              className="h-10 px-4 rounded-full border border-[var(--border-subtle)] text-xs font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-10 px-4 rounded-full bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
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

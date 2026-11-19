'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  CheckCircle2,
  Clock,
  KeyRound,
  Mail,
  MapPin,
  Monitor,
  Moon,
  Phone,
  Save,
  Shield,
  Sparkles,
  Sun,
  UserCheck,
} from 'lucide-react';
import { useBos } from '@/lib/services/bos-context';
import { ALL_PERMISSIONS } from '@/lib/permissions/rbac';
import {
  Avatar,
  Card,
  FeedbackBanner,
  KPI,
  PageHeader,
  StatusBadge,
} from '@/components/ui/primitives';

export default function ProfilePage() {
  const {
    currentUser,
    activePermissions,
    roles,
    auditLogs,
    theme,
    setTheme,
    demoModeEnabled,
    setDemoModeEnabled,
    updateCurrentUserProfile,
  } = useBos();

  const [fullName, setFullName] = useState('');
  const [nickname, setNickname] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [branch, setBranch] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    setFullName(currentUser.fullName);
    setNickname(currentUser.nickname || currentUser.fullName.split(' ')[0]);
    setPhone(currentUser.phone);
    setDepartment(currentUser.department);
    setBranch(currentUser.branch);
  }, [currentUser]);

  const roleDetails = useMemo(() => {
    if (!currentUser) return null;
    return roles.find((r) => r.id === currentUser.roleId) || null;
  }, [currentUser, roles]);

  const groupedPermissions = useMemo(() => {
    const groups: Record<string, typeof ALL_PERMISSIONS> = {};
    ALL_PERMISSIONS.forEach((perm) => {
      if (activePermissions.includes(perm.key)) {
        if (!groups[perm.module]) groups[perm.module] = [];
        groups[perm.module].push(perm);
      }
    });
    return groups;
  }, [activePermissions]);

  const userAuditActivity = useMemo(() => {
    if (!currentUser) return [];
    return auditLogs
      .filter(
        (log) =>
          log.actorEmail.toLowerCase() === currentUser.email.toLowerCase() ||
          log.actorName.toLowerCase() === currentUser.fullName.toLowerCase()
      )
      .slice(0, 6);
  }, [auditLogs, currentUser]);

  if (!currentUser) return null;

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;
    updateCurrentUserProfile({
      fullName: fullName.trim(),
      nickname: nickname.trim() || fullName.trim().split(' ')[0],
      phone: phone.trim(),
      department: department.trim(),
      branch: branch.trim(),
    });
    setFeedback(
      'Operator profile identity, nickname, and branch assignment updated.'
    );
  };

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: 'Workspace', href: '/dashboard' },
          { label: 'Operator Profile' },
        ]}
        kicker="OPERATOR IDENTITY & RBAC AUTHORITY"
        title="My Operator Profile"
        description="Manage your internal operator identity, workspace nickname, assigned hub branch, and inspect your active RBAC permission scope."
        actions={
          <Link
            href="/settings"
            className="ui-button ui-button-secondary"
          >
            <span>Workspace Settings</span>
          </Link>
        }
      />

      <FeedbackBanner
        message={feedback}
        type="success"
        onDismiss={() => setFeedback(null)}
      />

      {/* Profile KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPI
          label="Assigned Operator Role"
          value={currentUser.roleName}
          sublabel={roleDetails?.defaultFocus || 'Governed BOS Role'}
          tone="positive"
        />
        <KPI
          label="Active RBAC Capabilities"
          value={`${activePermissions.length} / ${ALL_PERMISSIONS.length}`}
          sublabel={`Across ${Object.keys(groupedPermissions).length} authorized modules`}
          tone="positive"
        />
        <KPI
          label="Primary Operations Branch"
          value={currentUser.branch.split('(')[0].trim()}
          sublabel={currentUser.department}
          tone="neutral"
        />
        <KPI
          label="Account Governance State"
          value={currentUser.status}
          sublabel={`Onboarded by ${currentUser.invitedBy}`}
          tone="positive"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Operator Identity Card & Session Preferences */}
        <div className="lg:col-span-5 space-y-6">
          <Card variant="raised" className="space-y-5">
            <div className="flex items-start gap-4">
              <Avatar
                fullName={currentUser.fullName}
                avatarUrl={currentUser.avatarUrl}
                size="xl"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={currentUser.status} />
                  <span className="font-mono-tabular text-xs px-2 py-0.5 rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--brand-accent)]">
                    @{currentUser.nickname}
                  </span>
                </div>
                <h2 className="font-heading text-xl font-semibold text-[var(--text-primary)] mt-2">
                  {currentUser.fullName}
                </h2>
                <p className="text-xs text-[var(--text-secondary)]">
                  {currentUser.roleName} · {currentUser.department}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 p-4 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 text-[var(--text-secondary)]">
                  <Mail className="w-3.5 h-3.5 text-[var(--brand-accent)]" />
                  <span>Work Email</span>
                </span>
                <span className="font-mono-tabular font-medium text-[var(--text-primary)]">
                  {currentUser.email}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 text-[var(--text-secondary)]">
                  <Phone className="w-3.5 h-3.5 text-[var(--brand-accent)]" />
                  <span>Direct Phone</span>
                </span>
                <span className="font-mono-tabular font-medium text-[var(--text-primary)]">
                  {currentUser.phone}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 text-[var(--text-secondary)]">
                  <MapPin className="w-3.5 h-3.5 text-[var(--brand-accent)]" />
                  <span>Assigned Hub</span>
                </span>
                <span className="font-medium text-[var(--text-primary)]">
                  {currentUser.branch}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 text-[var(--text-secondary)]">
                  <UserCheck className="w-3.5 h-3.5 text-[var(--brand-accent)]" />
                  <span>Provisioned By</span>
                </span>
                <span className="font-medium text-[var(--text-primary)]">
                  {currentUser.invitedBy}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 text-[var(--text-secondary)]">
                  <Clock className="w-3.5 h-3.5 text-[var(--brand-accent)]" />
                  <span>Session Status</span>
                </span>
                <span className="font-medium text-[var(--brand-accent)]">
                  {currentUser.lastActiveAt}
                </span>
              </div>
            </div>

            {/* Edit Identity Form */}
            <form onSubmit={handleSaveProfile} className="space-y-4 pt-2">
              <div className="text-xs font-semibold text-[var(--text-primary)]">
                Update Operator Identity Details
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="profile-full-name" className="ui-label mb-1 block">
                    Full Name
                  </label>
                  <input id="profile-full-name"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="ui-field w-full"
                  />
                </div>
                <div>
                  <label htmlFor="profile-nickname" className="ui-label mb-1 block">
                    Display Nickname
                  </label>
                  <input id="profile-nickname"
                    type="text"
                    required
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="e.g., Wanjiku"
                    className="ui-field w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="profile-phone" className="ui-label mb-1 block">
                    Phone Number (KE)
                  </label>
                  <input id="profile-phone"
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="ui-field w-full font-mono-tabular"
                  />
                </div>
                <div>
                  <label htmlFor="profile-department" className="ui-label mb-1 block">
                    Department
                  </label>
                  <input id="profile-department"
                    type="text"
                    required
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="ui-field w-full"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="profile-branch" className="ui-label mb-1 block">
                  Assigned Distribution Hub / Branch
                </label>
                <select id="profile-branch"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="ui-field w-full"
                >
                  <option value="Nairobi HQ (Industrial Area)">
                    Nairobi HQ (Industrial Area)
                  </option>
                  <option value="Nairobi Cold Hub A">Nairobi Cold Hub A</option>
                  <option value="Embakasi Dry Bulk B">
                    Embakasi Dry Bulk B
                  </option>
                  <option value="Westlands Cross-Dock C">
                    Westlands Cross-Dock C
                  </option>
                </select>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                <Link
                  href="/reset-password"
                  className="ui-button ui-button-ghost text-[var(--brand-accent)]"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Change Password</span>
                </Link>
                <button
                  type="submit"
                  className="ui-button ui-button-primary"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Profile Changes</span>
                </button>
              </div>
            </form>
          </Card>

          {/* Interface & Appearance Preferences */}
          <Card variant="raised" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="ui-section-title">
                  Workspace Appearance Preferences
                </h3>
                <p className="ui-meta mt-0.5">
                  Personalize theme contrast and OS system synchronization
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-[var(--text-primary)]">
                  Color Theme Mode
                </div>
                <div className="ui-meta">
                  Switch between light operational canvas and dark forest mode
                </div>
              </div>
              <div
                role="group"
                aria-label="Theme Mode"
                className="flex flex-wrap gap-1"
              >
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  aria-pressed={theme === 'light'}
                  className="ui-tab"
                >
                  <Sun className="w-3.5 h-3.5" />
                  <span>Light</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  aria-pressed={theme === 'dark'}
                  className="ui-tab"
                >
                  <Moon className="w-3.5 h-3.5" />
                  <span>Dark</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('system')}
                  aria-pressed={theme === 'system'}
                  className="ui-tab"
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>System</span>
                </button>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Active RBAC Permissions Matrix & Operator Audit Log */}
        <div className="lg:col-span-7 space-y-6">
          <Card variant="raised" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[var(--border-subtle)]">
              <div>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[var(--brand-accent)]" />
                  <h3 className="ui-section-title">
                    Granted RBAC Authority Matrix ({currentUser.roleName})
                  </h3>
                </div>
                <p className="ui-meta mt-0.5">
                  {roleDetails?.description}
                </p>
              </div>
              <span className="font-mono-tabular text-xs font-semibold px-2.5 py-1 rounded-lg bg-[var(--status-success-bg)] text-[var(--status-success-fg)] shrink-0">
                {activePermissions.length} Permissions Active
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pr-1">
              {Object.entries(groupedPermissions).map(([moduleName, perms]) => (
                <div
                  key={moduleName}
                  className="p-3.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-heading text-xs font-semibold text-[var(--text-primary)]">
                      {moduleName}
                    </span>
                    <span className="font-mono-tabular text-xs text-[var(--brand-accent)]">
                      {perms.length} granted
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {perms.map((p) => (
                      <span
                        key={p.key}
                        title={p.description}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs font-mono-tabular text-[var(--text-primary)]"
                      >
                        <CheckCircle2 className="w-3 h-3 text-[var(--brand-accent)]" />
                        <span>{p.key}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Operator Recent Audit Trail */}
          <Card variant="raised" className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <div>
                <h3 className="ui-section-title">
                  Recent Operator Activity Log
                </h3>
                <p className="ui-meta mt-0.5">
                  Actions recorded under {currentUser.fullName} (
                  {currentUser.email})
                </p>
              </div>
              <Building2 className="w-4 h-4 text-[var(--text-secondary)]" />
            </div>

            {userAuditActivity.length === 0 ? (
              <div className="p-6 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-center text-xs text-[var(--text-secondary)]">
                No audit events recorded for this operator in the current shift
                window. Perform any action (such as updating your profile or
                approving a record) to see live audit entries.
              </div>
            ) : (
              <div className="space-y-2.5">
                {userAuditActivity.map((log) => (
                  <div
                    key={log.id}
                    className="p-3.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-[var(--text-primary)]">
                        {log.action} ·{' '}
                        <span className="font-mono-tabular text-[var(--brand-accent)]">
                          {log.entity}
                        </span>
                      </span>
                      <span className="font-mono-tabular ui-meta">
                        {log.timestamp}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 ui-meta">
                      <span className="px-2 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border-subtle)]">
                        {log.module}
                      </span>
                      <span>Before: {log.beforeValue}</span>
                      <span>→</span>
                      <span className="text-[var(--text-primary)] font-medium">
                        After: {log.afterValue}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

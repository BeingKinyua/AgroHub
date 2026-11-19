'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Leaf } from 'lucide-react';

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [completed, setCompleted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length >= 6 && newPassword === confirmPassword) {
      setCompleted(true);
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[var(--bg-canvas)] p-4 text-[var(--text-primary)]">
      <div className="w-full max-w-md rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 sm:p-8">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--nav-bg)] text-[var(--nav-active)]">
            <Leaf aria-hidden="true" className="size-4" />
          </div>
          <span className="font-heading text-sm font-semibold tracking-wide">
            AGRO-DELIVERIES KE.
          </span>
        </div>

        <h1 className="font-heading text-2xl font-semibold">
          Set new workspace password
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
          Choose a strong password for your internal Agro-Deliveries operator account.
        </p>

        {completed ? (
          <div role="status" className="mt-6 space-y-2 rounded-lg border border-[var(--status-success-border)] bg-[var(--status-success-bg)] p-4 text-sm text-[var(--status-success-fg)]">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 aria-hidden="true" className="size-4 shrink-0" />
              <span>Password updated</span>
            </div>
            <p>Your credentials have been updated. You may now sign in to the BOS.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="new-password" className="ui-label mb-1.5 block">
                New password
              </label>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="ui-field w-full"
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="ui-label mb-1.5 block">
                Confirm password
              </label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="ui-field w-full"
              />
            </div>
            <button
              type="submit"
              className="ui-button ui-button-primary w-full"
            >
              Update password
            </button>
          </form>
        )}

        <div className="mt-6 pt-5 border-t border-[var(--border-subtle)]">
          <Link
            href="/login"
            className="ui-button ui-button-ghost text-[var(--brand-accent)]"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            <span>Back to Sign in</span>
          </Link>
        </div>
      </div>
    </main>
  );
}

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
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-[22px] bg-[var(--bg-card)] border border-[var(--border-subtle)] p-8">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-8 h-8 rounded-lg bg-[#08190C] text-[#4EB462] flex items-center justify-center">
            <Leaf className="w-4 h-4" />
          </div>
          <span className="font-heading text-xs font-semibold">
            AGRO-DELIVERIES KE.
          </span>
        </div>

        <h1 className="font-heading text-2xl font-semibold">
          Set new workspace password
        </h1>
        <p className="text-xs text-[var(--text-secondary)] mt-1">
          Choose a strong password for your internal Agro-Deliveries operator account.
        </p>

        {completed ? (
          <div className="mt-6 p-4 rounded-xl bg-[#E5EFE6] dark:bg-[#142B1B] text-[#12512C] dark:text-[#4EB462] text-xs space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Password updated</span>
            </div>
            <p>Your credentials have been updated. You may now sign in to the BOS.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5">
                New password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5">
                Confirm password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-sm"
              />
            </div>
            <button
              type="submit"
              className="w-full h-11 rounded-xl bg-[#1F6A37] hover:bg-[#12512C] text-white text-sm font-medium cursor-pointer"
            >
              Update password
            </button>
          </form>
        )}

        <div className="mt-6 pt-5 border-t border-[var(--border-subtle)]">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1F6A37] dark:text-[#4EB462] hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Sign in</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

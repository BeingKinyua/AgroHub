'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Plus, Search } from 'lucide-react';
import { useBos } from '@/lib/services/bos-context';
import {
  Card,
  EmptyState,
  FeedbackBanner,
  KPI,
  LoadingSkeleton,
  Modal,
  PageHeader,
  StatusBadge,
} from '@/components/ui/primitives';
import { CustomerInstitutionRecord } from '@/types/domain/bos';

function CustomersDirectory() {
  const { customers, can, createCustomer } = useBos();
  const searchParams = useSearchParams();
  const accountType = searchParams.get('type');
  const initialSearch = searchParams.get('q') ?? '';
  const [search, setSearch] = useState(initialSearch);
  useEffect(() => setSearch(initialSearch), [initialSearch]);
  const query = search.trim().toLowerCase();
  const visibleCustomers = customers.filter((customer) => {
    if (accountType === 'institutional' && !customer.isInstitutional) return false;
    if (accountType === 'retail' && customer.isInstitutional) return false;
    return [customer.name, customer.code, customer.segment, customer.contractRef]
      .some((value) => value.toLowerCase().includes(query));
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [segment, setSegment] =
    useState<CustomerInstitutionRecord['segment']>('School');
  const [county, setCounty] = useState('Nairobi');
  const [deliveryZone, setDeliveryZone] = useState(
    'Westlands / Kilimani Corridor'
  );
  const [contact, setContact] = useState('');
  const [phone, setPhone] = useState('+254 722 000 111');
  const [email, setEmail] = useState('');
  const [paymentTerms, setPaymentTerms] =
    useState<CustomerInstitutionRecord['paymentTerms']>('Net 30');
  const [creditLimitKes, setCreditLimitKes] = useState(1500000);
  const [feedback, setFeedback] = useState<{
    msg: string;
    type: 'success' | 'error';
  } | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await createCustomer({
      name,
      segment,
      isInstitutional: segment !== 'Retail Account',
      county,
      deliveryZone,
      procurementContact: contact,
      phone,
      email,
      paymentTerms,
      creditLimitKes: Number(creditLimitKes),
    });
    setFeedback({ msg: res.message, type: res.ok ? 'success' : 'error' });
    if (res.ok) {
      setCreateOpen(false);
      setName('');
    }
  };

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Find customer accounts, contract terms, and procurement contacts."
        actions={
          can('customers.create') && (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="ui-button ui-button-primary"
            >
              <Plus className="w-4 h-4" />
              <span>Onboard Customer</span>
            </button>
          )
        }
      />

      <FeedbackBanner
        message={feedback?.msg || null}
        type={feedback?.type}
        onDismiss={() => setFeedback(null)}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPI
          label="Accounts"
          value={`${visibleCustomers.length}`}
          sublabel={`${
            visibleCustomers.filter((c) => c.isInstitutional).length
          } Institutional · ${
            visibleCustomers.filter((c) => !c.isInstitutional).length
          } Retail`}
          tone="positive"
        />
        <KPI
          label="Total Credit Facility Extended"
          value={`KES ${visibleCustomers
            .reduce((s, c) => s + c.creditLimitKes, 0)
            .toLocaleString()}`}
          sublabel="Governed Net 15 / Net 30 / Net 45 terms"
          tone="neutral"
        />
        <KPI
          label="Current Receivables (AR)"
          value={`KES ${visibleCustomers
            .reduce((s, c) => s + c.outstandingBalanceKes, 0)
            .toLocaleString()}`}
          sublabel="Across active contracts"
          tone="positive"
        />
        <KPI
          label="Overdue Receivables"
          value={`KES ${visibleCustomers
            .reduce((s, c) => s + c.overdueBalanceKes, 0)
            .toLocaleString()}`}
          sublabel="For the selected accounts"
          tone="warning"
        />
      </div>

      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <nav aria-label="Customer accounts" className="flex flex-wrap gap-2">
          {[
            { label: 'All accounts', type: null, href: '/customers' },
            { label: 'Institutions', type: 'institutional', href: '/customers?type=institutional' },
            { label: 'Retail', type: 'retail', href: '/customers?type=retail' },
          ].map((filter) => {
            const active = accountType === filter.type;
            return (
              <Link key={filter.href} href={filter.href} aria-current={active ? 'page' : undefined}
                className="ui-tab whitespace-nowrap"
              >
                {filter.label}
              </Link>
            );
          })}
        </nav>
        <label className="relative flex w-full items-center sm:w-72">
          <span className="sr-only">Search customer accounts</span>
          <Search className="pointer-events-none absolute left-3 size-4 text-[var(--text-secondary)]" aria-hidden="true" />
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, code, or contract"
            className="ui-field w-full pl-9 pr-3" />
        </label>
      </div>

      {visibleCustomers.length === 0 ? (
        <EmptyState title="No matching customer accounts" description="Try another search or account type." />
      ) : (
      <Card padding="p-0" className="overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="ui-table w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-subtle)]">
                <th className="py-3 px-4">Code & Account Name</th>
                <th className="py-3 px-4">Segment & Zone</th>
                <th className="py-3 px-4">Procurement Contact</th>
                <th className="py-3 px-4">Terms & Tier</th>
                <th className="py-3 px-4 text-right">Balance / Limit (KES)</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)] text-sm">
              {visibleCustomers.map((c) => (
                <tr key={c.id} className="hover:bg-[var(--bg-canvas)]/60">
                  <td className="py-3.5 px-4">
                    <div className="font-mono-tabular text-xs text-[var(--brand-accent)] font-semibold">
                      {c.code}
                    </div>
                    <div className="font-semibold text-[var(--text-primary)]">
                      {c.name}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div>{c.segment}</div>
                    <div className="ui-meta">
                      {c.deliveryZone}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div>{c.procurementContact}</div>
                    <div className="ui-meta">
                      {c.phone}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div>
                      {c.paymentTerms} · {c.orderCadence}
                    </div>
                    <div className="ui-meta">
                      {c.priceTier}
                    </div>
                    {c.isInstitutional && c.contractRef && <div className="mt-0.5 text-xs">{c.contractRef}</div>}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono-tabular">
                    <div className="font-semibold">
                      {c.outstandingBalanceKes.toLocaleString()}
                    </div>
                    <div className="ui-meta">
                      Limit: {c.creditLimitKes.toLocaleString()}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={c.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="md:hidden divide-y divide-[var(--border-subtle)]">
          {visibleCustomers.map((c) => (
            <div key={c.id} className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono-tabular text-xs font-semibold text-[var(--brand-accent)]">
                  {c.code}
                </span>
                <StatusBadge status={c.status} />
              </div>
              <div className="text-sm font-semibold">{c.name}</div>
              <div className="text-xs text-[var(--text-secondary)]">
                {c.segment} · {c.procurementContact} ({c.phone})
              </div>
              {c.isInstitutional && <div className="text-xs">{[c.contractRef, c.orderCadence, c.paymentTerms].filter(Boolean).join(' · ')}</div>}
              <div className="text-xs font-mono-tabular">
                Balance: KES {c.outstandingBalanceKes.toLocaleString()} / Limit:{' '}
                {c.creditLimitKes.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </Card>
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Onboard New Customer / Institution"
        subtitle="Configure segment, delivery corridor, procurement contact, and credit terms."
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="customers-name" className="ui-label block mb-1">
                Account / Institution Name
              </label>
              <input id="customers-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Brookhouse School Karen Kitchen"
                className="ui-field w-full"
              />
            </div>
            <div>
              <label htmlFor="customers-segment" className="ui-label block mb-1">Segment</label>
              <select id="customers-segment"
                value={segment}
                onChange={(e) =>
                  setSegment(
                    e.target.value as CustomerInstitutionRecord['segment']
                  )
                }
                className="ui-field w-full"
              >
                <option value="School">School</option>
                <option value="Hospital">Hospital</option>
                <option value="Hotel">Hotel</option>
                <option value="Restaurant">Restaurant</option>
                <option value="NGO / Corporate">NGO / Corporate</option>
                <option value="Retail Account">Retail Account</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="customers-contact" className="ui-label block mb-1">
                Procurement Contact Name
              </label>
              <input id="customers-contact"
                type="text"
                required
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="e.g., Mr. James Mutiso"
                className="ui-field w-full"
              />
            </div>
            <div>
              <label htmlFor="customers-phone" className="ui-label block mb-1">
                Phone Number
              </label>
              <input id="customers-phone"
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="ui-field w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="customers-email" className="ui-label block mb-1">
                Work Email
              </label>
              <input id="customers-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="procurement@institution.ac.ke"
                className="ui-field w-full"
              />
            </div>
            <div>
              <label htmlFor="customers-zone" className="ui-label block mb-1">
                Delivery Zone
              </label>
              <input id="customers-zone"
                type="text"
                required
                value={deliveryZone}
                onChange={(e) => setDeliveryZone(e.target.value)}
                className="ui-field w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="customers-terms" className="ui-label block mb-1">
                Payment Terms
              </label>
              <select id="customers-terms"
                value={paymentTerms}
                onChange={(e) =>
                  setPaymentTerms(
                    e.target.value as CustomerInstitutionRecord['paymentTerms']
                  )
                }
                className="ui-field w-full"
              >
                <option value="Net 15">Net 15</option>
                <option value="Net 30">Net 30</option>
                <option value="Net 45">Net 45</option>
                <option value="Prepaid / M-Pesa">Prepaid / M-Pesa</option>
              </select>
            </div>
            <div>
              <label htmlFor="customers-credit" className="ui-label block mb-1">
                Approved Credit Limit (KES)
              </label>
              <input id="customers-credit"
                type="number"
                value={creditLimitKes}
                onChange={(e) => setCreditLimitKes(Number(e.target.value))}
                className="ui-field w-full font-mono-tabular"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="ui-button ui-button-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="ui-button ui-button-primary"
            >
              Create Customer Account
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default function CustomersPage() {
  return <Suspense fallback={<LoadingSkeleton />}><CustomersDirectory /></Suspense>;
}

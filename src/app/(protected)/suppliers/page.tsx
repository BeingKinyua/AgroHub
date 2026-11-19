'use client';

import React, { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Award,
  Ban,
  CheckCircle2,
  ChevronRight,
  DollarSign,
  Edit2,
  Plus,
  Search,
  Upload,
} from 'lucide-react';
import { useBos } from '@/lib/services/bos-context';
import { getSupplierQuoteHistory } from '@/lib/services/supplier-offerings';
import {
  Card,
  EmptyState,
  FeedbackBanner,
  Modal,
  PageHeader,
  StatusBadge,
} from '@/components/ui/primitives';
import {
  SupplierContract,
  SupplierDocumentItem,
  SupplierEvaluationRecord,
  SupplierPayableRecord,
  SupplierPaymentRecord,
  SupplierProductItem,
  SupplierRecord,
} from '@/types/domain/bos';
import { SupplierForm } from './SupplierForm';

const statusOptions = ['All', 'Active', 'Under Review', 'Suspended', 'Archived'] as const;
type DirectoryStatus = (typeof statusOptions)[number];
type ProfileTab = 'overview' | 'products' | 'procurement' | 'payables' | 'contracts' | 'performance';

const fieldClass = 'mt-1 min-h-11 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 text-base text-[var(--text-primary)] sm:text-sm';
const actionClass = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 text-sm font-semibold transition-colors hover:bg-[var(--bg-subtle)] cursor-pointer';

const currency = new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 2 });

function SupplierQuoteHistory({ offering }: { offering: SupplierProductItem }) {
  const events = getSupplierQuoteHistory(offering);
  if (!events.length) return null;

  return (
    <details className="mt-3 border-t border-[var(--border-subtle)] pt-1 text-sm">
      <summary className="min-h-11 cursor-pointer py-3 font-semibold text-[var(--brand-accent)]">Quote history</summary>
      <ul className="space-y-2 pb-2 text-[var(--text-secondary)]">
        {[...events].reverse().map((event, index) => (
          <li key={`${event.recordedAt}-${index}`}>
            {event.recordedAt ? <time dateTime={event.recordedAt}>{event.recordedAt.slice(0, 10)}</time> : 'Date unavailable'} · {currency.format(event.priceKes)} / {event.unit}
            {event.recordedBy && ` · ${event.recordedBy}`}{event.reason && ` · ${event.reason}`}
          </li>
        ))}
      </ul>
    </details>
  );
}

export default function SuppliersPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--text-secondary)]" role="status">Loading suppliers…</p>}>
      <SupplierWorkspace />
    </Suspense>
  );
}

function SupplierWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    suppliers,
    products,
    procurementOrders,
    can,
    approveSupplier,
    suspendSupplier,
    reactivateSupplier,
    addSupplierContract,
    updateSupplierContractStatus,
    addSupplierDocument,
    verifySupplierDocument,
    evaluateSupplierPerformance,
    supplierPayables,
    supplierPayments,
    archiveSupplier,
    restoreSupplier,
    deleteSupplier,
    recordSupplierPayment,
  } = useBos();

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<DirectoryStatus>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Active Selected Supplier ID for Sub-modals
  const [activeSupplierId, setActiveSupplierId] = useState<string | null>(null);

  // Derive live active supplier directly from context state
  const activeSupplier = useMemo(
    () => (activeSupplierId ? suppliers.find((s) => s.id === activeSupplierId) || null : null),
    [activeSupplierId, suppliers]
  );

  const setActiveSupplier = (sup: SupplierRecord | null) => {
    setActiveSupplierId(sup?.id || null);
  };

  const profileSupplierId = searchParams.get('supplier');
  const [profileSelection, setProfileSelection] = useState<{ supplierId: string; tab: ProfileTab }>();
  const profileSupplier = useMemo(
    () => (profileSupplierId ? suppliers.find((s) => s.id === profileSupplierId) || null : null),
    [profileSupplierId, suppliers]
  );
  const profileTab = profileSelection?.supplierId === profileSupplierId ? profileSelection.tab : 'overview';

  const [supplierForm, setSupplierForm] = useState<'create' | 'edit' | null>(null);
  const [approveOpen, setApproveOpen] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [contractsOpen, setContractsOpen] = useState(false);
  const [documentsOpen, setDocumentsOpen] = useState(false);
  const [evaluationOpen, setEvaluationOpen] = useState(false);
  // View mode tab: directory or accounts payable ledger
  const viewTab = searchParams.get('tab') === 'payables' ? 'payables' : 'directory';

  // Payment Recording State
  const [paymentPayable, setPaymentPayable] = useState<SupplierPayableRecord | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<SupplierPaymentRecord['paymentMethod']>('M-Pesa Paybill');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  const handleOpenRecordPayment = (payable: SupplierPayableRecord) => {
    setPaymentPayable(payable);
    setPayAmount(String(payable.balanceKes));
    setPayRef('');
    setPayNotes('');
    setPaymentError('');
  };

  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentPayable || isSubmittingPayment) return;
    setPaymentError('');
    setIsSubmittingPayment(true);
    try {
      const result = await recordSupplierPayment({
        payableId: paymentPayable.id,
        amountKes: Number(payAmount),
        paymentMethod: payMethod,
        referenceNumber: payRef.trim(),
        notes: payNotes.trim(),
      });
      if (result.ok) {
        setPaymentPayable(null);
        setFeedback({ msg: result.message, type: 'success' });
      } else {
        setPaymentError(result.message);
      }
    } catch {
      setPaymentError('Unable to record the payment. Try again.');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleArchiveSupplier = async (sup: SupplierRecord) => {
    const res = await archiveSupplier(sup.id);
    setFeedback({ msg: res.message, type: res.ok ? 'success' : 'error' });
  };

  const handleRestoreSupplier = async (sup: SupplierRecord) => {
    const res = await restoreSupplier(sup.id);
    setFeedback({ msg: res.message, type: res.ok ? 'success' : 'error' });
  };

  const handleDeleteSupplier = async (sup: SupplierRecord) => {
    if (!window.confirm(`Permanently delete ${sup.name}?`)) return;
    const res = await deleteSupplier(sup.id);
    setFeedback({ msg: res.message, type: res.ok ? 'success' : 'error' });
    if (res.ok) router.replace('/suppliers');
  };

  // 3. Approve Supplier State
  const [approveComment, setApproveComment] = useState('Satisfactory farm inspection and compliance sign-off.');

  // 4. Suspend Supplier State
  const [suspendReason, setSuspendReason] = useState('');

  // 5. Contracts Form State
  const [contractRef, setContractRef] = useState('');
  const [contractTitle, setContractTitle] = useState('');
  const [contractStart, setContractStart] = useState('2026-10-01');
  const [contractEnd, setContractEnd] = useState('2027-09-30');
  const [contractValue, setContractValue] = useState(3000000);
  const [contractTerms, setContractTerms] = useState('Net 14');
  const [contractCadence, setContractCadence] = useState('Bi-Weekly Scheduled Runs');
  const [contractNotes, setContractNotes] = useState('');

  // 7. Documents Form State
  const [docNumber, setDocNumber] = useState('');
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState<SupplierDocumentItem['category']>('KEBS Certificate');
  const [docIssueDate, setDocIssueDate] = useState('2026-10-01');
  const [docExpiryDate, setDocExpiryDate] = useState('2027-09-30');

  // 8. Evaluation Form State
  const [evalQuality, setEvalQuality] = useState(96);
  const [evalTimeliness, setEvalTimeliness] = useState(95);
  const [evalPricing, setEvalPricing] = useState(97);
  const [evalGrade, setEvalGrade] = useState<'Grade A' | 'Grade B' | 'Grade C'>('Grade A');
  const [evalNotes, setEvalNotes] = useState('');
  const [evalRec, setEvalRec] = useState<SupplierEvaluationRecord['recommendation']>('Preferred Cooperative');

  // Distinct Categories for Filtering
  const categories = useMemo(() => {
    const set = new Set<string>();
    suppliers.forEach((s) => set.add(s.category));
    return ['All', ...Array.from(set)];
  }, [suppliers]);

  const normalizedSearch = search.trim().toLowerCase();
  const filteredSuppliers = useMemo(() => {
    const matchingProductUnits = new Map(products.filter((product) =>
      `${product.name} ${product.sku}`.toLowerCase().includes(normalizedSearch)
    ).map((product) => [product.id, product.unit]));
    return suppliers.filter((s) => {
      const matchSearch =
        !normalizedSearch ||
        [s.name, s.code, s.region, s.contactPerson].some((value) => value.toLowerCase().includes(normalizedSearch)) ||
        s.suppliedProducts.some((offering) => matchingProductUnits.get(offering.productId) === offering.unit || offering.productName.toLowerCase().includes(normalizedSearch));
      const status = s.isArchived ? 'Archived' : s.status;
      const matchStatus = statusFilter === 'All' || status === statusFilter;
      const matchCategory = categoryFilter === 'All' || s.category === categoryFilter;

      return matchSearch && matchStatus && matchCategory;
    });
  }, [suppliers, products, normalizedSearch, statusFilter, categoryFilter]);

  const totalApKes = supplierPayables.reduce((sum, payable) => sum + payable.balanceKes, 0);
  const profileBalance = supplierPayables.reduce((sum, payable) => payable.supplierId === profileSupplierId ? sum + payable.balanceKes : sum, 0);

  // Authorisation Checks
  const canCreate = can('suppliers.create');
  const canEdit = can('suppliers.edit');
  const canApprove = can('suppliers.approve') || can('procurement.approve') || can('approvals.approve') || can('suppliers.edit');
  const canSuspend = can('suppliers.suspend') || can('suppliers.edit') || can('procurement.approve') || can('approvals.approve');
  const canArchive = canEdit || can('suppliers.suspend');
  const canManageContracts = canEdit || can('procurement.create') || can('procurement.approve');
  const canManageDocuments = canEdit || can('documents.manage') || can('procurement.approve');
  const canEvaluate = canEdit || can('procurement.approve');
  const latestEvaluation = profileSupplier?.evaluations?.reduce<SupplierEvaluationRecord | undefined>((latest, evaluation) =>
    !latest || evaluation.evaluationDate > latest.evaluationDate ? evaluation : latest, undefined
  );
  const latestTimeliness = latestEvaluation?.timelinessScorePct ?? latestEvaluation?.timelinessScore;

  // Handlers
  const handleOpenApprove = (sup: SupplierRecord) => {
    setActiveSupplier(sup);
    setApproveComment('Governance review completed. Compliance documents verified.');
    setApproveOpen(true);
  };

  const handleOpenSuspend = (sup: SupplierRecord) => {
    setActiveSupplier(sup);
    setSuspendReason('');
    setSuspendOpen(true);
  };

  const handleOpenContracts = (sup: SupplierRecord) => {
    setActiveSupplier(sup);
    setContractRef(`ADK-SC-2026-${String(Math.floor(Math.random() * 900) + 100)}`);
    setContractTitle(`${sup.category} Supply Master Agreement`);
    setContractsOpen(true);
  };

  const handleOpenDocuments = (sup: SupplierRecord) => {
    setActiveSupplier(sup);
    setDocNumber(`KEBS-${sup.code.slice(4, 7)}-${String(Math.floor(Math.random() * 9000) + 1000)}`);
    setDocTitle('Quality & Phytosanitary Standardization Certificate');
    setDocumentsOpen(true);
  };

  const handleOpenEvaluation = (sup: SupplierRecord) => {
    setActiveSupplier(sup);
    setEvalQuality(Math.round(sup.qualityScorePct));
    setEvalTimeliness(95);
    setEvalPricing(96);
    setEvalGrade('Grade A');
    setEvalNotes('Quarterly supplier review. Clean inspection record and compliant transport temperatures.');
    setEvalRec('Preferred Cooperative');
    setEvaluationOpen(true);
  };

  const handleApproveSubmit = async () => {
    if (!activeSupplier) return;
    const res = await approveSupplier(activeSupplier.id, approveComment);
    setFeedback({ msg: res.message, type: res.ok ? 'success' : 'error' });
    if (res.ok) setApproveOpen(false);
  };

  const handleSuspendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSupplier || !suspendReason.trim()) return;
    const res = await suspendSupplier(activeSupplier.id, suspendReason.trim());
    setFeedback({ msg: res.message, type: res.ok ? 'success' : 'error' });
    if (res.ok) setSuspendOpen(false);
  };

  const handleReactivate = async (sup: SupplierRecord) => {
    const res = await reactivateSupplier(sup.id);
    setFeedback({ msg: res.message, type: res.ok ? 'success' : 'error' });
  };

  const handleAddContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSupplier || !contractTitle.trim()) return;
    const res = await addSupplierContract(activeSupplier.id, {
      contractRef: contractRef.trim(),
      title: contractTitle.trim(),
      startDate: contractStart,
      endDate: contractEnd,
      valueKes: Number(contractValue),
      paymentTerms: contractTerms,
      deliveryCadence: contractCadence,
      notes: contractNotes.trim(),
      status: 'Active',
      signedDate: new Date().toISOString().split('T')[0],
    });
    setFeedback({ msg: res.message, type: res.ok ? 'success' : 'error' });
    if (res.ok) {
      setContractTitle('');
      setContractNotes('');
      // update active supplier in local state
      const updatedSup = suppliers.find((s) => s.id === activeSupplier.id);
      if (updatedSup) setActiveSupplier(updatedSup);
    }
  };

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSupplier || !docTitle.trim()) return;
    const res = await addSupplierDocument(activeSupplier.id, {
      docNumber: docNumber.trim(),
      title: docTitle.trim(),
      category: docCategory,
      issueDate: docIssueDate,
      expiryDate: docExpiryDate,
      status: 'Pending Verification',
      fileSize: '1.4 MB PDF',
    });
    setFeedback({ msg: res.message, type: res.ok ? 'success' : 'error' });
    if (res.ok) {
      setDocTitle('');
      setDocNumber('');
    }
  };

  const handleVerifyDocument = async (docId: string) => {
    if (!activeSupplier) return;
    const res = await verifySupplierDocument(activeSupplier.id, docId);
    setFeedback({ msg: res.message, type: res.ok ? 'success' : 'error' });
  };

  const handleEvaluationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSupplier) return;
    const overall = (Number(evalQuality) * 0.4) + (Number(evalTimeliness) * 0.3) + (Number(evalPricing) * 0.3);
    const res = await evaluateSupplierPerformance(activeSupplier.id, {
      overallScorePct: overall,
      qualityScorePct: Number(evalQuality),
      timelinessScorePct: Number(evalTimeliness),
      pricingCompliancePct: Number(evalPricing),
      packagingGrade: evalGrade,
      notes: evalNotes.trim(),
      recommendation: evalRec,
    });
    setFeedback({ msg: res.message, type: res.ok ? 'success' : 'error' });
    if (res.ok) setEvaluationOpen(false);
  };

  return (
    <div className="space-y-6">
      {!profileSupplierId && (
        <>
          <PageHeader
            title="Suppliers"
            description="Find suppliers and manage your supply network."
            actions={canCreate && (
              <button
                type="button"
                onClick={() => setSupplierForm('create')}
                className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-[var(--brand-accent)] px-4 text-sm font-semibold text-white dark:text-[var(--bg-canvas)]"
              >
                <Plus aria-hidden="true" className="h-4 w-4" /> New supplier
              </button>
            )}
          />
          <FeedbackBanner message={feedback?.msg || null} type={feedback?.type} onDismiss={() => setFeedback(null)} />
          <nav aria-label="Suppliers workspace" className="flex flex-wrap items-center gap-2 border-b border-[var(--border-subtle)] pb-2">
            {([{ id: 'directory', label: 'Directory' }, { id: 'payables', label: 'Payables' }] as const).map((view) => (
              <Link
                key={view.id}
                href={view.id === 'payables' ? '/suppliers?tab=payables' : '/suppliers'}
                aria-current={viewTab === view.id ? 'page' : undefined}
                className={`${actionClass} ${viewTab === view.id ? 'bg-[var(--bg-subtle)] text-[var(--text-primary)]' : 'border-transparent text-[var(--text-secondary)]'}`}
              >
                {view.label}
              </Link>
            ))}
          </nav>
          {viewTab === 'directory' && (
            <section aria-label="Supplier directory" className="space-y-4">
              <div className="grid gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 text-sm sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
                <label className="sm:col-span-2 lg:col-span-1">
                  Search suppliers or products
                  <span className="relative block">
                    <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
                    <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, county, product, or SKU" className={`${fieldClass} pl-9`} />
                  </span>
                </label>
                <label>
                  Status
                  <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as DirectoryStatus)} className={fieldClass}>
                    {statusOptions.map((status) => <option key={status} value={status}>{status === 'All' ? 'All statuses' : status}</option>)}
                  </select>
                </label>
                <label>
                  Category
                  <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className={fieldClass}>
                    {categories.map((category) => <option key={category} value={category}>{category === 'All' ? 'All categories' : category}</option>)}
                  </select>
                </label>
              </div>
              {filteredSuppliers.length === 0 ? (
                <EmptyState
                  title="No suppliers found"
                  description="Try a different supplier, product or status."
                  actionLabel="Reset filters"
                  onAction={() => { setSearch(''); setStatusFilter('All'); setCategoryFilter('All'); }}
                />
              ) : (
                <div className="overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)]">
                  <div aria-hidden="true" className="hidden gap-4 border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-5 py-3 text-xs font-semibold text-[var(--text-secondary)] md:grid md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_8rem]">
                    <span>Supplier</span><span>Products</span><span>Status</span>
                  </div>
                  <ul className="divide-y divide-[var(--border-subtle)]">
                    {filteredSuppliers.map((supplier) => {
                      const offeringNames = supplier.suppliedProducts.map((offering) => offering.productName);
                      const matchingNames = normalizedSearch ? offeringNames.filter((name) => name.toLowerCase().includes(normalizedSearch)) : [];
                      const previews = (matchingNames.length ? matchingNames : offeringNames).slice(0, 2);
                      const remaining = offeringNames.length - previews.length;
                      return (
                        <li key={supplier.id}>
                          <Link
                            href={`/suppliers?supplier=${encodeURIComponent(supplier.id)}`}
                            className="grid min-h-11 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-3.5 transition-colors hover:bg-[var(--bg-canvas)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--brand-accent)] md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_8rem] md:gap-x-4 md:px-5"
                          >
                            <span className="min-w-0">
                              <span className="block wrap-break-word text-sm font-semibold text-[var(--text-primary)]">{supplier.name}</span>
                              <span className="mt-0.5 block text-xs text-[var(--text-secondary)]">{supplier.code} · {supplier.region}</span>
                            </span>
                            <span className="col-span-2 row-start-2 min-w-0 wrap-break-word text-sm text-[var(--text-secondary)] md:col-span-1 md:col-start-2 md:row-start-1">
                              {previews.length ? previews.join(', ') : 'No products linked'}{remaining > 0 && ` +${remaining} more`}
                            </span>
                            <span className="col-start-2 row-start-1 flex items-center justify-between gap-2 md:col-start-3">
                              <StatusBadge status={supplier.isArchived ? 'Archived' : supplier.status} />
                              <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" />
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </section>
          )}
        </>
      )}
      {/* Accounts Payable (AP) Ledger View */}
      {!profileSupplierId && viewTab === 'payables' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)]">
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Supplier payables
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Review supplier balances and record payments against purchases.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-bold text-amber-700 dark:text-amber-400">
                Outstanding {currency.format(totalApKes)}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)]">
            <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-800">
              <thead className="bg-neutral-50 dark:bg-neutral-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">Payable Ref & PO</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">Supplier Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">Due Date</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-neutral-500">Total Obligation</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-neutral-500">Settled (Paid)</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-neutral-500">Outstanding Balance</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-neutral-500">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-neutral-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {supplierPayables.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-xs text-neutral-500">
                      No supplier payables recorded. Confirming goods collection on purchase orders creates payables automatically.
                    </td>
                  </tr>
                ) : (
                  supplierPayables.map((p) => (
                    <tr key={p.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30">
                      <td className="px-4 py-3 text-xs">
                        <div className="font-semibold text-neutral-900 dark:text-white font-mono">{p.id}</div>
                        <div className="text-neutral-500 font-mono">
                          {p.poNumber}{p.invoiceRef ? ` · ${p.invoiceRef}` : ''}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-neutral-900 dark:text-white">
                        {p.supplierName}
                      </td>
                      <td className="px-4 py-3 text-xs text-neutral-600 dark:text-neutral-300">
                        {p.dueDate}
                      </td>
                      <td className="px-4 py-3 text-xs text-right font-mono font-medium text-neutral-900 dark:text-white">
                        KES {(p.totalAmountKes ?? p.amountKes ?? 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-xs text-right font-mono text-emerald-600 dark:text-emerald-400">
                        KES {p.paidAmountKes.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-xs text-right font-mono font-bold text-neutral-900 dark:text-white">
                        KES {p.balanceKes.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-xs text-center">
                        <StatusBadge
                          status={p.status}
                          tone={p.status === 'Paid' ? 'success' : p.status === 'Partially Paid' ? 'warning' : 'error'}
                        />
                      </td>
                      <td className="px-4 py-3 text-right text-xs">
                        {p.balanceKes > 0 && can('finance.record_payment') && (
                          <button
                            type="button"
                            onClick={() => handleOpenRecordPayment(p)}
                            className="rounded-md bg-[#1F6A37] px-3 py-1 text-xs font-semibold text-white shadow-xs hover:bg-[#12512C]"
                          >
                            Record Payment
                          </button>
                        )}
                        {p.balanceKes === 0 && (
                          <span className="text-xs text-emerald-600 font-medium">Fully Settled</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(supplierForm === 'create' || (supplierForm === 'edit' && profileSupplier)) && (
        <SupplierForm
          key={supplierForm === 'edit' ? profileSupplier?.id : 'create'}
          supplier={supplierForm === 'edit' ? profileSupplier ?? undefined : undefined}
          onClose={() => setSupplierForm(null)}
          onSaved={(msg) => { setSupplierForm(null); setFeedback({ msg, type: 'success' }); }}
        />
      )}

      {profileSupplierId && (
        <section aria-label="Supplier profile" className="space-y-4">
          <Link className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-[var(--brand-accent)] hover:underline" href="/suppliers">
            <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Supplier directory
          </Link>
          {profileSupplier ? (
            <>
            <PageHeader
              title={profileSupplier.name}
              description={`${profileSupplier.code} · ${profileSupplier.region} · ${profileSupplier.category}`}
              actions={canEdit && <button type="button" className={actionClass} onClick={() => setSupplierForm('edit')}><Edit2 aria-hidden="true" className="h-4 w-4" /> Edit supplier</button>}
            />
            <FeedbackBanner message={feedback?.msg || null} type={feedback?.type} onDismiss={() => setFeedback(null)} />
            {/* 6 Tab Buttons */}
            <nav aria-label="Supplier profile sections" className="flex flex-wrap items-center gap-2 border-b border-[var(--border-subtle)] pb-2">
              {([
                { id: 'overview', label: 'Overview' },
                { id: 'products', label: 'Products' },
                { id: 'procurement', label: 'Purchases' },
                { id: 'payables', label: 'Account' },
                { id: 'contracts', label: 'Contracts & documents' },
                { id: 'performance', label: 'Performance' },
              ] as const).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={profileTab === t.id}
                  onClick={() => setProfileSelection({ supplierId: profileSupplier.id, tab: t.id })}
                  className={`${actionClass} ${profileTab === t.id ? 'bg-[var(--bg-subtle)] text-[var(--text-primary)]' : 'border-transparent text-[var(--text-secondary)]'}`}
                >
                  {t.label}
                </button>
              ))}
            </nav>

            {profileTab === 'overview' && (
              <div className="space-y-4">
                <dl className="grid gap-3 sm:grid-cols-3">
                  <Card>
                    <dt className="text-sm text-[var(--text-secondary)]">Outstanding balance</dt>
                    <dd className="mt-1 font-mono-tabular text-2xl font-semibold">{currency.format(profileBalance)}</dd>
                  </Card>
                  <Card>
                    <dt className="text-sm text-[var(--text-secondary)]">Products supplied</dt>
                    <dd className="mt-1 font-mono-tabular text-2xl font-semibold">{profileSupplier.suppliedProducts.length}</dd>
                  </Card>
                  <Card>
                    <dt className="text-sm text-[var(--text-secondary)]">Status</dt>
                    <dd className="mt-2"><StatusBadge status={profileSupplier.isArchived ? 'Archived' : profileSupplier.status} /></dd>
                    {!profileSupplier.isArchived && profileSupplier.status === 'Suspended' && profileSupplier.suspendedReason && (
                      <dd className="mt-2 text-sm text-[var(--text-secondary)]">{profileSupplier.suspendedReason}</dd>
                    )}
                    {!profileSupplier.isArchived && profileSupplier.status === 'Under Review' && (
                      <dd className="mt-2 text-sm text-[var(--text-secondary)]">Approval required before purchasing.</dd>
                    )}
                  </Card>
                </dl>

                <Card className="space-y-4">
                  <h2 className="font-heading text-lg font-semibold">Contact and commercial terms</h2>
                  <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
                    <div><dt className="text-[var(--text-secondary)]">Contact person</dt><dd className="mt-1 font-medium">{profileSupplier.contactPerson}</dd></div>
                    <div><dt className="text-[var(--text-secondary)]">Phone</dt><dd className="mt-1 font-medium">{profileSupplier.phone}</dd></div>
                    <div><dt className="text-[var(--text-secondary)]">Email</dt><dd className="mt-1 break-all font-medium">{profileSupplier.email || 'No email on file'}</dd></div>
                    <div><dt className="text-[var(--text-secondary)]">Payment terms</dt><dd className="mt-1 font-medium">{profileSupplier.paymentTerms}</dd></div>
                    <div><dt className="text-[var(--text-secondary)]">Default lead time</dt><dd className="mt-1 font-medium">{profileSupplier.leadTimeDays} days</dd></div>
                    <div><dt className="text-[var(--text-secondary)]">Settlement instructions</dt><dd className="mt-1 wrap-break-word font-medium">{profileSupplier.paymentDetails || 'No instructions on file'}</dd></div>
                  </dl>
                </Card>

                {(canArchive || (!profileSupplier.isArchived && (canApprove || canSuspend))) && (
                  <Card className="space-y-3">
                    <h2 className="font-heading text-lg font-semibold">Supplier status</h2>
                    <div className="flex flex-wrap gap-2">
                      {profileSupplier.isArchived ? (
                        canArchive && <button className={actionClass} type="button" onClick={() => handleRestoreSupplier(profileSupplier)}>Restore supplier</button>
                      ) : (
                        <>
                          {canApprove && profileSupplier.status === 'Under Review' && <button className={actionClass} type="button" onClick={() => handleOpenApprove(profileSupplier)}>Approve supplier</button>}
                          {canSuspend && profileSupplier.status === 'Suspended' && <button className={actionClass} type="button" onClick={() => handleReactivate(profileSupplier)}>Reactivate supplier</button>}
                          {canSuspend && profileSupplier.status !== 'Suspended' && <button className={actionClass} type="button" onClick={() => handleOpenSuspend(profileSupplier)}>Suspend supplier</button>}
                          {canArchive && <button className={actionClass} type="button" onClick={() => handleArchiveSupplier(profileSupplier)}>Archive supplier</button>}
                        </>
                      )}
                      {canEdit && <button className={`${actionClass} text-red-700 dark:text-red-300`} type="button" onClick={() => handleDeleteSupplier(profileSupplier)}>Delete supplier</button>}
                    </div>
                  </Card>
                )}
              </div>
            )}

            {profileTab === 'products' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-heading text-lg font-semibold">Products and supplier quotes</h2>
                  {canEdit && <button className={actionClass} type="button" onClick={() => setSupplierForm('edit')}>Manage offerings</button>}
                </div>
                {!profileSupplier.suppliedProducts.length && <p className="text-sm text-[var(--text-secondary)]">This supplier has no linked products.</p>}
                <ul className="grid gap-4 lg:grid-cols-2">
                  {profileSupplier.suppliedProducts.map((offering) => (
                    <li key={offering.id ?? offering.productId}>
                      <Card className="space-y-2">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <h3 className="font-semibold">{offering.productName}</h3>
                          <span className="text-sm text-[var(--text-secondary)]">{offering.availability ?? 'Available'}{offering.preferredSupplier && ' · Preferred'}</span>
                        </div>
                        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                          <div><dt className="text-[var(--text-secondary)]">Supplier quote</dt><dd className="mt-1 font-semibold">{currency.format(offering.currentCostKes)} / {offering.unit}</dd></div>
                          <div><dt className="text-[var(--text-secondary)]">Minimum order</dt><dd className="mt-1 font-medium">{offering.minOrderQty ?? offering.moq ?? 1} {offering.unit}</dd></div>
                          <div><dt className="text-[var(--text-secondary)]">Lead time</dt><dd className="mt-1 font-medium">{offering.leadTimeDays ?? profileSupplier.leadTimeDays} days</dd></div>
                        </dl>
                        {offering.notes && <p className="text-sm text-[var(--text-secondary)]">{offering.notes}</p>}
                        <SupplierQuoteHistory offering={offering} />
                      </Card>
                    </li>
                  ))}
                </ul>
                {Boolean(profileSupplier.retiredSuppliedProducts?.length) && (
                  <div className="space-y-3">
                    <h3 className="font-heading font-semibold">Previous offerings</h3>
                    {(profileSupplier.retiredSuppliedProducts ?? []).map((offering) => (
                      <Card key={offering.id ?? offering.productId}>
                        <p className="text-sm font-medium">{offering.productName}</p>
                        <SupplierQuoteHistory offering={offering} />
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: PURCHASE HISTORY */}
            {profileTab === 'procurement' && (
              <div className="space-y-3">
                <span className="text-xs font-semibold text-[var(--text-primary)]">
                  Purchase Orders Issued to {profileSupplier.name}
                </span>

                {procurementOrders.filter((po) => po.supplierId === profileSupplier.id).length === 0 ? (
                  <div className="p-4 text-center rounded-md border border-dashed border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">
                    No purchase orders recorded yet for this supplier.
                  </div>
                ) : (
                  <div className="border border-[var(--border-subtle)] rounded-md overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-[var(--bg-canvas)] border-b border-[var(--border-subtle)] text-[10px] font-semibold text-[var(--text-secondary)]">
                        <tr>
                          <th className="py-2 px-3">PO Number</th>
                          <th className="py-2 px-3">Purpose</th>
                          <th className="py-2 px-3">Items Summary</th>
                          <th className="py-2 px-3 text-right">Total (KES)</th>
                          <th className="py-2 px-3 text-center">Stage</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-subtle)]">
                        {procurementOrders
                          .filter((po) => po.supplierId === profileSupplier.id)
                          .map((po) => (
                            <tr key={po.id} className="hover:bg-[var(--bg-canvas)]/50">
                              <td className="py-2.5 px-3 font-mono font-semibold text-[var(--text-primary)]">
                                {po.poNumber}
                              </td>
                              <td className="py-2.5 px-3 text-[11px] text-[var(--text-secondary)]">
                                {po.purpose || 'Direct Sourcing'}
                              </td>
                              <td className="py-2.5 px-3">{po.itemsSummary}</td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-[var(--text-primary)]">
                                KES {po.totalKes.toLocaleString()}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
                                  {po.stage}
                                </span>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: ACCOUNTS PAYABLE */}
            {profileTab === 'payables' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--text-primary)]">
                    Payables & Commercial Settlement Ledger
                  </span>
                  <span className="text-xs font-mono font-bold text-amber-700 dark:text-amber-400">
                    Outstanding {currency.format(profileBalance)}
                  </span>
                </div>

                {supplierPayables.filter((sp) => sp.supplierId === profileSupplier.id).length === 0 ? (
                  <div className="p-4 text-center rounded-md border border-dashed border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">
                    No open or past payables for this vendor.
                  </div>
                ) : (
                  <div className="border border-[var(--border-subtle)] rounded-md overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-[var(--bg-canvas)] border-b border-[var(--border-subtle)] text-[10px] font-semibold text-[var(--text-secondary)]">
                        <tr>
                          <th className="py-2 px-3">Payable Ref / PO</th>
                          <th className="py-2 px-3">Due Date</th>
                          <th className="py-2 px-3 text-right">Total Invoiced</th>
                          <th className="py-2 px-3 text-right">Settled</th>
                          <th className="py-2 px-3 text-right">Balance</th>
                          <th className="py-2 px-3 text-center">Status</th>
                          <th className="py-2 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-subtle)]">
                        {supplierPayables
                          .filter((sp) => sp.supplierId === profileSupplier.id)
                          .map((p) => (
                            <tr key={p.id} className="hover:bg-[var(--bg-canvas)]/50">
                              <td className="py-2.5 px-3">
                                <div className="font-mono font-semibold text-[var(--text-primary)]">{p.id}</div>
                                <div className="text-[10px] text-[var(--text-secondary)] font-mono">{p.poNumber}</div>
                              </td>
                              <td className="py-2.5 px-3 text-[var(--text-secondary)]">{p.dueDate}</td>
                              <td className="py-2.5 px-3 text-right font-mono font-medium">
                                KES {(p.totalAmountKes ?? p.amountKes ?? 0).toLocaleString()}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                                KES {p.paidAmountKes.toLocaleString()}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                                KES {p.balanceKes.toLocaleString()}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
                                  {p.status}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                {p.balanceKes > 0 && can('finance.record_payment') && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenRecordPayment(p)}
                                    className="px-2.5 py-1 rounded bg-[#1F6A37] text-white text-[11px] font-semibold hover:bg-[#12512C]"
                                  >
                                    Pay
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: CONTRACTS & DOCUMENTS */}
            {profileTab === 'contracts' && (
              <div className="space-y-4 text-sm">
                <div>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-heading text-lg font-semibold">Supply agreements</h2>
                    {canManageContracts && <button className={actionClass} type="button" onClick={() => handleOpenContracts(profileSupplier)}>Manage contracts</button>}
                  </div>
                  {(profileSupplier.contracts || []).length === 0 ? (
                    <div className="p-3 text-center rounded-md border border-dashed border-[var(--border-subtle)] text-[var(--text-secondary)]">
                      No formal supply contracts uploaded.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {profileSupplier.contracts.map((c) => (
                        <div key={c.id} className="p-3 rounded-md bg-[var(--bg-canvas)] border border-[var(--border-subtle)] flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-[var(--text-primary)]">{c.title} ({c.contractRef})</div>
                            <div className="text-[10px] text-[var(--text-secondary)]">Validity: {c.startDate} to {c.endDate} · {c.deliveryCadence}</div>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold text-[var(--text-primary)]">KES {c.valueKes.toLocaleString()}</span>
                            <div><span className="px-2 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">{c.status}</span></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-heading text-lg font-semibold">Compliance documents</h2>
                    {canManageDocuments && <button className={actionClass} type="button" onClick={() => handleOpenDocuments(profileSupplier)}>Manage documents</button>}
                  </div>
                  {(profileSupplier.documents || []).length === 0 ? (
                    <div className="p-3 text-center rounded-md border border-dashed border-[var(--border-subtle)] text-[var(--text-secondary)]">
                      No compliance documents on record.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {profileSupplier.documents.map((d) => (
                        <div key={d.id} className="p-3 rounded-md bg-[var(--bg-canvas)] border border-[var(--border-subtle)] flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-[var(--text-primary)]">{d.title} ({d.docNumber})</div>
                            <div className="text-[10px] text-[var(--text-secondary)]">{d.category} · Valid through {d.expiryDate}</div>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                            {d.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 6: PERFORMANCE */}
            {profileTab === 'performance' && (
              <div className="space-y-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-heading text-lg font-semibold">Supplier performance</h2>
                  {canEvaluate && <button className={actionClass} type="button" onClick={() => handleOpenEvaluation(profileSupplier)}>Record evaluation</button>}
                </div>
                <div className="grid grid-cols-3 gap-3 p-3 rounded-md bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-center">
                  <div>
                    <span className="text-[10px] text-[var(--text-secondary)]">Quality Compliance</span>
                    <div className="font-mono font-bold text-base text-[#1F6A37] dark:text-[#4EB462] mt-0.5">
                      {profileSupplier.qualityScorePct}%
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--text-secondary)]">On-Time Farm Dispatch</span>
                    <div className="font-mono font-bold text-base text-[var(--text-primary)] mt-0.5">
                      {latestTimeliness === undefined ? '—' : `${latestTimeliness}%`}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--text-secondary)]">Commercial Tier</span>
                    <div className="font-bold text-sm text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {latestEvaluation?.packagingGrade ?? latestEvaluation?.grade ?? '—'}
                    </div>
                  </div>
                </div>

                <div>
                  <h5 className="font-semibold text-[var(--text-primary)] mb-2">Performance Audit Log History</h5>
                  {(profileSupplier.evaluations || []).length === 0 ? (
                    <div className="p-3 text-center rounded-md border border-dashed border-[var(--border-subtle)] text-[var(--text-secondary)]">
                      No performance audits logged yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {profileSupplier.evaluations.map((ev) => (
                        <div key={ev.id} className="p-3 rounded-md bg-[var(--bg-canvas)] border border-[var(--border-subtle)] space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-[var(--text-primary)]">{ev.evaluationDate} · Grade: {ev.packagingGrade || ev.grade || 'Grade A'}</span>
                            <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 font-semibold">{ev.recommendation}</span>
                          </div>
                          <p className="text-[11px] text-[var(--text-secondary)]">{ev.notes}</p>
                          <div className="text-[10px] text-[var(--text-secondary)]">Auditor: {ev.evaluator || ev.evaluatedBy || 'Operations Lead'} · Quality {ev.qualityScorePct ?? ev.qualityScore ?? 100}% · Timeliness {ev.timelinessScorePct ?? ev.timelinessScore ?? 100}% · Pricing {ev.pricingCompliancePct ?? ev.pricingScore ?? 100}%</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            </>
          ) : <EmptyState title="Supplier not found" description="Open the directory to find another supplier." />}
        </section>
      )}

      {/* ========================================================================= */}
      {/* 3. APPROVE SUPPLIER MODAL */}
      {/* ========================================================================= */}
      <Modal
        open={approveOpen}
        onClose={() => setApproveOpen(false)}
        title="Approve & Authorize Supplier"
        subtitle={`Grant authorized supply status to ${activeSupplier?.name} for PO issuance.`}
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-[#E5EFE6] dark:bg-[#142B1B] border border-[#1F6A37]/30 text-xs">
            <div className="font-semibold text-[#12512C] dark:text-[#4EB462]">
              Onboarding Governance Verification
            </div>
            <div className="text-[11px] text-[var(--text-secondary)] mt-1">
              Approving this vendor transitions their status from <strong>Under Review</strong> to <strong>Active</strong>, permitting purchase requisitions and purchase orders across cold chain and bulk grain hubs.
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Approval Audit Comment *
            </label>
            <textarea
              rows={3}
              value={approveComment}
              onChange={(e) => setApproveComment(e.target.value)}
              className="w-full p-2.5 rounded-xl text-xs bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[#1F6A37]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setApproveOpen(false)}
              className="h-9 px-4 rounded-full border border-[var(--border-subtle)] text-xs font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApproveSubmit}
              className="h-9 px-5 rounded-full bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-semibold cursor-pointer shadow-sm inline-flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirm & Activate Supplier</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* 4. SUSPEND SUPPLIER MODAL */}
      {/* ========================================================================= */}
      <Modal
        open={suspendOpen}
        onClose={() => setSuspendOpen(false)}
        title="Suspend Supplier Account"
        subtitle={`Halt all operational ordering and deliveries with ${activeSupplier?.name}.`}
      >
        <form onSubmit={handleSuspendSubmit} className="space-y-4">
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-xs text-red-700 dark:text-red-400">
            <strong>Warning:</strong> Suspending a supplier halts all pending purchase orders and prevents receiving dock workers from accepting shipments until formally reinstated.
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Reason for Suspension *
            </label>
            <textarea
              required
              rows={3}
              placeholder="e.g. Repeated failure to maintain cold-chain temperature thresholds, pesticide audit violation, or pricing breach."
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              className="w-full p-2.5 rounded-xl text-xs bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-red-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setSuspendOpen(false)}
              className="h-9 px-4 rounded-full border border-[var(--border-subtle)] text-xs font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-9 px-5 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5"
            >
              <Ban className="w-4 h-4" />
              <span>Confirm Suspension</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* 5. MANAGE CONTRACTS MODAL */}
      {/* ========================================================================= */}
      <Modal
        open={contractsOpen}
        onClose={() => setContractsOpen(false)}
        title={`Contracts Master Agreement · ${activeSupplier?.name}`}
        subtitle="Review active agreements, validity dates, volume riders, and execute new contracts."
      >
        <div className="space-y-5">
          {/* Existing Contracts List */}
          <div>
            <div className="text-xs font-semibold text-[var(--text-primary)] mb-2 flex items-center justify-between">
              <span>Executed Supply Contracts ({activeSupplier?.contracts?.length || 0})</span>
            </div>

            {(!activeSupplier?.contracts || activeSupplier.contracts.length === 0) ? (
              <div className="p-4 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-center text-xs text-[var(--text-secondary)]">
                No contracts registered yet for this supplier.
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {activeSupplier.contracts.map((ctr) => (
                  <div
                    key={ctr.id}
                    className="p-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                        <span className="font-mono-tabular text-[#1F6A37] dark:text-[#4EB462]">
                          {ctr.contractRef}
                        </span>
                        <span>· {ctr.title}</span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          ctr.status === 'Active'
                            ? 'bg-[#E5EFE6] dark:bg-[#142B1B] text-[#1F6A37] dark:text-[#4EB462]'
                            : ctr.status === 'Expiring Soon'
                            ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                            : 'bg-red-500/15 text-red-600 dark:text-red-400'
                        }`}
                      >
                        {ctr.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-[var(--text-secondary)] pt-1">
                      <div>Val: <strong>KES {ctr.valueKes.toLocaleString()}</strong></div>
                      <div>Terms: <strong>{ctr.paymentTerms}</strong></div>
                      <div>Start: <strong>{ctr.startDate}</strong></div>
                      <div>End: <strong>{ctr.endDate}</strong></div>
                    </div>

                    {ctr.notes && (
                      <p className="text-[11px] text-[var(--text-secondary)] italic pt-0.5">
                        {ctr.notes}
                      </p>
                    )}

                    {canEdit && (
                      <div className="flex items-center gap-2 pt-1 border-t border-[var(--border-subtle)]/70 text-[10px]">
                        <span className="text-[var(--text-secondary)]">Action status:</span>
                        {(['Active', 'Expiring Soon', 'Expired'] as const).map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={async () => {
                              await updateSupplierContractStatus(activeSupplier.id, ctr.id, st);
                              const sup = suppliers.find((s) => s.id === activeSupplier.id);
                              if (sup) setActiveSupplier(sup);
                            }}
                            className={`px-2 py-0.5 rounded-full cursor-pointer ${
                              ctr.status === st
                                ? 'bg-[#1F6A37] text-white font-bold'
                                : 'hover:bg-[var(--bg-card)] border border-[var(--border-subtle)]'
                            }`}
                          >
                            Mark {st}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form to Add New Contract */}
          {canEdit && (
            <form onSubmit={handleAddContract} className="pt-3 border-t border-[var(--border-subtle)] space-y-3">
              <div className="text-xs font-semibold text-[var(--text-primary)]">
                Execute New Contract / Sourcing Rider
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-[var(--text-secondary)] mb-1">
                    Contract Reference *
                  </label>
                  <input
                    type="text"
                    required
                    value={contractRef}
                    onChange={(e) => setContractRef(e.target.value)}
                    className="w-full h-8 px-2.5 rounded-lg text-xs bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[var(--text-secondary)] mb-1">
                    Contract Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={contractTitle}
                    onChange={(e) => setContractTitle(e.target.value)}
                    className="w-full h-8 px-2.5 rounded-lg text-xs bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] text-[var(--text-secondary)] mb-1">
                    Contract Value (KES) *
                  </label>
                  <input
                    type="number"
                    required
                    value={contractValue}
                    onChange={(e) => setContractValue(Number(e.target.value))}
                    className="w-full h-8 px-2.5 rounded-lg text-xs bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[var(--text-secondary)] mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={contractStart}
                    onChange={(e) => setContractStart(e.target.value)}
                    className="w-full h-8 px-2.5 rounded-lg text-xs bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[var(--text-secondary)] mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    required
                    value={contractEnd}
                    onChange={(e) => setContractEnd(e.target.value)}
                    className="w-full h-8 px-2.5 rounded-lg text-xs bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-[var(--text-secondary)] mb-1">
                  Delivery Cadence & Volume Specifications
                </label>
                <input
                  type="text"
                  value={contractCadence}
                  onChange={(e) => setContractCadence(e.target.value)}
                  placeholder="e.g. Tri-Weekly Scheduled Runs to Cold Hub A"
                  className="w-full h-8 px-2.5 rounded-lg text-xs bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[var(--text-secondary)] mb-1">
                  Contract Terms & Notes
                </label>
                <textarea
                  rows={2}
                  value={contractNotes}
                  onChange={(e) => setContractNotes(e.target.value)}
                  placeholder="Minimum monthly commitment, grading thresholds, dispute jurisdiction..."
                  className="w-full p-2 rounded-lg text-xs bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="h-8 px-4 rounded-full bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Execute Contract Record</span>
                </button>
              </div>
            </form>
          )}

          <div className="flex justify-end pt-2 border-t border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => setContractsOpen(false)}
              className="h-8 px-4 rounded-full border border-[var(--border-subtle)] text-xs font-medium cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* 7. MANAGE SUPPLIER DOCUMENTS MODAL */}
      {/* ========================================================================= */}
      <Modal
        open={documentsOpen}
        onClose={() => setDocumentsOpen(false)}
        title={`Compliance Documents Vault · ${activeSupplier?.name}`}
        subtitle="Verify food safety certificates, county trading licenses, tax compliance, and upload new certifications."
      >
        <div className="space-y-5">
          {/* Attached Documents List */}
          <div>
            <div className="text-xs font-semibold text-[var(--text-primary)] mb-2">
              Attached Compliance Records ({activeSupplier?.documents?.length || 0})
            </div>

            {(!activeSupplier?.documents || activeSupplier.documents.length === 0) ? (
              <div className="p-4 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-center text-xs text-[var(--text-secondary)]">
                No documents currently attached to this supplier.
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {activeSupplier.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                        <span>{doc.title}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            doc.status === 'Verified'
                              ? 'bg-[#E5EFE6] dark:bg-[#142B1B] text-[#1F6A37] dark:text-[#4EB462]'
                              : doc.status === 'Pending Verification'
                              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                              : 'bg-red-500/15 text-red-600 dark:text-red-400'
                          }`}
                        >
                          {doc.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                        Ref: {doc.docNumber} · {doc.category} · Valid to: {doc.expiryDate || 'N/A'} ({doc.fileSize || 'PDF'})
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {doc.status !== 'Verified' && canApprove && (
                        <button
                          type="button"
                          onClick={async () => {
                            await handleVerifyDocument(doc.id);
                            const sup = suppliers.find((s) => s.id === activeSupplier.id);
                            if (sup) setActiveSupplier(sup);
                          }}
                          className="h-7 px-3 rounded-full bg-[#1F6A37] text-white text-[11px] font-semibold cursor-pointer inline-flex items-center gap-1 shadow-sm"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Verify</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form to Attach New Document */}
          {canEdit && (
            <form onSubmit={handleAddDocument} className="pt-3 border-t border-[var(--border-subtle)] space-y-3">
              <div className="text-xs font-semibold text-[var(--text-primary)]">
                Attach Compliance Certificate or Legal Record
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-[var(--text-secondary)] mb-1">
                    Document Category *
                  </label>
                  <select
                    value={docCategory}
                    onChange={(e) => setDocCategory(e.target.value as SupplierDocumentItem['category'])}
                    className="w-full h-8 px-2.5 rounded-lg text-xs bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                  >
                    <option value="KEBS Certificate">KEBS Certificate</option>
                    <option value="County Trade License">County Trade License</option>
                    <option value="Tax Compliance (KRA PIN)">Tax Compliance (KRA PIN)</option>
                    <option value="Supply Agreement">Supply Agreement</option>
                    <option value="Phytosanitary Inspection">Phytosanitary Inspection</option>
                    <option value="Bank Details & Cheque Leaf">Bank Details & Cheque Leaf</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-[var(--text-secondary)] mb-1">
                    Certificate / License Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={docNumber}
                    onChange={(e) => setDocNumber(e.target.value)}
                    className="w-full h-8 px-2.5 rounded-lg text-xs bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-[var(--text-secondary)] mb-1">
                  Document Title *
                </label>
                <input
                  type="text"
                  required
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-lg text-xs bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-[var(--text-secondary)] mb-1">
                    Issue Date
                  </label>
                  <input
                    type="date"
                    required
                    value={docIssueDate}
                    onChange={(e) => setDocIssueDate(e.target.value)}
                    className="w-full h-8 px-2.5 rounded-lg text-xs bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[var(--text-secondary)] mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    required
                    value={docExpiryDate}
                    onChange={(e) => setDocExpiryDate(e.target.value)}
                    className="w-full h-8 px-2.5 rounded-lg text-xs bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="h-8 px-4 rounded-full bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload & Attach Document</span>
                </button>
              </div>
            </form>
          )}

          <div className="flex justify-end pt-2 border-t border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => setDocumentsOpen(false)}
              className="h-8 px-4 rounded-full border border-[var(--border-subtle)] text-xs font-medium cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* 8. EVALUATE PERFORMANCE MODAL */}
      {/* ========================================================================= */}
      <Modal
        open={evaluationOpen}
        onClose={() => setEvaluationOpen(false)}
        title={`Supplier Performance Evaluation · ${activeSupplier?.name}`}
        subtitle="Score vendor deliveries, quality consistency, and pricing discipline to maintain cooperative standards."
      >
        <form onSubmit={handleEvaluationSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Produce Quality Score ({evalQuality}%)
              </label>
              <input
                type="range"
                min="50"
                max="100"
                value={evalQuality}
                onChange={(e) => setEvalQuality(Number(e.target.value))}
                className="w-full accent-[#1F6A37]"
              />
              <span className="text-[10px] text-[var(--text-secondary)]">Washing, grading, ripeness</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Delivery Timeliness ({evalTimeliness}%)
              </label>
              <input
                type="range"
                min="50"
                max="100"
                value={evalTimeliness}
                onChange={(e) => setEvalTimeliness(Number(e.target.value))}
                className="w-full accent-[#1F6A37]"
              />
              <span className="text-[10px] text-[var(--text-secondary)]">Adherence to receiving dock SLA</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Pricing Compliance ({evalPricing}%)
              </label>
              <input
                type="range"
                min="50"
                max="100"
                value={evalPricing}
                onChange={(e) => setEvalPricing(Number(e.target.value))}
                className="w-full accent-[#1F6A37]"
              />
              <span className="text-[10px] text-[var(--text-secondary)]">Zero unauthorized surcharges</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Crate & Packaging Grade *
              </label>
              <select
                value={evalGrade}
                onChange={(e) => setEvalGrade(e.target.value as 'Grade A' | 'Grade B' | 'Grade C')}
                className="w-full h-9 px-3 rounded-xl text-xs bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
              >
                <option value="Grade A">Grade A (Uniform sorting & clean plastic crates)</option>
                <option value="Grade B">Grade B (Acceptable sorting with minor variations)</option>
                <option value="Grade C">Grade C (Irregular sorting or unhygienic sacks)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Governance Recommendation *
              </label>
              <select
                value={evalRec}
                onChange={(e) => setEvalRec(e.target.value as SupplierEvaluationRecord['recommendation'])}
                className="w-full h-9 px-3 rounded-xl text-xs bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
              >
                <option value="Preferred Cooperative">Preferred Cooperative (Priority offtake)</option>
                <option value="Standard Approved">Standard Approved (Regular procurement)</option>
                <option value="Performance Watch">Performance Watch (Close monitoring)</option>
                <option value="Suspended">Suspended (Halt purchasing)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Audit Notes & Evaluator Findings *
            </label>
            <textarea
              required
              rows={3}
              value={evalNotes}
              onChange={(e) => setEvalNotes(e.target.value)}
              placeholder="Detail inspection observations, transit temperature logger readings, and sorting compliance..."
              className="w-full p-2.5 rounded-xl text-xs bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[#1F6A37]"
            />
          </div>

          <div className="p-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] flex items-center justify-between text-xs">
            <span className="text-[var(--text-secondary)]">Calculated Composite Score:</span>
            <span className="font-heading font-bold text-base text-[#1F6A37] dark:text-[#4EB462]">
              {((evalQuality * 0.4) + (evalTimeliness * 0.3) + (evalPricing * 0.3)).toFixed(1)}%
            </span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEvaluationOpen(false)}
              className="h-9 px-4 rounded-md border border-[var(--border-subtle)] text-xs font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-9 px-5 rounded-md bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-semibold cursor-pointer shadow-xs inline-flex items-center gap-1.5"
            >
              <Award className="w-4 h-4" />
              <span>Record Performance Audit</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* 9. RECORD SUPPLIER PAYMENT MODAL */}
      {/* ========================================================================= */}
      <Modal
        open={Boolean(paymentPayable)}
        onClose={() => { if (!isSubmittingPayment) setPaymentPayable(null); }}
        title="Record supplier payment"
        subtitle={paymentPayable ? `${paymentPayable.supplierName} · ${paymentPayable.poNumber}` : undefined}
        allowEscapeClose={!isSubmittingPayment}
        allowBackdropClose={!isSubmittingPayment}
      >
        {paymentPayable && (
          <form onSubmit={handleRecordPaymentSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3 p-3 rounded-md bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs">
              <div>
                <span className="text-[var(--text-secondary)]">Total Invoiced:</span>
                <p className="font-mono font-semibold text-neutral-900 dark:text-white">
                  KES {(paymentPayable.totalAmountKes ?? paymentPayable.amountKes ?? 0).toLocaleString()}
                </p>
              </div>
              <div>
                <span className="text-[var(--text-secondary)]">Outstanding Balance:</span>
                <p className="font-mono font-bold text-amber-600 dark:text-amber-400">
                  KES {paymentPayable.balanceKes.toLocaleString()}
                </p>
              </div>
            </div>

            <label className="block text-sm font-medium">
              Amount (KES)
              <input
                type="number"
                required
                min="0.01"
                step="0.01"
                max={paymentPayable.balanceKes}
                inputMode="decimal"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className={`${fieldClass} font-mono`}
              />
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm font-medium">
              <label>
                Payment method
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as SupplierPaymentRecord['paymentMethod'])}
                  className={fieldClass}
                >
                  <option value="M-Pesa Paybill">M-Pesa Paybill</option>
                  <option value="EFT / Bank Transfer">EFT / Bank Transfer</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Cash">Cash</option>
                </select>
              </label>

              <label>
                Transaction reference
                <input
                  type="text"
                  required
                  placeholder="e.g. QK9182XZ71"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  className={`${fieldClass} font-mono`}
                />
              </label>
            </div>

            <label className="block text-sm font-medium">
              Settlement notes <span className="text-[var(--text-secondary)]">(optional)</span>
              <input
                type="text"
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                placeholder="e.g. Cleared via NCBA Business Banking"
                className={fieldClass}
              />
            </label>

            {paymentError && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{paymentError}</p>}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={() => setPaymentPayable(null)}
                className={actionClass}
                disabled={isSubmittingPayment}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingPayment}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[var(--brand-accent)] px-4 text-sm font-semibold text-white disabled:opacity-60 not-disabled:cursor-pointer dark:text-[var(--bg-canvas)]"
              >
                <DollarSign aria-hidden="true" className="h-4 w-4" />
                <span>{isSubmittingPayment ? 'Recording…' : 'Record payment'}</span>
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ========================================================================= */}
    </div>
  );
}

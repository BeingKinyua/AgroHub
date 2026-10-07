'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Award,
  Ban,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  Edit2,
  FileCheck,
  FileText,
  Filter,
  Lock,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  TrendingDown,
  TrendingUp,
  Upload,
  X,
} from 'lucide-react';
import { useBos } from '@/lib/services/bos-context';
import {
  Card,
  EmptyState,
  FeedbackBanner,
  KPI,
  Modal,
  PageHeader,
  StatusBadge,
} from '@/components/ui/primitives';
import {
  SupplierContract,
  SupplierDocumentItem,
  SupplierEvaluationRecord,
  SupplierRecord,
  UnitOfMeasure,
} from '@/types/domain/bos';

export default function SuppliersPage() {
  const {
    suppliers,
    products,
    can,
    currentUser,
    createSupplier,
    updateSupplier,
    approveSupplier,
    suspendSupplier,
    reactivateSupplier,
    addSupplierContract,
    updateSupplierContractStatus,
    updateSupplierPriceList,
    addSupplierPriceItem,
    removeSupplierPriceItem,
    addSupplierDocument,
    verifySupplierDocument,
    evaluateSupplierPerformance,
  } = useBos();

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Under Review' | 'Suspended'>('All');
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

  // Modals visibility
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [contractsOpen, setContractsOpen] = useState(false);
  const [priceListOpen, setPriceListOpen] = useState(false);
  const [documentsOpen, setDocumentsOpen] = useState(false);
  const [evaluationOpen, setEvaluationOpen] = useState(false);

  // 1. Create Supplier Form State
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('Fresh Vegetables & Tubers');
  const [newRegion, setNewRegion] = useState('Nyandarua County');
  const [newContact, setNewContact] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newLeadTime, setNewLeadTime] = useState(1);
  const [newTerms, setNewTerms] = useState('Net 14');

  // 2. Edit Supplier Form State
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editRegion, setEditRegion] = useState('');
  const [editContact, setEditContact] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editLeadTime, setEditLeadTime] = useState(1);
  const [editTerms, setEditTerms] = useState('');

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

  // 6. Price List Form State
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [newPriceCost, setNewPriceCost] = useState<number>(75);
  const [editingPriceProductId, setEditingPriceProductId] = useState<string | null>(null);
  const [editPriceCost, setEditPriceCost] = useState<number>(0);
  const [editPriceReason, setEditPriceReason] = useState('Seasonal harvest adjustment');

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

  // Filtered Suppliers
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      const matchSearch =
        !search.trim() ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.code.toLowerCase().includes(search.toLowerCase()) ||
        s.region.toLowerCase().includes(search.toLowerCase()) ||
        s.contactPerson.toLowerCase().includes(search.toLowerCase());

      const matchStatus = statusFilter === 'All' || s.status === statusFilter;
      const matchCategory = categoryFilter === 'All' || s.category === categoryFilter;

      return matchSearch && matchStatus && matchCategory;
    });
  }, [suppliers, search, statusFilter, categoryFilter]);

  // Counts for Header Badges
  const activeCount = suppliers.filter((s) => s.status === 'Active').length;
  const underReviewCount = suppliers.filter((s) => s.status === 'Under Review').length;
  const suspendedCount = suppliers.filter((s) => s.status === 'Suspended').length;
  const totalApKes = suppliers.reduce((sum, s) => sum + s.payableBalanceKes, 0);

  // Authorisation Checks
  const canCreate = can('suppliers.create');
  const canEdit = can('suppliers.edit');
  const canApprove = can('suppliers.approve') || can('procurement.approve') || can('approvals.approve') || can('suppliers.edit');
  const canSuspend = can('suppliers.suspend') || can('suppliers.edit') || can('procurement.approve') || can('approvals.approve');

  // Handlers
  const handleOpenEdit = (sup: SupplierRecord) => {
    setActiveSupplier(sup);
    setEditName(sup.name);
    setEditCategory(sup.category);
    setEditRegion(sup.region);
    setEditContact(sup.contactPerson);
    setEditPhone(sup.phone);
    setEditEmail(sup.email);
    setEditLeadTime(sup.leadTimeDays);
    setEditTerms(sup.paymentTerms);
    setEditOpen(true);
  };

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

  const handleOpenPriceList = (sup: SupplierRecord) => {
    setActiveSupplier(sup);
    setEditingPriceProductId(null);
    setPriceListOpen(true);
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

  // Form Submit Handlers
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const res = await createSupplier({
      name: newName.trim(),
      category: newCategory,
      region: newRegion,
      contactPerson: newContact.trim(),
      phone: newPhone.trim(),
      email: newEmail.trim(),
      leadTimeDays: Number(newLeadTime),
      paymentTerms: newTerms,
    });
    setFeedback({ msg: res.message, type: res.ok ? 'success' : 'error' });
    if (res.ok) {
      setCreateOpen(false);
      setNewName('');
      setNewContact('');
      setNewPhone('');
      setNewEmail('');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSupplier || !editName.trim()) return;
    const res = await updateSupplier(activeSupplier.id, {
      name: editName.trim(),
      category: editCategory,
      region: editRegion,
      contactPerson: editContact.trim(),
      phone: editPhone.trim(),
      email: editEmail.trim(),
      leadTimeDays: Number(editLeadTime),
      paymentTerms: editTerms,
    });
    setFeedback({ msg: res.message, type: res.ok ? 'success' : 'error' });
    if (res.ok) setEditOpen(false);
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

  const handleAddPriceItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSupplier || !selectedProductId) return;
    const prod = products.find((p) => p.id === selectedProductId);
    if (!prod) return;
    const res = await addSupplierPriceItem(activeSupplier.id, {
      productId: prod.id,
      productName: prod.name,
      unit: prod.unit,
      currentCostKes: Number(newPriceCost),
    });
    setFeedback({ msg: res.message, type: res.ok ? 'success' : 'error' });
  };

  const handleSavePriceEdit = async (productId: string) => {
    if (!activeSupplier) return;
    const res = await updateSupplierPriceList(
      activeSupplier.id,
      productId,
      Number(editPriceCost),
      editPriceReason
    );
    setFeedback({ msg: res.message, type: res.ok ? 'success' : 'error' });
    if (res.ok) setEditingPriceProductId(null);
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
      {/* Page Header (RBAC-aware) */}
      <PageHeader
        kicker="DIRECT FARM SOURCING & COOPERATIVE NETWORK"
        title="Suppliers & Governance Management"
        description="Comprehensive management of agricultural cooperatives, contract milestones, multi-tier farmgate price lists, compliance documentation, and periodic vendor performance evaluations."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {canCreate ? (
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="h-10 px-4 rounded-full bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Register Supplier</span>
              </button>
            ) : (
              <span className="h-10 px-3.5 rounded-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-secondary)] text-xs inline-flex items-center gap-1.5 opacity-80">
                <Lock className="w-3.5 h-3.5" />
                <span>Create Restricted</span>
              </span>
            )}
          </div>
        }
      />

      {/* Feedback Banner */}
      <FeedbackBanner
        message={feedback?.msg || null}
        type={feedback?.type}
        onDismiss={() => setFeedback(null)}
      />

      {/* Authorisation Banner / Posture */}
      <div className="p-3.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-[#1F6A37] dark:text-[#4EB462] shrink-0" />
          <div>
            <span className="font-semibold text-[var(--text-primary)]">
              Operator Authorization Profile:
            </span>{' '}
            <span className="text-[var(--text-secondary)]">
              {currentUser?.fullName} ({currentUser?.roleName})
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span
            className={`px-2.5 py-0.5 rounded-full font-medium ${
              canCreate
                ? 'bg-[#E5EFE6] dark:bg-[#142B1B] text-[#1F6A37] dark:text-[#4EB462]'
                : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] line-through'
            }`}
          >
            Create
          </span>
          <span
            className={`px-2.5 py-0.5 rounded-full font-medium ${
              canEdit
                ? 'bg-[#E5EFE6] dark:bg-[#142B1B] text-[#1F6A37] dark:text-[#4EB462]'
                : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] line-through'
            }`}
          >
            Edit & Price List
          </span>
          <span
            className={`px-2.5 py-0.5 rounded-full font-medium ${
              canApprove
                ? 'bg-[#E5EFE6] dark:bg-[#142B1B] text-[#1F6A37] dark:text-[#4EB462]'
                : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] line-through'
            }`}
          >
            Approve
          </span>
          <span
            className={`px-2.5 py-0.5 rounded-full font-medium ${
              canSuspend
                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] line-through'
            }`}
          >
            Suspend
          </span>
        </div>
      </div>

      {/* Decision KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI
          label="Active Farm Vendors"
          value={`${activeCount} Active`}
          sublabel={`${suppliers.length} total registered · ${underReviewCount} under review`}
          tone="positive"
        />
        <KPI
          label="Outstanding AP Obligation"
          value={`KES ${(totalApKes / 1000000).toFixed(2)}M`}
          sublabel="Net 14 & Net 30 terms across cooperatives"
          tone="neutral"
        />
        <KPI
          label="Under Review / Approvals"
          value={`${underReviewCount} Pending`}
          sublabel="Require governance sign-off"
          tone={underReviewCount > 0 ? 'warning' : 'neutral'}
        />
        <KPI
          label="Operational Suspensions"
          value={`${suspendedCount} Suspended`}
          sublabel="Zero PO dispatch permitted"
          tone={suspendedCount > 0 ? 'danger' : 'neutral'}
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {(['All', 'Active', 'Under Review', 'Suspended'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`h-8 px-3.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                statusFilter === st
                  ? 'bg-[#1F6A37] text-white shadow-sm'
                  : 'bg-[var(--bg-canvas)] hover:bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-secondary)]'
              }`}
            >
              <span>{st}</span>
              {st === 'Under Review' && underReviewCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px]">
                  {underReviewCount}
                </span>
              )}
              {st === 'Suspended' && suspendedCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-red-600 text-white text-[10px]">
                  {suspendedCount}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Dropdown */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-8 px-3 rounded-full text-xs bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)] cursor-pointer"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                Category: {c}
              </option>
            ))}
          </select>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
            <input
              type="text"
              placeholder="Search vendor or county..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 pr-3 rounded-full text-xs bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[#1F6A37] w-48 sm:w-56"
            />
          </div>
        </div>
      </div>

      {/* Supplier Grid */}
      {filteredSuppliers.length === 0 ? (
        <EmptyState
          title="No Suppliers Found"
          description="No vendor matched your current search and status filter criteria."
          actionLabel="Reset Filters"
          onAction={() => {
            setSearch('');
            setStatusFilter('All');
            setCategoryFilter('All');
          }}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredSuppliers.map((sup) => {
            const isSuspended = sup.status === 'Suspended';
            const isUnderReview = sup.status === 'Under Review';
            const contractsCount = sup.contracts?.length || 0;
            const docsCount = sup.documents?.length || 0;
            const evalCount = sup.evaluations?.length || 0;

            return (
              <Card
                key={sup.id}
                className={`space-y-4 flex flex-col justify-between transition-all ${
                  isSuspended
                    ? 'border-red-500/40 bg-red-500/[0.02]'
                    : isUnderReview
                    ? 'border-amber-500/40 bg-amber-500/[0.02]'
                    : ''
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono-tabular text-xs font-bold text-[#1F6A37] dark:text-[#4EB462]">
                          {sup.code}
                        </span>
                        <span className="text-[11px] text-[var(--text-secondary)]">
                          · {sup.region}
                        </span>
                      </div>
                      <h3 className="font-heading text-lg font-semibold mt-0.5 text-[var(--text-primary)]">
                        {sup.name}
                      </h3>
                      <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                        {sup.category} · Contact: <strong>{sup.contactPerson}</strong> ({sup.phone})
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          sup.status === 'Active'
                            ? 'bg-[#E5EFE6] dark:bg-[#142B1B] text-[#1F6A37] dark:text-[#4EB462]'
                            : sup.status === 'Under Review'
                            ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                            : 'bg-red-500/15 text-red-600 dark:text-red-400'
                        }`}
                      >
                        {sup.status}
                      </span>
                      <StatusBadge status={sup.recentPriceTrend} />
                    </div>
                  </div>

                  {/* Operational Status Callout if Under Review or Suspended */}
                  {isUnderReview && (
                    <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
                        <Clock className="w-4 h-4 shrink-0" />
                        <span>Awaiting governance authorization before issuing purchase orders.</span>
                      </div>
                      {canApprove && (
                        <button
                          type="button"
                          onClick={() => handleOpenApprove(sup)}
                          className="h-7 px-3 rounded-full bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs inline-flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approve Supplier</span>
                        </button>
                      )}
                    </div>
                  )}

                  {isSuspended && (
                    <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                        <Ban className="w-4 h-4 shrink-0" />
                        <div>
                          <strong>Account Suspended:</strong> {sup.suspendedReason || 'Governance freeze active.'}
                        </div>
                      </div>
                      {canSuspend && (
                        <button
                          type="button"
                          onClick={() => handleReactivate(sup)}
                          className="h-7 px-3 rounded-full bg-[#1F6A37] hover:bg-[#12512C] text-white font-semibold text-xs inline-flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reactivate</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Core Metrics Grid */}
                  <div className="grid grid-cols-3 gap-3 p-3 mt-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs">
                    <div>
                      <div className="text-[11px] text-[var(--text-secondary)]">Lead Time & Terms</div>
                      <div className="font-semibold mt-0.5 text-[var(--text-primary)]">
                        {sup.leadTimeDays}d · {sup.paymentTerms}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-[var(--text-secondary)]">QC Pass Score</div>
                      <div className="font-mono-tabular font-semibold text-[#1F6A37] dark:text-[#4EB462] mt-0.5">
                        {sup.qualityScorePct}%
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-[var(--text-secondary)]">Payable Balance</div>
                      <div className="font-mono-tabular font-semibold text-[var(--text-primary)] mt-0.5">
                        KES {sup.payableBalanceKes.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Price List Preview & Contracted SKUs */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-[var(--text-primary)]">
                        Contracted Produce SKUs ({sup.suppliedProducts.length})
                      </span>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => handleOpenPriceList(sup)}
                          className="text-[11px] font-semibold text-[#1F6A37] dark:text-[#4EB462] hover:underline cursor-pointer"
                        >
                          Manage Price List →
                        </button>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      {sup.suppliedProducts.slice(0, 2).map((sp) => (
                        <div
                          key={sp.productId}
                          className="p-2.5 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-medium text-[var(--text-primary)]">{sp.productName}</div>
                            <div className="text-[10px] text-[var(--text-secondary)]">
                              Prior: KES {sp.previousCostKes}/{sp.unit} · Updated {sp.lastUpdated}
                            </div>
                          </div>
                          <div className="text-right font-mono-tabular font-semibold text-[var(--text-primary)]">
                            KES {sp.currentCostKes.toLocaleString()} / {sp.unit}
                          </div>
                        </div>
                      ))}
                      {sup.suppliedProducts.length > 2 && (
                        <div className="text-[11px] text-[var(--text-secondary)] text-center pt-1">
                          +{sup.suppliedProducts.length - 2} additional SKUs on price schedule
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Action Footer with All 8 Features */}
                <div className="pt-3 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* 1. Edit */}
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(sup)}
                        className="h-7 px-2.5 rounded-full bg-[var(--bg-canvas)] hover:bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs font-medium inline-flex items-center gap-1 cursor-pointer transition-colors"
                        title="Edit vendor profile"
                      >
                        <Edit2 className="w-3 h-3 text-[var(--text-secondary)]" />
                        <span>Edit</span>
                      </button>
                    )}

                    {/* 2. Manage Contracts */}
                    <button
                      type="button"
                      onClick={() => handleOpenContracts(sup)}
                      className="h-7 px-2.5 rounded-full bg-[var(--bg-canvas)] hover:bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs font-medium inline-flex items-center gap-1 cursor-pointer transition-colors"
                      title="Manage agreements"
                    >
                      <FileText className="w-3 h-3 text-[var(--text-secondary)]" />
                      <span>Contracts ({contractsCount})</span>
                    </button>

                    {/* 3. Manage Documents */}
                    <button
                      type="button"
                      onClick={() => handleOpenDocuments(sup)}
                      className="h-7 px-2.5 rounded-full bg-[var(--bg-canvas)] hover:bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs font-medium inline-flex items-center gap-1 cursor-pointer transition-colors"
                      title="Manage compliance documents"
                    >
                      <FileCheck className="w-3 h-3 text-[var(--text-secondary)]" />
                      <span>Docs ({docsCount})</span>
                    </button>

                    {/* 4. Evaluate Performance */}
                    <button
                      type="button"
                      onClick={() => handleOpenEvaluation(sup)}
                      className="h-7 px-2.5 rounded-full bg-[var(--bg-canvas)] hover:bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs font-medium inline-flex items-center gap-1 cursor-pointer transition-colors"
                      title="Evaluate performance score"
                    >
                      <Award className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                      <span>Audit ({sup.qualityScorePct}%)</span>
                    </button>
                  </div>

                  {/* Lifecycle Controls: Approve or Suspend */}
                  <div className="flex items-center gap-1.5">
                    {isUnderReview && canApprove && (
                      <button
                        type="button"
                        onClick={() => handleOpenApprove(sup)}
                        className="h-7 px-3 rounded-full bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-semibold inline-flex items-center gap-1 cursor-pointer shadow-sm"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Approve</span>
                      </button>
                    )}

                    {sup.status === 'Active' && canSuspend && (
                      <button
                        type="button"
                        onClick={() => handleOpenSuspend(sup)}
                        className="h-7 px-3 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium inline-flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Ban className="w-3 h-3" />
                        <span>Suspend</span>
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. CREATE SUPPLIER MODAL */}
      {/* ========================================================================= */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Register Farm Cooperative / Vendor"
        subtitle="Onboard a new agricultural cooperative or miller into the Agro-Deliveries supply directory."
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Cooperative / Company Legal Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Nyandarua Potato Growers Society"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full h-9 px-3 rounded-xl text-xs bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[#1F6A37]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Produce Category *
              </label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full h-9 px-3 rounded-xl text-xs bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[#1F6A37]"
              >
                <option value="Fresh Vegetables & Tubers">Fresh Vegetables & Tubers</option>
                <option value="Dry Grains & Cereals">Dry Grains & Cereals</option>
                <option value="Fruits & Orchard">Fruits & Orchard</option>
                <option value="Leafy Greens">Leafy Greens</option>
                <option value="Dairy & Cold Chain">Dairy & Cold Chain</option>
                <option value="Herbs & Spices">Herbs & Spices</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                County / Region *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Nyandarua County"
                value={newRegion}
                onChange={(e) => setNewRegion(e.target.value)}
                className="w-full h-9 px-3 rounded-xl text-xs bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[#1F6A37]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Contact Person *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Stephen Njuguna"
                value={newContact}
                onChange={(e) => setNewContact(e.target.value)}
                className="w-full h-9 px-3 rounded-xl text-xs bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[#1F6A37]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Phone Number *
              </label>
              <input
                type="tel"
                required
                placeholder="+254 7XX XXX XXX"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="w-full h-9 px-3 rounded-xl text-xs bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[#1F6A37]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Email Address
              </label>
              <input
                type="email"
                placeholder="orders@coop.co.ke"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full h-9 px-3 rounded-xl text-xs bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[#1F6A37]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Lead Time (Days) *
              </label>
              <input
                type="number"
                min="1"
                max="14"
                required
                value={newLeadTime}
                onChange={(e) => setNewLeadTime(Number(e.target.value))}
                className="w-full h-9 px-3 rounded-xl text-xs bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[#1F6A37]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Payment Terms *
              </label>
              <select
                value={newTerms}
                onChange={(e) => setNewTerms(e.target.value)}
                className="w-full h-9 px-3 rounded-xl text-xs bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[#1F6A37]"
              >
                <option value="Net 7">Net 7</option>
                <option value="Net 14">Net 14</option>
                <option value="Net 30">Net 30</option>
                <option value="COD / M-Pesa">COD / M-Pesa</option>
              </select>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-[11px] text-amber-800 dark:text-amber-300">
            <strong>Governance Note:</strong> Newly created suppliers enter the system with <strong>Under Review</strong> status until authorized by a Procurement Officer or Operations Manager.
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="h-9 px-4 rounded-full border border-[var(--border-subtle)] text-xs font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-9 px-5 rounded-full bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-semibold cursor-pointer shadow-sm"
            >
              Register & Route for Approval
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* 2. EDIT SUPPLIER MODAL */}
      {/* ========================================================================= */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={`Edit Supplier · ${activeSupplier?.name}`}
        subtitle="Update contact credentials, contracted lead times, and payment terms."
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Cooperative / Vendor Name *
            </label>
            <input
              type="text"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full h-9 px-3 rounded-xl text-xs bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[#1F6A37]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Produce Category
              </label>
              <input
                type="text"
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                className="w-full h-9 px-3 rounded-xl text-xs bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[#1F6A37]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Region / County
              </label>
              <input
                type="text"
                value={editRegion}
                onChange={(e) => setEditRegion(e.target.value)}
                className="w-full h-9 px-3 rounded-xl text-xs bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[#1F6A37]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Contact Person
              </label>
              <input
                type="text"
                value={editContact}
                onChange={(e) => setEditContact(e.target.value)}
                className="w-full h-9 px-3 rounded-xl text-xs bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[#1F6A37]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="w-full h-9 px-3 rounded-xl text-xs bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[#1F6A37]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Email
              </label>
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="w-full h-9 px-3 rounded-xl text-xs bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[#1F6A37]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Lead Time (Days)
              </label>
              <input
                type="number"
                min="1"
                max="14"
                value={editLeadTime}
                onChange={(e) => setEditLeadTime(Number(e.target.value))}
                className="w-full h-9 px-3 rounded-xl text-xs bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[#1F6A37]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Payment Terms
              </label>
              <select
                value={editTerms}
                onChange={(e) => setEditTerms(e.target.value)}
                className="w-full h-9 px-3 rounded-xl text-xs bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[#1F6A37]"
              >
                <option value="Net 7">Net 7</option>
                <option value="Net 14">Net 14</option>
                <option value="Net 30">Net 30</option>
                <option value="COD / M-Pesa">COD / M-Pesa</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEditOpen(false)}
              className="h-9 px-4 rounded-full border border-[var(--border-subtle)] text-xs font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-9 px-5 rounded-full bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-semibold cursor-pointer"
            >
              Save Profile Changes
            </button>
          </div>
        </form>
      </Modal>

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
      {/* 6. MANAGE PRICE LIST MODAL */}
      {/* ========================================================================= */}
      <Modal
        open={priceListOpen}
        onClose={() => setPriceListOpen(false)}
        title={`Manage Farmgate Price Schedule · ${activeSupplier?.name}`}
        subtitle="Add product SKUs, adjust farmgate buying costs with audit reasons, and track trend changes."
      >
        <div className="space-y-5">
          {/* Current SKUs Table */}
          <div>
            <div className="text-xs font-semibold text-[var(--text-primary)] mb-2">
              Contracted Product Price List
            </div>

            <div className="border border-[var(--border-subtle)] rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--bg-canvas)] text-[var(--text-secondary)] border-b border-[var(--border-subtle)]">
                  <tr>
                    <th className="py-2.5 px-3">Product Name</th>
                    <th className="py-2.5 px-3 text-right">Current Cost</th>
                    <th className="py-2.5 px-3 text-right">Prior Cost</th>
                    <th className="py-2.5 px-3">Last Updated</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {activeSupplier?.suppliedProducts.map((sp) => {
                    const isEditing = editingPriceProductId === sp.productId;
                    const diff = sp.currentCostKes - sp.previousCostKes;

                    return (
                      <tr key={sp.productId} className="hover:bg-[var(--bg-canvas)]/50">
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-[var(--text-primary)]">{sp.productName}</div>
                          <div className="text-[10px] text-[var(--text-secondary)]">Unit: {sp.unit}</div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono-tabular font-bold text-[var(--text-primary)]">
                          {isEditing ? (
                            <input
                              type="number"
                              value={editPriceCost}
                              onChange={(e) => setEditPriceCost(Number(e.target.value))}
                              className="w-20 h-7 px-1 text-right rounded border border-[#1F6A37] text-xs"
                            />
                          ) : (
                            `KES ${sp.currentCostKes.toLocaleString()}`
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono-tabular text-[var(--text-secondary)] text-[11px]">
                          KES {sp.previousCostKes.toLocaleString()}
                          {diff !== 0 && (
                            <span
                              className={`ml-1 text-[10px] ${
                                diff > 0 ? 'text-red-600 dark:text-red-400' : 'text-[#1F6A37] dark:text-[#4EB462]'
                              }`}
                            >
                              ({diff > 0 ? `+${diff}` : diff})
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-[var(--text-secondary)] font-mono-tabular">
                          {sp.lastUpdated}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => handleSavePriceEdit(sp.productId)}
                                className="h-6 px-2 rounded-full bg-[#1F6A37] text-white text-[10px] font-semibold cursor-pointer"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingPriceProductId(null)}
                                className="h-6 px-2 rounded-full border border-[var(--border-subtle)] text-[10px] cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1">
                              {canEdit && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingPriceProductId(sp.productId);
                                    setEditPriceCost(sp.currentCostKes);
                                  }}
                                  className="h-6 px-2 rounded-full bg-[var(--bg-canvas)] hover:bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[10px] font-medium cursor-pointer"
                                >
                                  Revise
                                </button>
                              )}
                              {canEdit && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await removeSupplierPriceItem(activeSupplier.id, sp.productId);
                                    const sup = suppliers.find((s) => s.id === activeSupplier.id);
                                    if (sup) setActiveSupplier(sup);
                                  }}
                                  className="h-6 w-6 rounded-full hover:bg-red-500/10 text-red-600 inline-flex items-center justify-center cursor-pointer"
                                  title="Remove from vendor catalog"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Form to Add New SKU to Price List */}
          {canEdit && (
            <form onSubmit={handleAddPriceItem} className="pt-3 border-t border-[var(--border-subtle)] space-y-3">
              <div className="text-xs font-semibold text-[var(--text-primary)]">
                Add Produce SKU to Vendor Catalog
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] text-[var(--text-secondary)] mb-1">
                    Select System Product *
                  </label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => {
                      setSelectedProductId(e.target.value);
                      const p = products.find((pr) => pr.id === e.target.value);
                      if (p) setNewPriceCost(p.pricing.supplierCostKes);
                    }}
                    className="w-full h-8 px-2.5 rounded-lg text-xs bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)] cursor-pointer"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.category}) · Base Cost: KES {p.pricing.supplierCostKes}/{p.unit}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-[var(--text-secondary)] mb-1">
                    Agreed Cost (KES) *
                  </label>
                  <input
                    type="number"
                    required
                    value={newPriceCost}
                    onChange={(e) => setNewPriceCost(Number(e.target.value))}
                    className="w-full h-8 px-2.5 rounded-lg text-xs bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="h-8 px-4 rounded-full bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add SKU to Schedule</span>
                </button>
              </div>
            </form>
          )}

          <div className="flex justify-end pt-2 border-t border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => setPriceListOpen(false)}
              className="h-8 px-4 rounded-full border border-[var(--border-subtle)] text-xs font-medium cursor-pointer"
            >
              Done
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
              className="h-9 px-4 rounded-full border border-[var(--border-subtle)] text-xs font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-9 px-5 rounded-full bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-semibold cursor-pointer shadow-sm inline-flex items-center gap-1.5"
            >
              <Award className="w-4 h-4" />
              <span>Record Performance Audit</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

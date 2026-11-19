'use client';

import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Eye,
  FileText,
  FolderLock,
  Plus,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { useBos } from '@/lib/services/bos-context';
import {
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
import { DocumentRecord } from '@/types/domain/bos';

const CATEGORIES: ('All' | DocumentRecord['category'])[] = [
  'All',
  'Invoice',
  'Delivery Note',
  'Purchase Order',
  'Goods Received Note (GRN)',
  'KEBS / Quality Certificate',
  'Proof of Delivery (POD)',
  'Supplier Document',
];

export default function DocumentsPage() {
  const {
    documents,
    can,
    uploadDocumentRecord,
    verifyDocumentRecord,
    deleteDocumentRecord,
  } = useBos();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] =
    useState<'All' | DocumentRecord['category']>('All');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<DocumentRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DocumentRecord | null>(null);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<DocumentRecord['category']>(
    'Goods Received Note (GRN)'
  );
  const [linkedEntity, setLinkedEntity] = useState('PO-2026-514');
  const [feedback, setFeedback] = useState<{
    msg: string;
    type: 'success' | 'error';
  } | null>(null);

  const filteredDocs = useMemo(() => {
    return documents.filter((d) => {
      const matchesCat =
        categoryFilter === 'All' || d.category === categoryFilter;
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        d.docNumber.toLowerCase().includes(q) ||
        d.title.toLowerCase().includes(q) ||
        d.linkedEntity.toLowerCase().includes(q) ||
        d.uploadedBy.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [documents, categoryFilter, search]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !linkedEntity.trim()) return;
    const res = await uploadDocumentRecord({
      title: title.trim(),
      category,
      linkedEntity: linkedEntity.trim(),
    });
    setFeedback({ msg: res.message, type: res.ok ? 'success' : 'error' });
    if (res.ok) {
      setUploadOpen(false);
      setTitle('');
    }
  };

  return (
    <div>
      <PageHeader
        title="Documents"
        description="Find delivery proofs, goods received notes, certificates, and invoices."
        actions={
          can('documents.manage') && (
            <button
              type="button"
              onClick={() => setUploadOpen(true)}
              className="ui-button ui-button-primary"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Document</span>
            </button>
          )
        }
      />

      <FeedbackBanner
        message={feedback?.msg || null}
        type={feedback?.type}
        onDismiss={() => setFeedback(null)}
      />

      {/* KPI Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPI
          label="Total Vault Records"
          value={`${documents.length} Files`}
          sublabel="Indexed across 4 private storage buckets"
          tone="positive"
        />
        <KPI
          label="Verified Compliance Docs"
          value={`${documents.filter((d) => d.verified).length} Verified`}
          sublabel="KEBS, ePOD & Commercial Invoices"
          tone="positive"
        />
        <KPI
          label="Awaiting Verification"
          value={`${documents.filter((d) => !d.verified).length} Pending`}
          sublabel="Requires QA or Operations sign-off"
          tone={
            documents.some((d) => !d.verified) ? 'warning' : 'positive'
          }
        />
        <KPI
          label="Storage Security Policy"
          value="Private RLS"
          sublabel="Supabase Storage bucket isolation"
          tone="neutral"
        />
      </div>

      {/* Filter Bar */}
      <FilterBar
        activeFilterCount={categoryFilter !== 'All' ? 1 : 0}
        mobileDrawerContent={
          <div className="space-y-2">
            <label htmlFor="documents-filter-category" className="ui-label block">
              Document Category
            </label>
            <select id="documents-filter-category"
              value={categoryFilter}
              onChange={(e) =>
                setCategoryFilter(
                  e.target.value as 'All' | DocumentRecord['category']
                )
              }
              className="ui-field w-full"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        }
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none w-4 h-4 text-[var(--text-secondary)] absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              type="search"
              aria-label="Search documents by number, title, or reference"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by doc number, title, linked PO/Order/Batch..."
              className="ui-field w-full pl-9 pr-3.5"
            />
          </div>

          <div className="hidden sm:flex flex-wrap items-center gap-1.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                aria-pressed={categoryFilter === cat}
                className="ui-tab whitespace-nowrap"
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </FilterBar>

      {filteredDocs.length === 0 ? (
        <EmptyState
          title="No operational documents matched your filter"
          description="Try clearing the category filter or upload a new compliance document."
          actionLabel={
            can('documents.manage') ? 'Upload Document' : undefined
          }
          onAction={
            can('documents.manage') ? () => setUploadOpen(true) : undefined
          }
        />
      ) : (
        <Card padding="p-0" className="overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="ui-table w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-subtle)]">
                  <th className="py-3.5 px-4">Document Ref & Title</th>
                  <th className="py-3.5 px-4">Category & Storage Bucket</th>
                  <th className="py-3.5 px-4">Linked Entity</th>
                  <th className="py-3.5 px-4">Uploaded By</th>
                  <th className="py-3.5 px-4">Verification</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {filteredDocs.map((doc) => (
                  <tr
                    key={doc.id}
                    className="hover:bg-[var(--bg-canvas)]/60 transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-mono-tabular text-xs font-semibold text-[var(--brand-accent)]">
                        {doc.docNumber} · {doc.fileSize}
                      </div>
                      <div className="font-semibold text-[var(--text-primary)] mt-0.5">
                        {doc.title}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium">{doc.category}</div>
                      <div className="font-mono-tabular ui-meta flex items-center gap-1 mt-0.5">
                        <FolderLock className="w-3 h-3" />
                        <span>{doc.storageBucket}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono-tabular px-2 py-1 rounded-md bg-[var(--bg-canvas)] border border-[var(--border-subtle)] font-semibold">
                        {doc.linkedEntity}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div>{doc.uploadedBy}</div>
                      <div className="ui-meta">
                        {doc.uploadedAt}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge
                        status={doc.verified ? 'Verified' : 'Pending Review'}
                      />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPreviewDoc(doc)}
                          className="ui-button ui-button-secondary ui-button-compact"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect</span>
                        </button>
                        {!doc.verified && can('documents.manage') && (
                          <button
                            type="button"
                            onClick={async () => {
                              const res = await verifyDocumentRecord(doc.id);
                              setFeedback({
                                msg: res.message,
                                type: res.ok ? 'success' : 'error',
                              });
                            }}
                            className="ui-button ui-button-primary ui-button-compact"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Verify</span>
                          </button>
                        )}
                        {can('documents.manage') && (
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(doc)}
                            aria-label={`Remove ${doc.docNumber}`}
                            className="ui-button ui-button-danger ui-button-icon"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Layout */}
          <div className="md:hidden divide-y divide-[var(--border-subtle)]">
            {filteredDocs.map((doc) => (
              <div key={doc.id} className="p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono-tabular text-xs font-semibold text-[var(--brand-accent)]">
                    {doc.docNumber}
                  </span>
                  <StatusBadge
                    status={doc.verified ? 'Verified' : 'Pending Review'}
                  />
                </div>
                <div className="text-sm font-semibold text-[var(--text-primary)]">
                  {doc.title}
                </div>
                <div className="ui-meta">
                  {doc.category} · Linked: <strong>{doc.linkedEntity}</strong>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="ui-meta">
                    By {doc.uploadedBy} ({doc.fileSize})
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewDoc(doc)}
                      className="ui-button ui-button-secondary ui-button-compact"
                    >
                      Inspect
                    </button>
                    {!doc.verified && can('documents.manage') && (
                      <button
                        type="button"
                        onClick={async () => {
                          const res = await verifyDocumentRecord(doc.id);
                          setFeedback({
                            msg: res.message,
                            type: res.ok ? 'success' : 'error',
                          });
                        }}
                        className="ui-button ui-button-primary ui-button-compact"
                      >
                        Verify
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Upload Document Modal */}
      <Modal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        title="Upload Operational or Compliance Document"
        subtitle="Files are indexed into private Supabase Storage buckets and linked to BOS records."
      >
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label htmlFor="documents-title" className="ui-label block mb-1">
              Document Title
            </label>
            <input id="documents-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Signed Delivery Note — Alliance High Boarding Kitchen"
              className="ui-field w-full"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="documents-category" className="ui-label block mb-1">
                Document Category
              </label>
              <select id="documents-category"
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as DocumentRecord['category'])
                }
                className="ui-field w-full"
              >
                {CATEGORIES.filter((c) => c !== 'All').map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="documents-reference" className="ui-label block mb-1">
                Linked Entity Reference
              </label>
              <input id="documents-reference"
                type="text"
                required
                value={linkedEntity}
                onChange={(e) => setLinkedEntity(e.target.value)}
                placeholder="e.g., ORD-2026-1084 or PO-2026-514"
                className="ui-field w-full font-mono-tabular"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setUploadOpen(false)}
              className="ui-button ui-button-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="ui-button ui-button-primary"
            >
              <Plus className="w-4 h-4" />
              <span>Index Document Record</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Preview Document Modal */}
      <Modal
        open={Boolean(previewDoc)}
        onClose={() => setPreviewDoc(null)}
        title={previewDoc?.title || 'Document Metadata'}
        subtitle={`Reference: ${previewDoc?.docNumber}`}
      >
        {previewDoc && (
          <div className="space-y-4 text-sm">
            <div className="p-4 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-secondary)]">Category:</span>
                <span className="font-semibold">{previewDoc.category}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-secondary)]">
                  Linked Record:
                </span>
                <span className="font-mono-tabular font-semibold text-[var(--brand-accent)]">
                  {previewDoc.linkedEntity}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-secondary)]">
                  Storage Bucket:
                </span>
                <span className="font-mono-tabular">
                  {previewDoc.storageBucket}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-secondary)]">
                  Uploaded By:
                </span>
                <span>
                  {previewDoc.uploadedBy} ({previewDoc.uploadedAt})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-secondary)]">
                  Verification Status:
                </span>
                <StatusBadge
                  status={
                    previewDoc.verified ? 'Verified' : 'Pending Verification'
                  }
                />
              </div>
            </div>

            <div className="p-5 rounded-xl border border-dashed border-[var(--border-subtle)] text-center space-y-2">
              <FileText className="w-7 h-7 text-[var(--brand-accent)] mx-auto" />
              <div className="font-semibold text-[var(--text-primary)]">
                Digital Compliance Archive Preview
              </div>
              <p className="ui-meta max-w-sm mx-auto">
                Signed PDF/A artifact ({previewDoc.fileSize}) stored in private
                bucket <code>{previewDoc.storageBucket}</code> with SHA-256
                integrity checksum.
              </p>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Remove Operational Document Record"
        affectedItem={
          deleteTarget
            ? `${deleteTarget.docNumber} · ${deleteTarget.title}`
            : ''
        }
        consequence="Removing this document unlinks it from its operational transaction and records an immutable entry in the system Audit Trail."
        confirmLabel="Remove Document"
        destructive
        onConfirm={async () => {
          if (!deleteTarget) return;
          const res = await deleteDocumentRecord(deleteTarget.id);
          setFeedback({
            msg: res.message,
            type: res.ok ? 'success' : 'error',
          });
        }}
      />
    </div>
  );
}

'use client';

import React, { useMemo, useState } from 'react';
import { Edit2, History, Package, Plus, Search } from 'lucide-react';
import { useBos } from '@/lib/services/bos-context';
import {
  Card,
  FeedbackBanner,
  KPI,
  Modal,
  PageHeader,
  ResilientImage,
  StatusBadge,
} from '@/components/ui/primitives';
import { ProductRecord, UnitOfMeasure } from '@/types/domain/bos';
import { IMAGE_PATHS } from '@/lib/services/initial-data';

const CATEGORIES = [
  'All',
  'Fresh Vegetables',
  'Fruits & Orchard',
  'Dry Grains & Cereals',
  'Root & Tubers',
  'Dairy & Cold Chain',
  'Herbs & Greens',
] as const;

export default function ProductsPage() {
  const { products, can, createProduct, updateProduct } = useBos();
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editDetailsProduct, setEditDetailsProduct] = useState<ProductRecord | null>(
    null
  );
  const [historyProduct, setHistoryProduct] = useState<ProductRecord | null>(
    null
  );
  const [feedback, setFeedback] = useState<{
    msg: string;
    type: 'success' | 'error';
  } | null>(null);

  // Full Edit Product Form State
  const [editName, setEditName] = useState('');
  const [editSku, setEditSku] = useState('');
  const [editCategory, setEditCategory] =
    useState<ProductRecord['category']>('Fresh Vegetables');
  const [editUnit, setEditUnit] = useState<UnitOfMeasure>('kilograms');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] =
    useState<ProductRecord['status']>('Active');
  const [editReorderPoint, setEditReorderPoint] = useState(100);
  const [editBatchTracked, setEditBatchTracked] = useState(true);
  const [editExpiryTracked, setEditExpiryTracked] = useState(true);
  const [editInstKes, setEditInstKes] = useState(95);
  const [editWhlKes, setEditWhlKes] = useState(105);
  const [editRetKes, setEditRetKes] = useState(125);
  const [editOnlineKes, setEditOnlineKes] = useState(120);
  const [editCostKes, setEditCostKes] = useState(70);

  // New Product state
  const [name, setName] = useState('');
  const [sku, setSku] = useState('AG-VEG-019');
  const [category, setCategory] =
    useState<ProductRecord['category']>('Fresh Vegetables');
  const [unit, setUnit] = useState<UnitOfMeasure>('kilograms');
  const [newInstKes, setNewInstKes] = useState(95);
  const [newWhlKes, setNewWhlKes] = useState(105);
  const [newRetKes, setNewRetKes] = useState(125);
  const [newCostKes, setNewCostKes] = useState(70);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat =
        categoryFilter === 'All' || p.category === categoryFilter;
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.unit.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [products, categoryFilter, search]);

  const openEditProduct = (prod: ProductRecord) => {
    setEditDetailsProduct(prod);
    setEditName(prod.name);
    setEditSku(prod.sku);
    setEditCategory(prod.category);
    setEditUnit(prod.unit);
    setEditDescription(prod.description);
    setEditStatus(prod.status);
    setEditReorderPoint(prod.reorderPoint);
    setEditBatchTracked(prod.batchTracked);
    setEditExpiryTracked(prod.expiryTracked);
    setEditInstKes(prod.pricing.institutionalKes);
    setEditWhlKes(prod.pricing.wholesaleKes);
    setEditRetKes(prod.pricing.retailKes);
    setEditOnlineKes(prod.pricing.onlineKes);
    setEditCostKes(prod.pricing.supplierCostKes);
  };

  const handleSaveEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDetailsProduct) return;
    const res = await updateProduct(editDetailsProduct.id, {
      name: editName.trim(),
      sku: editSku.trim(),
      category: editCategory,
      unit: editUnit,
      description: editDescription.trim(),
      status: editStatus,
      reorderPoint: Number(editReorderPoint),
      batchTracked: editBatchTracked,
      expiryTracked: editExpiryTracked,
      pricing: {
        institutionalKes: Number(editInstKes),
        wholesaleKes: Number(editWhlKes),
        retailKes: Number(editRetKes),
        onlineKes: Number(editOnlineKes),
        supplierCostKes: Number(editCostKes),
      },
    });
    setFeedback({ msg: res.message, type: res.ok ? 'success' : 'error' });
    if (res.ok) setEditDetailsProduct(null);
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await createProduct({
      name,
      sku,
      category,
      unit,
      description: `Institutional and wholesale graded ${name} (${unit}).`,
      imageUrl:
        category === 'Dry Grains & Cereals'
          ? IMAGE_PATHS.dryGrains
          : IMAGE_PATHS.freshProduce,
      batchTracked: true,
      expiryTracked: true,
      reorderPoint: 100,
      pricing: {
        retailKes: Number(newRetKes),
        onlineKes: Number(newRetKes) - 5,
        wholesaleKes: Number(newWhlKes),
        institutionalKes: Number(newInstKes),
        supplierCostKes: Number(newCostKes),
      },
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
        kicker="CATALOG, UNITS OF MEASURE & MULTI-TIER PRICING"
        title="Products & Pricing Architecture"
        description="Manage fresh produce and dry foodstuff SKUs across kilograms, pieces, bunches, dozens, packs, and bags with preserved price history for future E-commerce, B2B, and POS channels."
        actions={
          can('products.create') && (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="h-10 px-4 rounded-full bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-medium inline-flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Product SKU</span>
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
          label="Active Catalog SKUs"
          value={`${products.length} Products`}
          sublabel="100% Batch & Expiry Tracked"
          tone="positive"
        />
        <KPI
          label="Supported Units of Measure"
          value="6 Units"
          sublabel="kg · pieces · bunches · dozens · packs · bags"
          tone="neutral"
        />
        <KPI
          label="Channel Price Tiers"
          value="5 Tiers"
          sublabel="Institutional · Wholesale · Online · Retail · Cost"
          tone="positive"
        />
        <KPI
          label="Low Stock / Near Reorder"
          value={`${
            products.filter((p) => p.availableQty <= p.reorderPoint).length
          } SKUs`}
          sublabel="Organic Sukuma Wiki below 400 bunches"
          tone="warning"
        />
      </div>

      {/* Filter Bar */}
      <Card className="mb-6" padding="p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-1 p-1 rounded-full bg-[var(--bg-canvas)] overflow-x-auto">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer ${
                  categoryFilter === cat
                    ? 'bg-[#1F6A37] text-white'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative w-full lg:w-64">
            <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search SKU, name, or unit..."
              className="w-full h-9 pl-9 pr-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs"
            />
          </div>
        </div>
      </Card>

      {/* Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredProducts.map((prod) => (
          <Card key={prod.id} padding="p-0" className="overflow-hidden flex flex-col justify-between">
            <div>
              <div className="h-40 relative bg-[#08190C] overflow-hidden">
                <ResilientImage
                  src={prod.imageUrl}
                  alt={prod.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#08190C]/85 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-white">
                  <span className="font-mono-tabular text-xs font-semibold text-[#4EB462]">
                    {prod.sku}
                  </span>
                  <span className="text-xs font-medium">
                    Unit: {prod.unit}
                  </span>
                </div>
              </div>

              <div className="p-5">
                <div className="text-xs text-[var(--text-secondary)]">
                  {prod.category} · Batch & Expiry Tracked
                </div>
                <h3 className="font-heading text-base font-semibold text-[var(--text-primary)] mt-1">
                  {prod.name}
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">
                  {prod.description}
                </p>

                {/* Multi-Tier Pricing Table */}
                <div className="mt-4 p-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-[11px] text-[var(--text-secondary)]">
                      Institutional Contract
                    </div>
                    <div className="font-mono-tabular font-semibold text-[#1F6A37] dark:text-[#4EB462]">
                      KES {prod.pricing.institutionalKes.toLocaleString()} /{' '}
                      {prod.unit}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[var(--text-secondary)]">
                      Wholesale / B2B
                    </div>
                    <div className="font-mono-tabular font-semibold">
                      KES {prod.pricing.wholesaleKes.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[var(--text-secondary)]">
                      Walk-In Retail / Online
                    </div>
                    <div className="font-mono-tabular">
                      KES {prod.pricing.retailKes.toLocaleString()} /{' '}
                      {prod.pricing.onlineKes.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[var(--text-secondary)]">
                      Last Supplier Cost
                    </div>
                    <div className="font-mono-tabular text-[var(--text-secondary)]">
                      KES {prod.pricing.supplierCostKes.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Stock Summary */}
                <div className="mt-3 flex items-center justify-between text-xs text-[var(--text-secondary)]">
                  <span>
                    Available:{' '}
                    <strong className="font-mono-tabular text-[var(--text-primary)]">
                      {prod.availableQty.toLocaleString()} {prod.unit}
                    </strong>
                  </span>
                  <span>
                    Reserved:{' '}
                    <strong className="font-mono-tabular">
                      {prod.reservedQty.toLocaleString()}
                    </strong>
                  </span>
                  <span>
                    Incoming:{' '}
                    <strong className="font-mono-tabular text-[#1F6A37] dark:text-[#4EB462]">
                      +{prod.incomingQty.toLocaleString()}
                    </strong>
                  </span>
                </div>
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-[var(--border-subtle)] bg-[var(--bg-canvas)]/40 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setHistoryProduct(prod)}
                className="px-2.5 py-1 rounded-full text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] inline-flex items-center gap-1.5 cursor-pointer"
              >
                <History className="w-3.5 h-3.5" />
                <span>Price History ({prod.priceHistory.length})</span>
              </button>
              <div className="flex items-center gap-1.5">
                {can('products.edit') && (
                  <button
                    type="button"
                    onClick={() => openEditProduct(prod)}
                    className="px-3 py-1.5 rounded-full bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                    title="Edit product details, SKU, specifications, and pricing"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Product</span>
                  </button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Price History Modal */}
      <Modal
        open={Boolean(historyProduct)}
        onClose={() => setHistoryProduct(null)}
        title={`Historical Pricing Ledger · ${historyProduct?.name}`}
        subtitle="Audit trail of institutional, wholesale, and supplier cost adjustments."
      >
        {historyProduct && (
          <div className="space-y-2.5">
            {historyProduct.priceHistory.map((h, i) => (
              <div
                key={i}
                className="p-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-semibold text-[var(--text-primary)]">
                    {h.tier} Tier
                  </div>
                  <div className="text-[11px] text-[var(--text-secondary)]">
                    Updated on {h.date} by {h.changedBy}
                  </div>
                </div>
                <div className="font-mono-tabular font-semibold text-[#1F6A37] dark:text-[#4EB462]">
                  KES {h.priceKes.toLocaleString()} / {historyProduct.unit}
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Create New Product Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Register New Catalog Product SKU"
        subtitle="Configure unit of measure, FEFO batch tracking, and multi-channel pricing."
      >
        <form onSubmit={handleCreateProduct} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1">
                Product Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Naivasha French Beans (Fine Grade)"
                className="w-full h-10 px-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">SKU Code</label>
              <input
                type="text"
                required
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs font-mono-tabular"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1">Category</label>
              <select
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as ProductRecord['category'])
                }
                className="w-full h-10 px-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs"
              >
                {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                Unit of Measure
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as UnitOfMeasure)}
                className="w-full h-10 px-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs"
              >
                <option value="kilograms">kilograms</option>
                <option value="pieces">pieces</option>
                <option value="bunches">bunches</option>
                <option value="dozens">dozens</option>
                <option value="packs">packs</option>
                <option value="bags">bags</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-medium mb-1">
                Supplier Cost
              </label>
              <input
                type="number"
                value={newCostKes}
                onChange={(e) => setNewCostKes(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs font-mono-tabular"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium mb-1">
                Institutional
              </label>
              <input
                type="number"
                value={newInstKes}
                onChange={(e) => setNewInstKes(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs font-mono-tabular"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium mb-1">
                Wholesale
              </label>
              <input
                type="number"
                value={newWhlKes}
                onChange={(e) => setNewWhlKes(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs font-mono-tabular"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium mb-1">
                Retail
              </label>
              <input
                type="number"
                value={newRetKes}
                onChange={(e) => setNewRetKes(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs font-mono-tabular"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="px-4 py-2 rounded-full border border-[var(--border-subtle)] text-xs font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-full bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-medium cursor-pointer"
            >
              Create Product SKU
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Product Modal */}
      <Modal
        open={Boolean(editDetailsProduct)}
        onClose={() => setEditDetailsProduct(null)}
        title={`Edit Product · ${editDetailsProduct?.name}`}
        subtitle={`Update SKU details, unit of measure, active status, buffer target, and pricing tiers for ${editDetailsProduct?.sku}.`}
      >
        <form onSubmit={handleSaveEditProduct} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1">
                Product Name *
              </label>
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="e.g., Kinangop Roma Tomatoes"
                className="w-full h-10 px-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">SKU Code *</label>
              <input
                type="text"
                required
                value={editSku}
                onChange={(e) => setEditSku(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs font-mono-tabular"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Category *</label>
              <select
                value={editCategory}
                onChange={(e) =>
                  setEditCategory(e.target.value as ProductRecord['category'])
                }
                className="w-full h-10 px-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs"
              >
                {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                Unit of Measure *
              </label>
              <select
                value={editUnit}
                onChange={(e) => setEditUnit(e.target.value as UnitOfMeasure)}
                className="w-full h-10 px-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs"
              >
                <option value="kilograms">kilograms</option>
                <option value="pieces">pieces</option>
                <option value="bunches">bunches</option>
                <option value="dozens">dozens</option>
                <option value="packs">packs</option>
                <option value="bags">bags</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                Lifecycle Status *
              </label>
              <select
                value={editStatus}
                onChange={(e) =>
                  setEditStatus(e.target.value as ProductRecord['status'])
                }
                className="w-full h-10 px-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs font-medium"
              >
                <option value="Active">Active</option>
                <option value="Seasonal Hold">Seasonal Hold</option>
                <option value="Discontinued">Discontinued</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">
              Description / Specifications
            </label>
            <textarea
              rows={2}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Grading specifications, packaging standard, origin county..."
              className="w-full p-2.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs"
            />
          </div>

          {/* Reorder and Inventory Configuration */}
          <div className="p-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] space-y-3">
            <div className="text-xs font-semibold text-[var(--text-primary)]">
              Warehouse & Stock Thresholds
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-[var(--text-secondary)] mb-1">
                  Buffer Target / Reorder Point ({editUnit})
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={editReorderPoint}
                  onChange={(e) => setEditReorderPoint(Number(e.target.value))}
                  className="w-full h-9 px-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs font-mono-tabular"
                />
              </div>
              <div className="flex items-center gap-2 pt-5">
                <input
                  type="checkbox"
                  id="editBatchTracked"
                  checked={editBatchTracked}
                  onChange={(e) => setEditBatchTracked(e.target.checked)}
                  className="rounded text-[#1F6A37] focus:ring-[#1F6A37]"
                />
                <label htmlFor="editBatchTracked" className="text-xs text-[var(--text-secondary)] cursor-pointer">
                  FEFO Batch Tracked
                </label>
              </div>
              <div className="flex items-center gap-2 pt-5">
                <input
                  type="checkbox"
                  id="editExpiryTracked"
                  checked={editExpiryTracked}
                  onChange={(e) => setEditExpiryTracked(e.target.checked)}
                  className="rounded text-[#1F6A37] focus:ring-[#1F6A37]"
                />
                <label htmlFor="editExpiryTracked" className="text-xs text-[var(--text-secondary)] cursor-pointer">
                  Expiry Date Tracked
                </label>
              </div>
            </div>
          </div>

          {/* Pricing Tiers Section */}
          <div className="p-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] space-y-3">
            <div className="text-xs font-semibold text-[var(--text-primary)]">
              Multi-Channel Price Schedule (KES / {editUnit})
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              <div>
                <label className="block text-[11px] text-[var(--text-secondary)] mb-1">
                  Supplier Cost
                </label>
                <input
                  type="number"
                  required
                  value={editCostKes}
                  onChange={(e) => setEditCostKes(Number(e.target.value))}
                  className="w-full h-9 px-2.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs font-mono-tabular"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[var(--text-secondary)] mb-1">
                  Institutional
                </label>
                <input
                  type="number"
                  required
                  value={editInstKes}
                  onChange={(e) => setEditInstKes(Number(e.target.value))}
                  className="w-full h-9 px-2.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs font-mono-tabular font-semibold text-[#1F6A37] dark:text-[#4EB462]"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[var(--text-secondary)] mb-1">
                  Wholesale
                </label>
                <input
                  type="number"
                  required
                  value={editWhlKes}
                  onChange={(e) => setEditWhlKes(Number(e.target.value))}
                  className="w-full h-9 px-2.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs font-mono-tabular font-semibold"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[var(--text-secondary)] mb-1">
                  Retail (POS)
                </label>
                <input
                  type="number"
                  required
                  value={editRetKes}
                  onChange={(e) => setEditRetKes(Number(e.target.value))}
                  className="w-full h-9 px-2.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs font-mono-tabular"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[var(--text-secondary)] mb-1">
                  Online
                </label>
                <input
                  type="number"
                  required
                  value={editOnlineKes}
                  onChange={(e) => setEditOnlineKes(Number(e.target.value))}
                  className="w-full h-9 px-2.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs font-mono-tabular"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEditDetailsProduct(null)}
              className="px-4 py-2 rounded-full border border-[var(--border-subtle)] text-xs font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-full bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-semibold cursor-pointer shadow-sm inline-flex items-center gap-1.5"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

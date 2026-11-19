'use client';

import React, { useMemo, useState } from 'react';
import {
  Archive,
  Edit2,
  LayoutGrid,
  LineChart,
  Minus,
  Plus,
  RotateCcw,
  Search,
  Table2,
  Trash2,
  TrendingDown,
  TrendingUp,
  Truck,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { useBos } from '@/lib/services/bos-context';
import {
  Card,
  FeedbackBanner,
  ImageUploadZone,
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

const cardButton = 'ui-button ui-button-secondary';
const primaryButton = 'ui-button ui-button-primary';
const formControl = 'ui-field w-full';
const formatKes = (amount: number) => `KES ${amount.toLocaleString('en-KE')}`;
const formatStock = (amount: number, unit: UnitOfMeasure) => `${amount.toLocaleString('en-KE')} ${unit}`;

type CatalogView = 'table' | 'grid';
type LifecycleAction = 'archive' | 'restore' | 'delete';

export default function ProductsPage() {
  const {
    products,
    can,
    createProduct,
    updateProduct,
    getNextSku,
    archiveProduct,
    restoreProduct,
    deleteProduct,
    getSuppliersForProduct,
  } = useBos();

  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<CatalogView>('table');
  const [detailProductId, setDetailProductId] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [lifecycleAction, setLifecycleAction] = useState<LifecycleAction | null>(null);
  const [lifecycleError, setLifecycleError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editDetailsProduct, setEditDetailsProduct] = useState<ProductRecord | null>(
    null
  );
  const [historyProduct, setHistoryProduct] = useState<ProductRecord | null>(
    null
  );
  const [sourcingModalProduct, setSourcingModalProduct] = useState<ProductRecord | null>(
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
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editInstKes, setEditInstKes] = useState(95);
  const [editWhlKes, setEditWhlKes] = useState(105);
  const [editRetKes, setEditRetKes] = useState(125);
  const [editOnlineKes, setEditOnlineKes] = useState(120);
  const [editCostKes, setEditCostKes] = useState(70);
  const [editError, setEditError] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // New Product state
  const [name, setName] = useState('');
  const [category, setCategory] =
    useState<ProductRecord['category']>('Fresh Vegetables');
  const [sku, setSku] = useState('AD-VEG-001');
  const [unit, setUnit] = useState<UnitOfMeasure>('kilograms');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ProductRecord['status']>('Active');
  const [batchTracked, setBatchTracked] = useState(true);
  const [expiryTracked, setExpiryTracked] = useState(true);
  const [reorderPoint, setReorderPoint] = useState(50);
  const [newInstKes, setNewInstKes] = useState(95);
  const [newWhlKes, setNewWhlKes] = useState(105);
  const [newRetKes, setNewRetKes] = useState(125);
  const [newOnlineKes, setNewOnlineKes] = useState(120);
  const [newCostKes, setNewCostKes] = useState(70);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  const handleCategoryChange = (newCat: ProductRecord['category']) => {
    setCategory(newCat);
    setSku(getNextSku(newCat));
  };

  const resetNewProductForm = () => {
    setName('');
    const generatedSku = getNextSku('Fresh Vegetables');
    setCategory('Fresh Vegetables');
    setSku(generatedSku);
    setUploadedImage(null);
    setDescription('');
    setStatus('Active');
    setBatchTracked(true);
    setExpiryTracked(true);
    setReorderPoint(50);
    setNewCostKes(70);
    setNewInstKes(95);
    setNewWhlKes(105);
    setNewRetKes(125);
    setNewOnlineKes(120);
    setFormErrors({});
  };

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat =
        categoryFilter === 'All' || p.category === categoryFilter;
      const matchStatus =
        statusFilter === 'All'
          ? p.status !== 'Archived'
          : p.status === statusFilter;
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.unit.toLowerCase().includes(q);
      return matchCat && matchStatus && matchSearch;
    });
  }, [products, categoryFilter, statusFilter, search]);
  const filterCategories = [...new Set(products.map((product) => product.category))].sort();
  const detailProduct = products.find((product) => product.id === detailProductId);
  const supplierCount = detailProduct ? getSuppliersForProduct(detailProduct.id).length : 0;

  // Derived Supplier Cost trend metrics and timeline chart data
  const supplierTrend = useMemo(() => {
    if (!historyProduct) return null;

    // Filter strictly for 'Supplier Cost' tier only
    const supplierEntries = historyProduct.priceHistory.filter(
      (h) => h.tier === 'Supplier Cost'
    );

    // Sort chronologically (oldest date first)
    const sorted = [...supplierEntries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const currentPrice = historyProduct.pricing.supplierCostKes;
    const todayStr = new Date().toISOString().split('T')[0];

    const allPoints = [...sorted];
    if (
      allPoints.length === 0 ||
      (allPoints[allPoints.length - 1].priceKes !== currentPrice &&
        allPoints[allPoints.length - 1].date !== todayStr)
    ) {
      allPoints.push({
        date: todayStr,
        tier: 'Supplier Cost' as const,
        priceKes: currentPrice,
        changedBy: 'Current Active Procurement Cost',
      });
    }

    const prices = allPoints.map((p) => p.priceKes);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const initialPrice = allPoints[0].priceKes;
    const latestPrice = allPoints[allPoints.length - 1].priceKes;
    const diffKes = latestPrice - initialPrice;
    const diffPct = initialPrice > 0 ? (diffKes / initialPrice) * 100 : 0;

    const chartData = allPoints.map((p, index) => {
      const prevPrice = index > 0 ? allPoints[index - 1].priceKes : p.priceKes;
      const stepDiff = p.priceKes - prevPrice;
      const parts = p.date.split('-');
      const monthNames = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
      ];
      let formattedDate = p.date;
      if (parts.length >= 3) {
        const mIdx = parseInt(parts[1], 10) - 1;
        const mName = monthNames[mIdx] || parts[1];
        formattedDate = `${parseInt(parts[2], 10)} ${mName}`;
      }

      return {
        date: p.date,
        formattedDate,
        fullDate: p.date,
        priceKes: p.priceKes,
        changedBy: p.changedBy,
        stepDiff,
      };
    });

    return {
      chartData,
      allPoints,
      minPrice,
      maxPrice,
      initialPrice,
      latestPrice,
      diffKes,
      diffPct,
      unit: historyProduct.unit,
      sku: historyProduct.sku,
      name: historyProduct.name,
    };
  }, [historyProduct]);

  const openEditProduct = (prod: ProductRecord) => {
    setEditError('');
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
    setEditImageUrl(prod.imageUrl || '');
    setEditInstKes(prod.pricing.institutionalKes);
    setEditWhlKes(prod.pricing.wholesaleKes);
    setEditRetKes(prod.pricing.retailKes);
    setEditOnlineKes(prod.pricing.onlineKes);
    setEditCostKes(prod.pricing.supplierCostKes);
  };

  const handleSaveEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDetailsProduct || savingEdit) return;
    const fallback =
      editCategory === 'Dry Grains & Cereals'
        ? IMAGE_PATHS.dryGrains
        : editCategory === 'Dairy & Cold Chain'
        ? IMAGE_PATHS.warehouseColdChain
        : IMAGE_PATHS.freshProduce;

    setSavingEdit(true);
    setEditError('');
    try {
      const res = await updateProduct(editDetailsProduct.id, {
        name: editName.trim(),
        sku: editSku.trim(),
        category: editCategory,
        unit: editUnit,
        description: editDescription.trim(),
        status: editStatus,
        imageUrl: editImageUrl || fallback,
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
      if (res.ok) {
        setFeedback({ msg: res.message, type: 'success' });
        setEditDetailsProduct(null);
      } else setEditError(res.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const openProduct = (productId: string) => {
    setLifecycleError('');
    setDetailProductId(productId);
  };

  const updateProductLifecycle = async (action: LifecycleAction) => {
    if (!detailProduct || lifecycleAction) return;
    setLifecycleAction(action);
    setLifecycleError('');
    try {
      const operation = { archive: archiveProduct, restore: restoreProduct, delete: deleteProduct }[action];
      const result = await operation(detailProduct.id);
      if (!result.ok) {
        setLifecycleError(result.message);
        return;
      }
      setFeedback({ msg: result.message, type: 'success' });
      if (action === 'delete') {
        setConfirmingDelete(false);
        setDetailProductId(null);
      }
    } finally {
      setLifecycleAction(null);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { [key: string]: string } = {};

    const cleanName = name.trim();
    const cleanSku = sku.trim().toUpperCase();

    if (!cleanName) {
      errors.name = 'Product name is required.';
    }
    if (!cleanSku) {
      errors.sku = 'SKU code is required.';
    } else if (products.some((p) => p.sku.trim().toUpperCase() === cleanSku)) {
      errors.sku = `SKU "${cleanSku}" is already registered. Please choose a unique SKU.`;
    }

    if (newCostKes <= 0) errors.cost = 'Cost price must be greater than zero.';
    if (newInstKes <= 0) errors.inst = 'Institutional price must be greater than zero.';
    if (newWhlKes <= 0) errors.whl = 'Wholesale price must be greater than zero.';
    if (newRetKes <= 0) errors.ret = 'Retail price must be greater than zero.';
    if (newOnlineKes <= 0) errors.online = 'Online price must be greater than zero.';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setFeedback({
        msg: 'Please correct the validation errors in the product form.',
        type: 'error',
      });
      return;
    }

    setFormErrors({});
    setIsSubmitting(true);

    const fallbackImage =
      category === 'Dry Grains & Cereals'
        ? IMAGE_PATHS.dryGrains
        : category === 'Dairy & Cold Chain'
        ? IMAGE_PATHS.warehouseColdChain
        : IMAGE_PATHS.freshProduce;

    const res = await createProduct({
      name: cleanName,
      sku: cleanSku,
      category,
      unit,
      description: description.trim() || `Grade A ${cleanName} (${unit}) graded for institutional kitchens and B2B off-take.`,
      imageUrl: uploadedImage || fallbackImage,
      batchTracked,
      expiryTracked,
      reorderPoint: Number(reorderPoint) || 50,
      pricing: {
        retailKes: Number(newRetKes),
        onlineKes: Number(newOnlineKes),
        wholesaleKes: Number(newWhlKes),
        institutionalKes: Number(newInstKes),
        supplierCostKes: Number(newCostKes),
      },
    });

    setIsSubmitting(false);
    setFeedback({ msg: res.message, type: res.ok ? 'success' : 'error' });
    if (res.ok) {
      setCreateOpen(false);
      resetNewProductForm();
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description="Browse the catalogue, check availability and manage pricing."
        actions={can('products.create') && (
          <button type="button" className={primaryButton} onClick={() => { resetNewProductForm(); setCreateOpen(true); }}>
            <Plus size={17} aria-hidden="true" /> New product
          </button>
        )}
      />
      <FeedbackBanner
        message={feedback?.msg ?? null}
        type={feedback?.type}
        onDismiss={() => setFeedback(null)}
      />

      <Card padding="p-4" className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <label className="ui-label block space-y-1">
            <span>Search products</span>
            <div className="relative">
              <Search size={17} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
              <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, SKU or unit"
                className={`${formControl} pl-10`} />
            </div>
          </label>
          <label className="ui-label block space-y-1">
            <span>Category</span>
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className={formControl}>
              <option value="All">All categories</option>
              {filterCategories.map((category) => <option key={category}>{category}</option>)}
            </select>
          </label>
          <label className="ui-label block space-y-1">
            <span>Status</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={formControl}>
              <option value="All">Current catalogue</option>
              <option value="Active">Active</option>
              <option value="Seasonal Hold">Seasonal hold</option>
              <option value="Discontinued">Discontinued</option>
              <option value="Archived">Archived</option>
            </select>
          </label>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[var(--text-secondary)]" role="status">
            {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}
          </p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Catalogue view">
            <button type="button" aria-pressed={view === 'table'} onClick={() => setView('table')}
              className="ui-tab">
              <Table2 size={16} aria-hidden="true" /> Table
            </button>
            <button type="button" aria-pressed={view === 'grid'} onClick={() => setView('grid')}
              className="ui-tab">
              <LayoutGrid size={16} aria-hidden="true" /> Grid
            </button>
          </div>
        </div>
      </Card>

      {filteredProducts.length === 0 ? (
        <Card padding="p-6" className="space-y-3">
          <p className="text-sm">No products match these filters.</p>
          {(search || categoryFilter !== 'All' || statusFilter !== 'All') &&
            <button type="button" className={cardButton} onClick={() => { setSearch(''); setCategoryFilter('All'); setStatusFilter('All'); }}>Clear filters</button>}
        </Card>
      ) : view === 'table' ? (
        <Card padding="p-0" className="overflow-hidden">
          <table className="ui-table w-full table-fixed text-left" aria-label="Product catalogue">
            <thead className="border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-xs text-[var(--text-secondary)]">
              <tr>
                <th scope="col" className="px-3 py-3 sm:w-1/3 sm:px-4">Product</th>
                <th scope="col" className="hidden px-3 py-3 lg:table-cell">Category</th>
                <th scope="col" className="w-1/4 px-2 py-3 sm:w-auto sm:px-3">Available</th>
                <th scope="col" className="hidden px-3 py-3 md:table-cell">Institutional</th>
                <th scope="col" className="w-32 px-2 py-3 sm:px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-[var(--bg-canvas)]">
                  <th scope="row" className="px-3 py-2 font-normal sm:px-4">
                    <button type="button" onClick={() => openProduct(product.id)}
                      className="ui-button ui-button-ghost w-full justify-start break-words whitespace-normal text-left hover:underline">
                      {product.name}
                    </button>
                    <span className="block break-words text-xs text-[var(--text-secondary)]">{product.sku}</span>
                  </th>
                  <td className="hidden break-words px-3 py-3 text-[var(--text-secondary)] lg:table-cell">{product.category}</td>
                  <td className="px-2 py-3 tabular-nums sm:px-3">
                    <span className="block break-words">{formatStock(product.availableQty, product.unit)}</span>
                    {product.status === 'Active' && product.availableQty <= product.reorderPoint &&
                      <span className="block text-xs text-[var(--status-warning-fg)]">Reorder</span>}
                  </td>
                  <td className="hidden px-3 py-3 tabular-nums md:table-cell">{formatKes(product.pricing.institutionalKes)}</td>
                  <td className="px-2 py-3 sm:px-4"><StatusBadge status={product.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <ul aria-label="Product catalogue" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredProducts.map((product) => (
            <li key={product.id}>
              <Card padding="p-0" className="flex h-full flex-col overflow-hidden">
                <div className="aspect-[16/8] bg-[var(--bg-subtle)]">
                  <ResilientImage key={product.imageUrl} src={product.imageUrl} alt="" fallbackLabel="Product image unavailable" className="h-full w-full object-cover" />
                </div>
                <div className="flex flex-1 flex-col gap-3 p-4">
                  <div className="min-w-0">
                    <p className="text-xs text-[var(--text-secondary)]">{product.sku} · {product.category}</p>
                    <h2 className="ui-section-title mt-1">{product.name}</h2>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="tabular-nums">{formatStock(product.availableQty, product.unit)} available</span>
                    <StatusBadge status={product.status} />
                  </div>
                  <button type="button" onClick={() => openProduct(product.id)} className={`${cardButton} mt-auto self-start`}
                    aria-label={`View product details for ${product.name}`}>View details</button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={Boolean(detailProduct && !editDetailsProduct && !historyProduct && !sourcingModalProduct && !confirmingDelete)}
        onClose={() => setDetailProductId(null)}
        title={detailProduct?.name ?? 'Product details'}
        subtitle={detailProduct && `${detailProduct.sku} · ${detailProduct.category}`}
        size="2xl"
      >
        {detailProduct && (
          <div className="space-y-5">
            <div className="grid items-start gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
              <div className="aspect-[16/10] overflow-hidden rounded-xl bg-[var(--bg-subtle)]">
                <ResilientImage key={detailProduct.imageUrl} src={detailProduct.imageUrl} alt="" fallbackLabel="Product image unavailable" className="h-full w-full object-cover" />
              </div>
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={detailProduct.status} />
                  <span className="text-sm text-[var(--text-secondary)]">Unit · {detailProduct.unit}</span>
                </div>
                {detailProduct.description && <p className="text-sm leading-relaxed">{detailProduct.description}</p>}
                <p className="text-sm text-[var(--text-secondary)]">
                  Batch tracking {detailProduct.batchTracked ? 'on' : 'off'} · Expiry tracking {detailProduct.expiryTracked ? 'on' : 'off'}
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <section className="space-y-3 rounded-xl border border-[var(--border-subtle)] p-4">
                <h3 className="ui-section-title">Stock</h3>
                <dl className="grid grid-cols-2 gap-3 text-sm tabular-nums">
                  <div><dt className="text-[var(--text-secondary)]">Available</dt><dd className="font-semibold">{formatStock(detailProduct.availableQty, detailProduct.unit)}</dd></div>
                  <div><dt className="text-[var(--text-secondary)]">Reserved</dt><dd>{formatStock(detailProduct.reservedQty, detailProduct.unit)}</dd></div>
                  <div><dt className="text-[var(--text-secondary)]">Incoming</dt><dd>{formatStock(detailProduct.incomingQty, detailProduct.unit)}</dd></div>
                  <div><dt className="text-[var(--text-secondary)]">Reorder point</dt><dd>{formatStock(detailProduct.reorderPoint, detailProduct.unit)}</dd></div>
                </dl>
              </section>
              <section className="space-y-3 rounded-xl border border-[var(--border-subtle)] p-4">
                <h3 className="ui-section-title">Pricing per unit</h3>
                <dl className="grid grid-cols-2 gap-3 text-sm tabular-nums">
                  <div><dt className="text-[var(--text-secondary)]">Institutional</dt><dd className="font-semibold">{formatKes(detailProduct.pricing.institutionalKes)}</dd></div>
                  <div><dt className="text-[var(--text-secondary)]">Wholesale</dt><dd>{formatKes(detailProduct.pricing.wholesaleKes)}</dd></div>
                  <div><dt className="text-[var(--text-secondary)]">Retail</dt><dd>{formatKes(detailProduct.pricing.retailKes)}</dd></div>
                  <div><dt className="text-[var(--text-secondary)]">Online</dt><dd>{formatKes(detailProduct.pricing.onlineKes)}</dd></div>
                  <div><dt className="text-[var(--text-secondary)]">Catalogue supplier cost</dt><dd>{formatKes(detailProduct.pricing.supplierCostKes)}</dd></div>
                </dl>
              </section>
            </div>
            {lifecycleError && <p role="alert" className="text-sm text-[var(--status-danger-fg)]">{lifecycleError}</p>}
            <div className="flex flex-wrap gap-2 border-t border-[var(--border-subtle)] pt-3">
              <button type="button" className={cardButton} onClick={() => setHistoryProduct(detailProduct)}>
                <LineChart size={16} aria-hidden="true" /> Price history
              </button>
              <button type="button" className={cardButton} onClick={() => setSourcingModalProduct(detailProduct)}>
                <Truck size={16} aria-hidden="true" /> Sourcing ({supplierCount})
              </button>
              {can('products.edit') && (
                <>
                  <button type="button" className={primaryButton} onClick={() => openEditProduct(detailProduct)}>
                    <Edit2 size={16} aria-hidden="true" /> Edit product
                  </button>
                  {detailProduct.status === 'Archived' ? (
                    <button type="button" className={cardButton} disabled={Boolean(lifecycleAction)} onClick={() => void updateProductLifecycle('restore')}>
                      <RotateCcw size={16} aria-hidden="true" /> {lifecycleAction === 'restore' ? 'Restoring…' : 'Restore'}
                    </button>
                  ) : (
                    <button type="button" className={cardButton} disabled={Boolean(lifecycleAction)} onClick={() => void updateProductLifecycle('archive')}>
                      <Archive size={16} aria-hidden="true" /> {lifecycleAction === 'archive' ? 'Archiving…' : 'Archive'}
                    </button>
                  )}
                  <button type="button" className="ui-button ui-button-danger" disabled={Boolean(lifecycleAction)}
                    onClick={() => { setLifecycleError(''); setConfirmingDelete(true); }}>
                    <Trash2 size={16} aria-hidden="true" /> Delete
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(confirmingDelete && detailProduct)}
        onClose={() => { if (!lifecycleAction) { setConfirmingDelete(false); setLifecycleError(''); } }}
        title="Delete product?"
        subtitle={detailProduct?.name}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm">Deleting permanently removes this product from the catalogue.</p>
          {lifecycleError && <p role="alert" className="text-sm text-[var(--status-danger-fg)]">{lifecycleError}</p>}
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" className={cardButton} disabled={Boolean(lifecycleAction)}
              onClick={() => { setConfirmingDelete(false); setLifecycleError(''); }}>Cancel</button>
            <button type="button" className="ui-button ui-button-danger" disabled={Boolean(lifecycleAction)}
              onClick={() => void updateProductLifecycle('delete')}>{lifecycleAction === 'delete' ? 'Deleting…' : 'Delete product'}</button>
          </div>
        </div>
      </Modal>

      {/* Supplier Purchase Price History Timeline Modal */}
      <Modal
        open={Boolean(historyProduct)}
        onClose={() => setHistoryProduct(null)}
        title={`Supplier Purchase Price Trend · ${historyProduct?.name}`}
        subtitle={`Procurement timeline graph tracking supplier acquisition cost adjustments for ${historyProduct?.sku} (${historyProduct?.unit}).`}
      >
        {supplierTrend && (
          <div className="space-y-4">
            {/* Summary KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)]">
                <div className="ui-meta font-medium text-[var(--text-secondary)]">
                  Current Purchase Price
                </div>
                <div className="text-base font-bold font-mono text-[var(--brand-accent)] mt-0.5">
                  KES {supplierTrend.latestPrice.toLocaleString()}
                </div>
                <div className="ui-meta text-[var(--text-secondary)]">
                  per {supplierTrend.unit}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)]">
                <div className="ui-meta font-medium text-[var(--text-secondary)]">
                  Baseline Recorded Price
                </div>
                <div className="text-base font-semibold font-mono text-[var(--text-primary)] mt-0.5">
                  KES {supplierTrend.initialPrice.toLocaleString()}
                </div>
                <div className="ui-meta text-[var(--text-secondary)]">
                  First tracked milestone
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)]">
                <div className="ui-meta font-medium text-[var(--text-secondary)]">
                  Overall Net Variance
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  {supplierTrend.diffKes > 0 ? (
                    <TrendingUp className="w-3.5 h-3.5 text-[var(--status-warning-fg)]" />
                  ) : supplierTrend.diffKes < 0 ? (
                    <TrendingDown className="w-3.5 h-3.5 text-[var(--brand-accent)]" />
                  ) : (
                    <Minus className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                  )}
                  <span
                    className={`text-sm font-bold font-mono ${
                      supplierTrend.diffKes > 0
                        ? 'text-[var(--status-warning-fg)]'
                        : supplierTrend.diffKes < 0
                        ? 'text-[var(--status-success-fg)]'
                        : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    {supplierTrend.diffKes > 0 ? '+' : ''}
                    {supplierTrend.diffKes.toLocaleString()} KES ({supplierTrend.diffPct > 0 ? '+' : ''}
                    {supplierTrend.diffPct.toFixed(1)}%)
                  </span>
                </div>
                <div className="ui-meta text-[var(--text-secondary)]">
                  Cost shift over time
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)]">
                <div className="ui-meta font-medium text-[var(--text-secondary)]">
                  Procurement Band
                </div>
                <div className="text-xs font-mono font-semibold text-[var(--text-primary)] mt-1">
                  Low: KES {supplierTrend.minPrice.toLocaleString()}
                </div>
                <div className="text-xs font-mono font-semibold text-[var(--text-secondary)]">
                  High: KES {supplierTrend.maxPrice.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Timeline Area Graph */}
            <div className="p-4 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <LineChart className="w-4 h-4 text-[var(--brand-accent)]" />
                  <span className="text-xs font-semibold text-[var(--text-primary)]">
                    Supplier Purchase Price Timeline (KES / {supplierTrend.unit})
                  </span>
                </div>
                <span className="ui-meta text-[var(--text-secondary)] font-mono">
                  {supplierTrend.chartData.length} timeline milestones
                </span>
              </div>

              <div className="h-56 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={supplierTrend.chartData}
                    margin={{ top: 10, right: 15, left: 5, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="supplierCostGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--brand-accent)" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="var(--brand-accent)" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(61, 105, 74, 0.15)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="formattedDate"
                      stroke="var(--text-secondary)"
                      tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
                      tickLine={false}
                      axisLine={{ stroke: 'rgba(61, 105, 74, 0.2)' }}
                    />
                    <YAxis
                      domain={[
                        (dataMin: number) => Math.max(0, Math.floor(dataMin * 0.9)),
                        (dataMax: number) => Math.ceil(dataMax * 1.1),
                      ]}
                      stroke="var(--text-secondary)"
                      tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val: number) =>
                        `KES ${val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}`
                      }
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload as {
                            fullDate: string;
                            priceKes: number;
                            changedBy: string;
                            stepDiff: number;
                          };
                          return (
                            <div className="rounded-xl bg-[var(--bg-card)] border border-[var(--status-success-border)] p-3 shadow-xl text-xs text-[var(--text-primary)]">
                              <div className="flex items-center justify-between gap-3 text-xs text-[var(--text-secondary)] mb-1">
                                <span>{data.fullDate}</span>
                                <span className="font-mono text-xs bg-[var(--status-success-bg)] px-1.5 py-0.5 rounded text-[var(--brand-accent)]">
                                  Supplier Purchase Price
                                </span>
                              </div>
                              <div className="text-sm font-semibold font-mono text-[var(--brand-accent)]">
                                KES {data.priceKes.toLocaleString()}{' '}
                                <span className="text-xs font-normal text-[var(--text-secondary)]">
                                  / {supplierTrend.unit}
                                </span>
                              </div>
                              {data.stepDiff !== 0 && (
                                <div className="text-xs mt-1 flex items-center gap-1 font-mono">
                                  <span className="text-[var(--text-secondary)]">Vs Prior:</span>
                                  <span
                                    className={
                                      data.stepDiff > 0
                                        ? 'text-[var(--status-warning-fg)]'
                                        : 'text-[var(--status-success-fg)]'
                                    }
                                  >
                                    {data.stepDiff > 0
                                      ? `+KES ${data.stepDiff.toLocaleString()}`
                                      : `-KES ${Math.abs(data.stepDiff).toLocaleString()}`}
                                  </span>
                                </div>
                              )}
                              <div className="text-xs text-[var(--text-secondary)] mt-1.5 border-t border-[var(--status-success-border)] pt-1">
                                Logged By:{' '}
                                <span className="text-[var(--text-primary)]">{data.changedBy}</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="priceKes"
                      stroke="var(--brand-accent)"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#supplierCostGradient)"
                      dot={{ r: 4, fill: 'var(--brand-accent)', stroke: 'var(--bg-card)', strokeWidth: 1.5 }}
                      activeDot={{ r: 6, fill: 'var(--brand-accent)', stroke: 'var(--bg-card)', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Historical Milestones Ledger (Only Supplier Cost) */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-[var(--text-primary)] flex items-center justify-between">
                <span>Supplier Purchase Price Adjustment Log</span>
                <span className="ui-meta font-normal text-[var(--text-secondary)]">
                  Exclusively supplier acquisition cost tier
                </span>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                {[...supplierTrend.chartData].reverse().map((entry, idx) => (
                  <div
                    key={`${entry.date}-${idx}`}
                    className="p-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] flex items-center justify-between text-xs hover:border-[var(--status-success-border)] transition-colors"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[var(--text-primary)] font-mono">
                          {entry.fullDate}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[var(--status-success-bg)] text-[var(--brand-accent)]">
                          Supplier Purchase Price
                        </span>
                      </div>
                      <div className="ui-meta text-[var(--text-secondary)]">
                        Procurement Officer:{' '}
                        <strong className="font-medium text-[var(--text-primary)]">
                          {entry.changedBy}
                        </strong>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono-tabular font-bold text-sm text-[var(--brand-accent)]">
                        KES {entry.priceKes.toLocaleString()}
                        <span className="ui-meta font-normal text-[var(--text-secondary)]">
                          {' '}
                          / {supplierTrend.unit}
                        </span>
                      </div>
                      {entry.stepDiff !== 0 ? (
                        <div
                          className={`text-xs font-mono font-medium ${
                            entry.stepDiff > 0
                              ? 'text-[var(--status-warning-fg)]'
                              : 'text-[var(--status-success-fg)]'
                          }`}
                        >
                          {entry.stepDiff > 0
                            ? `+KES ${entry.stepDiff.toLocaleString()}`
                            : `-KES ${Math.abs(entry.stepDiff).toLocaleString()}`}{' '}
                          vs prior
                        </div>
                      ) : (
                        <div className="ui-meta text-[var(--text-secondary)]">
                          Baseline rate
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Create New Product Modal (Phase B: 4.1 - 4.4) */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        size="2xl"
        title="Register New Catalog Product SKU"
        subtitle="Configure primary product image, FEFO batch tracking, buffer thresholds, and multi-tier pricing."
        hasUnsavedChanges={Boolean(name.trim()) || Boolean(uploadedImage) || Boolean(description.trim())}
        onConfirmDiscard={() => {
          setCreateOpen(false);
          resetNewProductForm();
        }}
      >
        <form onSubmit={handleCreateProduct} className="space-y-4">
          {/* Section 1: Basic Information */}
          <div className="p-4 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] space-y-3">
            <div className="text-xs font-semibold text-[var(--text-primary)]">
              1. Basic SKU Information
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="products-product-name" className="ui-label block mb-1">
                  Product Name *
                </label>
                <input aria-invalid={Boolean(formErrors.name)} id="products-product-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (formErrors.name) setFormErrors((prev) => ({ ...prev, name: '' }));
                  }}
                  placeholder="e.g., Naivasha Grade A French Beans"
                  className={`ui-field w-full ${
                    formErrors.name ? 'border-[var(--status-danger-border)]' : 'border-[var(--border-subtle)]'
                  }`}
                />
                {formErrors.name && (
                  <div className="text-xs text-[var(--status-danger-fg)] mt-1">
                    {formErrors.name}
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="products-product-category" className="ui-label block mb-1">
                  Product Category *
                </label>
                <select id="products-product-category"
                  value={category}
                  onChange={(e) =>
                    handleCategoryChange(e.target.value as ProductRecord['category'])
                  }
                  className="ui-field w-full"
                >
                  {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="products-unique-sku" className="ui-label block">
                    Unique SKU Code *
                  </label>
                  <span className="text-xs text-[var(--status-success-fg)] font-mono">
                    AD-{'{CAT}'}-{'{SEQ}'}
                  </span>
                </div>
                <input id="products-unique-sku" aria-invalid={Boolean(formErrors.sku)} aria-describedby="products-unique-sku-help"
                  type="text"
                  required
                  value={sku}
                  onChange={(e) => {
                    setSku(e.target.value);
                    if (formErrors.sku) setFormErrors((prev) => ({ ...prev, sku: '' }));
                  }}
                  placeholder="AD-VEG-001"
                  className={`ui-field w-full font-mono-tabular uppercase ${
                    formErrors.sku ? 'border-[var(--status-danger-border)]' : 'border-[var(--border-subtle)]'
                  }`}
                />
                <div id="products-unique-sku-help" className="ui-meta mt-1">
                  Generated sequence is monotonic and non-reusable.
                </div>
                {formErrors.sku && (
                  <div className="text-xs text-[var(--status-danger-fg)] mt-1">
                    {formErrors.sku}
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="products-unit-of-measure" className="ui-label block mb-1">
                  Unit of Measure *
                </label>
                <select id="products-unit-of-measure"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as UnitOfMeasure)}
                  className="ui-field w-full"
                >
                  <option value="kilograms">kilograms (kg)</option>
                  <option value="pieces">pieces (pcs)</option>
                  <option value="bunches">bunches</option>
                  <option value="dozens">dozens</option>
                  <option value="packs">packs</option>
                  <option value="bags">bags (90kg / 50kg)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="products-description-grading-specifications" className="ui-label block mb-1">
                  Description & Grading Specifications
                </label>
                <textarea id="products-description-grading-specifications"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Export rejection grade, sorted and washed, chilled to 4°C within 2 hours of harvest."
                  className="ui-field w-full"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Product Image Management (Section 4.1) */}
          <div className="p-4 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-[var(--text-primary)]">
                2. Product Image Asset
              </div>
              <span className="ui-meta text-[var(--text-secondary)]">
                {uploadedImage ? 'Custom file attached' : 'Default category asset active'}
              </span>
            </div>

            <ImageUploadZone
              label="Primary Product Photograph (JPG, PNG, WebP up to 5MB)"
              value={uploadedImage}
              onChange={(dataUrl) => setUploadedImage(dataUrl)}
              category={category}
              productName={name || 'New SKU'}
            />
          </div>

          {/* Section 3: Inventory & Warehouse Configuration (Section 4.3) */}
          <div className="p-4 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] space-y-3">
            <div className="text-xs font-semibold text-[var(--text-primary)]">
              3. Inventory & Warehouse Configuration
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="products-reorder-buffer-target" className="ui-label block mb-1">
                  Reorder Buffer Target ({unit}) *
                </label>
                <input id="products-reorder-buffer-target"
                  type="number"
                  min="0"
                  required
                  value={reorderPoint}
                  onChange={(e) => setReorderPoint(Number(e.target.value))}
                  className="ui-field w-full font-mono-tabular"
                />
              </div>

              <div className="flex items-center gap-2 pt-5">
                <input
                  type="checkbox"
                  id="newBatchTracked"
                  checked={batchTracked}
                  onChange={(e) => setBatchTracked(e.target.checked)}
                  className="rounded focus:ring-[var(--brand-accent)] accent-[var(--brand-accent)]"
                />
                <label
                  htmlFor="newBatchTracked"
                  className="ui-label cursor-pointer"
                >
                  FEFO Batch Tracked
                </label>
              </div>

              <div className="flex items-center gap-2 pt-5">
                <input
                  type="checkbox"
                  id="newExpiryTracked"
                  checked={expiryTracked}
                  onChange={(e) => setExpiryTracked(e.target.checked)}
                  className="rounded focus:ring-[var(--brand-accent)] accent-[var(--brand-accent)]"
                />
                <label
                  htmlFor="newExpiryTracked"
                  className="ui-label cursor-pointer"
                >
                  Expiry Date Tracked
                </label>
              </div>
            </div>
          </div>

          {/* Section 4: Multi-Channel Price Schedule (Section 4.3) */}
          <div className="p-4 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] space-y-3">
            <div className="text-xs font-semibold text-[var(--text-primary)]">
              4. Multi-Channel Price Schedule (KES / {unit})
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              <div>
                <label htmlFor="products-supplier-cost" className="ui-label block mb-1">
                  Supplier Cost *
                </label>
                <input aria-invalid={Boolean(formErrors.cost)} id="products-supplier-cost"
                  type="number"
                  min="1"
                  required
                  value={newCostKes}
                  onChange={(e) => setNewCostKes(Number(e.target.value))}
                  className={`ui-field w-full font-mono-tabular ${
                    formErrors.cost ? 'border-[var(--status-danger-border)]' : 'border-[var(--border-subtle)]'
                  }`}
                />
              </div>

              <div>
                <label htmlFor="products-institutional" className="ui-label block mb-1">
                  Institutional *
                </label>
                <input aria-invalid={Boolean(formErrors.inst)} id="products-institutional"
                  type="number"
                  min="1"
                  required
                  value={newInstKes}
                  onChange={(e) => setNewInstKes(Number(e.target.value))}
                  className={`ui-field w-full font-mono-tabular font-semibold ${
                    formErrors.inst ? 'border-[var(--status-danger-border)]' : 'border-[var(--border-subtle)]'
                  }`}
                />
              </div>

              <div>
                <label htmlFor="products-wholesale" className="ui-label block mb-1">
                  Wholesale *
                </label>
                <input aria-invalid={Boolean(formErrors.whl)} id="products-wholesale"
                  type="number"
                  min="1"
                  required
                  value={newWhlKes}
                  onChange={(e) => setNewWhlKes(Number(e.target.value))}
                  className={`ui-field w-full font-mono-tabular font-semibold ${
                    formErrors.whl ? 'border-[var(--status-danger-border)]' : 'border-[var(--border-subtle)]'
                  }`}
                />
              </div>

              <div>
                <label htmlFor="products-retail-pos" className="ui-label block mb-1">
                  Retail (POS) *
                </label>
                <input aria-invalid={Boolean(formErrors.ret)} id="products-retail-pos"
                  type="number"
                  min="1"
                  required
                  value={newRetKes}
                  onChange={(e) => setNewRetKes(Number(e.target.value))}
                  className={`ui-field w-full font-mono-tabular ${
                    formErrors.ret ? 'border-[var(--status-danger-border)]' : 'border-[var(--border-subtle)]'
                  }`}
                />
              </div>

              <div>
                <label htmlFor="products-online" className="ui-label block mb-1">
                  Online *
                </label>
                <input aria-invalid={Boolean(formErrors.online)} id="products-online"
                  type="number"
                  min="1"
                  required
                  value={newOnlineKes}
                  onChange={(e) => setNewOnlineKes(Number(e.target.value))}
                  className={`ui-field w-full font-mono-tabular ${
                    formErrors.online ? 'border-[var(--status-danger-border)]' : 'border-[var(--border-subtle)]'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="ui-button ui-button-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="ui-button ui-button-primary"
            >
              <Plus className="w-4 h-4" />
              <span>{isSubmitting ? 'Registering SKU...' : 'Create Product SKU'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Product Modal */}
      <Modal
        open={Boolean(editDetailsProduct)}
        onClose={() => { if (!savingEdit) setEditDetailsProduct(null); }}
        title={`Edit Product · ${editDetailsProduct?.name}`}
        subtitle={`Update SKU details, unit of measure, active status, buffer target, and pricing tiers for ${editDetailsProduct?.sku}.`}
      >
        <form onSubmit={handleSaveEditProduct} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="products-product-name-2" className="ui-label block mb-1">
                Product Name *
              </label>
              <input id="products-product-name-2"
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="e.g., Kinangop Roma Tomatoes"
                className="ui-field w-full"
              />
            </div>
            <div>
              <label htmlFor="products-sku-code" className="ui-label block mb-1">SKU Code *</label>
              <input id="products-sku-code"
                type="text"
                required
                value={editSku}
                onChange={(e) => setEditSku(e.target.value)}
                className="ui-field w-full font-mono-tabular"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="products-category" className="ui-label block mb-1">Category *</label>
              <select id="products-category"
                value={editCategory}
                onChange={(e) =>
                  setEditCategory(e.target.value as ProductRecord['category'])
                }
                className="ui-field w-full"
              >
                {!CATEGORIES.some((option) => option === editCategory) && <option value={editCategory}>{editCategory}</option>}
                {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="products-unit-of-measure-2" className="ui-label block mb-1">
                Unit of Measure *
              </label>
              <select id="products-unit-of-measure-2"
                value={editUnit}
                onChange={(e) => setEditUnit(e.target.value as UnitOfMeasure)}
                className="ui-field w-full"
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
              <label htmlFor="products-lifecycle-status" className="ui-label block mb-1">
                Lifecycle Status *
              </label>
              <select id="products-lifecycle-status"
                value={editStatus}
                onChange={(e) =>
                  setEditStatus(e.target.value as ProductRecord['status'])
                }
                className="ui-field w-full"
              >
                <option value="Active">Active</option>
                <option value="Seasonal Hold">Seasonal Hold</option>
                <option value="Discontinued">Discontinued</option>
                <option value="Archived">Archived</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="products-description-specifications" className="ui-label block mb-1">
              Description / Specifications
            </label>
            <textarea id="products-description-specifications"
              rows={2}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Grading specifications, packaging standard, origin county..."
              className="ui-field w-full"
            />
          </div>

          {/* Product Image Asset in Edit Modal */}
          <div className="p-3 rounded-md bg-[var(--bg-canvas)] border border-[var(--border-subtle)] space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-primary)]">
              <span>Product Image Asset</span>
              {editImageUrl && (
                <button
                  type="button"
                  onClick={() => setEditImageUrl('')}
                  className="ui-button ui-button-danger"
                >
                  Remove Custom Image
                </button>
              )}
            </div>
            <ImageUploadZone
              label="Replace Product Photograph (JPG, PNG, WebP up to 5MB)"
              value={editImageUrl || null}
              onChange={(dataUrl) => setEditImageUrl(dataUrl || '')}
              category={editCategory}
              productName={editName || 'Product'}
            />
          </div>

          {/* Reorder and Inventory Configuration */}
          <div className="p-3 rounded-md bg-[var(--bg-canvas)] border border-[var(--border-subtle)] space-y-3">
            <div className="text-xs font-semibold text-[var(--text-primary)]">
              Warehouse & Stock Thresholds
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="products-buffer-target-reorder-point" className="ui-label block mb-1">
                  Buffer Target / Reorder Point ({editUnit})
                </label>
                <input id="products-buffer-target-reorder-point"
                  type="number"
                  min="0"
                  required
                  value={editReorderPoint}
                  onChange={(e) => setEditReorderPoint(Number(e.target.value))}
                  className="ui-field w-full font-mono-tabular"
                />
              </div>
              <div className="flex items-center gap-2 pt-5">
                <input
                  type="checkbox"
                  id="editBatchTracked"
                  checked={editBatchTracked}
                  onChange={(e) => setEditBatchTracked(e.target.checked)}
                  className="rounded focus:ring-[var(--brand-accent)] accent-[var(--brand-accent)]"
                />
                <label htmlFor="editBatchTracked" className="ui-label cursor-pointer">
                  FEFO Batch Tracked
                </label>
              </div>
              <div className="flex items-center gap-2 pt-5">
                <input
                  type="checkbox"
                  id="editExpiryTracked"
                  checked={editExpiryTracked}
                  onChange={(e) => setEditExpiryTracked(e.target.checked)}
                  className="rounded focus:ring-[var(--brand-accent)] accent-[var(--brand-accent)]"
                />
                <label htmlFor="editExpiryTracked" className="ui-label cursor-pointer">
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
                <label htmlFor="products-supplier-cost-2" className="ui-label block mb-1">
                  Supplier Cost
                </label>
                <input id="products-supplier-cost-2"
                  type="number"
                  required
                  value={editCostKes}
                  onChange={(e) => setEditCostKes(Number(e.target.value))}
                  className="ui-field w-full font-mono-tabular"
                />
              </div>
              <div>
                <label htmlFor="products-institutional-2" className="ui-label block mb-1">
                  Institutional
                </label>
                <input id="products-institutional-2"
                  type="number"
                  required
                  value={editInstKes}
                  onChange={(e) => setEditInstKes(Number(e.target.value))}
                  className="ui-field w-full font-mono-tabular font-semibold"
                />
              </div>
              <div>
                <label htmlFor="products-wholesale-2" className="ui-label block mb-1">
                  Wholesale
                </label>
                <input id="products-wholesale-2"
                  type="number"
                  required
                  value={editWhlKes}
                  onChange={(e) => setEditWhlKes(Number(e.target.value))}
                  className="ui-field w-full font-mono-tabular font-semibold"
                />
              </div>
              <div>
                <label htmlFor="products-retail-pos-2" className="ui-label block mb-1">
                  Retail (POS)
                </label>
                <input id="products-retail-pos-2"
                  type="number"
                  required
                  value={editRetKes}
                  onChange={(e) => setEditRetKes(Number(e.target.value))}
                  className="ui-field w-full font-mono-tabular"
                />
              </div>
              <div>
                <label htmlFor="products-online-2" className="ui-label block mb-1">
                  Online
                </label>
                <input id="products-online-2"
                  type="number"
                  required
                  value={editOnlineKes}
                  onChange={(e) => setEditOnlineKes(Number(e.target.value))}
                  className="ui-field w-full font-mono-tabular"
                />
              </div>
            </div>
          </div>

          {editError && <p role="alert" className="text-sm text-[var(--status-danger-fg)]">{editError}</p>}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              disabled={savingEdit}
              onClick={() => setEditDetailsProduct(null)}
              className="ui-button ui-button-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingEdit}
              className="ui-button ui-button-primary"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>{savingEdit ? 'Saving…' : 'Save changes'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Connected Suppliers Sourcing Modal */}
      <Modal
        open={Boolean(sourcingModalProduct)}
        onClose={() => setSourcingModalProduct(null)}
        title={`Connected Sourcing Suppliers · ${sourcingModalProduct?.name}`}
        subtitle={`Registered farm cooperatives and vendors providing SKU ${sourcingModalProduct?.sku} (${sourcingModalProduct?.unit}).`}
      >
        {sourcingModalProduct && (
          <div className="space-y-4">
            {getSuppliersForProduct(sourcingModalProduct.id).length === 0 ? (
              <div className="rounded-lg border border-dashed border-[var(--border-subtle)] p-8 text-center">
                <Truck className="mx-auto h-8 w-8 text-[var(--text-secondary)]" />
                <h4 className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                  No direct suppliers configured
                </h4>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  This product does not currently have registered suppliers in its sourcing price list.
                  Add this SKU in the Suppliers module to track farmgate costs and lead times.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {getSuppliersForProduct(sourcingModalProduct.id).map((sup) => {
                  const supplyItem = sup.suppliedProducts?.find(
                    (p) => p.productId === sourcingModalProduct.id && p.unit === sourcingModalProduct.unit && p.availability !== 'Unavailable'
                  );
                  const minimum = supplyItem?.moq ?? supplyItem?.minOrderQty;
                  return (
                    <div
                      key={sup.id}
                      className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 shadow-xs"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                              {sup.name}
                            </h4>
                            <span className="rounded bg-[var(--status-success-bg)] px-1.5 py-0.5 text-xs font-semibold text-[var(--status-success-fg)]">
                              {sup.code}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                            {sup.region} · Contact: {sup.contactPerson} ({sup.phone})
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-[var(--status-success-fg)] font-mono">
                            {supplyItem && supplyItem.currentCostKes > 0 ? `${formatKes(supplyItem.currentCostKes)} / ${supplyItem.unit}` : 'Quote pending'}
                          </div>
                          <p className="ui-meta text-[var(--text-secondary)]">Quoted Farmgate Cost</p>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-[var(--border-subtle)] pt-2 text-xs text-[var(--text-secondary)]">
                        <div>
                          <span className="text-[var(--text-secondary)]">Lead Time: </span>
                          <strong className="text-[var(--text-primary)]">
                            {supplyItem?.leadTimeDays ?? sup.leadTimeDays} days
                          </strong>
                        </div>
                        <div>
                          <span className="text-[var(--text-secondary)]">Min Order Qty: </span>
                          <strong className="text-[var(--text-primary)]">
                            {minimum !== undefined ? formatStock(minimum, sourcingModalProduct.unit) : 'Unrecorded'}
                          </strong>
                        </div>
                        <div>
                          <span className="text-[var(--text-secondary)]">Quality Score: </span>
                          <strong className="text-[var(--text-primary)]">
                            {sup.qualityScorePct}%
                          </strong>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSourcingModalProduct(null)}
                className="ui-button ui-button-secondary"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

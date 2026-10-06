'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeftRight,
  ArrowRight,
  Boxes,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Filter,
  Plus,
  Search,
  Trash2,
  Warehouse,
} from 'lucide-react';
import { useBos } from '@/lib/services/bos-context';
import {
  ActionableMetricCard,
  Card,
  EmptyState,
  FeedbackBanner,
  KPI,
  Modal,
  PageHeader,
  ResilientImage,
  StatusBadge,
  WorkQueue,
  WorkQueueItem,
} from '@/components/ui/primitives';
import { IMAGE_PATHS } from '@/lib/services/initial-data';
import { StockMovementRecord } from '@/types/domain/bos';

function InventoryContent() {
  const searchParams = useSearchParams();
  const {
    products,
    warehouses,
    stockBatches,
    stockMovements,
    can,
    recordStockMovement,
  } = useBos();

  const [activeTab, setActiveTab] = useState<'batches' | 'products' | 'movements' | 'warehouses'>('batches');
  const [batchFilter, setBatchFilter] = useState<'all' | 'at-risk' | 'expiring'>('all');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [batchId, setBatchId] = useState(stockBatches[0]?.id || '');
  const [movType, setMovType] = useState<StockMovementRecord['type']>('Adjustment');
  const [qtyDelta, setQtyDelta] = useState(-10);
  const [reason, setReason] = useState('');
  const [toLocation, setToLocation] = useState('Westlands Cross-Dock C');
  const [feedback, setFeedback] = useState<{
    msg: string;
    type: 'success' | 'error';
  } | null>(null);

  // Read search parameters for drill-down support (Section 14 & 23)
  useEffect(() => {
    const filterParam = searchParams.get('filter');
    const tabParam = searchParams.get('tab');

    if (filterParam === 'expiring' || filterParam === 'at-risk') {
      setActiveTab('batches');
      setBatchFilter(filterParam);
    }

    if (tabParam === 'warehouses' || tabParam === 'movements' || tabParam === 'products') {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Top Summary metrics (Section 23: Available, Reserved, Incoming, Low Stock, Expiring)
  const totalAvailableKg = useMemo(
    () => products.reduce((acc, p) => acc + p.availableQty, 0),
    [products]
  );
  const totalReservedKg = useMemo(
    () => stockBatches.reduce((acc, b) => acc + b.reservedQty, 0),
    [stockBatches]
  );
  const incomingShipmentsUnits = 3800; // scheduled GRNs today
  const lowStockProducts = useMemo(
    () => products.filter((p) => p.availableQty < p.reorderPoint),
    [products]
  );
  const expiringBatches = useMemo(
    () => stockBatches.filter((b) => b.daysToExpiry <= 7),
    [stockBatches]
  );

  const filteredBatches = useMemo(() => {
    return stockBatches.filter((b) => {
      let matchesRisk = true;
      if (batchFilter === 'at-risk' || batchFilter === 'expiring') {
        matchesRisk = b.daysToExpiry <= 7 || b.status === 'Expiring Soon';
      }

      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        b.batchNumber.toLowerCase().includes(q) ||
        b.productName.toLowerCase().includes(q) ||
        b.warehouseName.toLowerCase().includes(q) ||
        b.binCode.toLowerCase().includes(q);

      return matchesRisk && matchesSearch;
    });
  }, [stockBatches, batchFilter, search]);

  const handleSubmitMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await recordStockMovement({
      batchId,
      type: movType,
      quantityDelta: Number(qtyDelta),
      reason: reason || `${movType} logged by Warehouse Control`,
      toLocation: movType === 'Transfer' ? toLocation : undefined,
    });
    setFeedback({ msg: res.message, type: res.ok ? 'success' : 'error' });
    if (res.ok) {
      setModalOpen(false);
      setReason('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header (Section 23 & 31) */}
      <PageHeader
        kicker="FEFO COLD CHAIN & STOCK RISK GOVERNANCE"
        title="Inventory & Stock Risk Command"
        description="Identify stock risk, monitor First-Expired First-Out (FEFO) perishable lots, manage warehouse capacity, and prevent shrinkage across Kenyan hubs."
        actions={
          (can('inventory.adjust') ||
            can('inventory.transfer') ||
            can('inventory.receive')) && (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="h-10 px-4 rounded-full bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-semibold inline-flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Record Movement / Wastage</span>
            </button>
          )
        }
      />

      <FeedbackBanner
        message={feedback?.msg || null}
        type={feedback?.type}
        onDismiss={() => setFeedback(null)}
      />

      {/* Top Decision Summary Metrics (Section 23: Available, Reserved, Incoming, Low Stock, Expiring) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KPI
          label="Available Stock"
          value={`${totalAvailableKg.toLocaleString()} kg`}
          sublabel="Net unreserved inventory"
          tone="positive"
        />
        <KPI
          label="Reserved for Orders"
          value={`${totalReservedKg.toLocaleString()} kg`}
          sublabel="Allocated to active dispatches"
          tone="neutral"
        />
        <KPI
          label="Incoming Today"
          value={`${incomingShipmentsUnits.toLocaleString()} Units`}
          sublabel="2 GRNs arriving before 11:30"
          tone="positive"
        />
        <KPI
          label="Low Stock Deficit"
          value={`${lowStockProducts.length} SKUs`}
          sublabel="Below contracted buffer"
          tone={lowStockProducts.length > 0 ? 'warning' : 'positive'}
        />
        <KPI
          label="Expiring <= 7d"
          value={`${expiringBatches.length} Batches`}
          sublabel="FEFO priority countdown"
          tone={expiringBatches.length > 0 ? 'danger' : 'positive'}
        />
      </div>

      {/* Primary Section: Inventory at Risk (Section 23) */}
      <section aria-label="Inventory Risk Workbench">
        <div className="p-4 sm:p-5 rounded-[20px] bg-[var(--bg-card)] border-2 border-amber-500/35 dark:border-amber-500/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-full bg-red-500/15 text-red-600 dark:text-red-400">
                <AlertTriangle className="w-4 h-4" />
              </span>
              <div>
                <h2 className="font-heading text-sm font-semibold text-[var(--text-primary)]">
                  Primary Risk Radar · Perishable Lots & Deficits
                </h2>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Take immediate operational action on stock before expiry threshold or school stockout occurs.
                </p>
              </div>
            </div>
            <span className="text-[11px] font-mono-tabular text-[var(--text-secondary)]">
              Updated 4m ago · As of 07:45 EAT
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {expiringBatches.map((batch) => (
              <div
                key={batch.id}
                className="p-3.5 rounded-xl border border-red-500/25 bg-red-500/[0.04] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono-tabular text-xs font-semibold text-[#1F6A37] dark:text-[#4EB462]">
                      {batch.batchNumber}
                    </span>
                    <span className="text-[11px] font-mono-tabular font-bold text-red-600 dark:text-red-400">
                      {batch.daysToExpiry}d to Expiry
                    </span>
                  </div>
                  <div className="font-semibold text-xs text-[var(--text-primary)] mt-1">
                    {batch.productName}
                  </div>
                  <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                    {batch.warehouseName} ({batch.binCode}) ·{' '}
                    <strong className="text-[var(--text-primary)]">
                      {batch.availableQty} {batch.unit}
                    </strong>{' '}
                    available
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-[var(--border-subtle)] flex items-center justify-between">
                  <span className="text-[10px] text-[var(--text-secondary)]">
                    Earliest FIFO Pick
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setBatchId(batch.id);
                      setMovType('Transfer');
                      setModalOpen(true);
                    }}
                    className="h-7 px-3 rounded-full bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>Fast-Track</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}

            {/* Low safety stock alert */}
            {lowStockProducts.slice(0, 1).map((p) => (
              <div
                key={`low-${p.id}`}
                className="p-3.5 rounded-xl border border-amber-500/25 bg-amber-500/[0.04] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono-tabular text-xs font-semibold text-amber-700 dark:text-amber-400">
                      {p.sku} · Buffer Deficit
                    </span>
                    <span className="text-[11px] font-mono-tabular font-bold text-amber-600 dark:text-amber-400">
                      Below Reorder Point
                    </span>
                  </div>
                  <div className="font-semibold text-xs text-[var(--text-primary)] mt-1">
                    {p.name}
                  </div>
                  <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                    Available: <strong>{p.availableQty} {p.unit}</strong> (Buffer target: {p.reorderPoint} {p.unit})
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-[var(--border-subtle)] flex items-center justify-between">
                  <span className="text-[10px] text-[var(--text-secondary)]">
                    Reorder Needed
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setBatchId(stockBatches[0]?.id || '');
                      setMovType('Receipt (GRN)');
                      setModalOpen(true);
                    }}
                    className="h-7 px-3 rounded-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>Receive Stock</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* View Switcher Tabs (Section 23: FEFO Batch View, Stock Table, Movements, Warehouses) */}
      <div className="flex items-center gap-1 p-1 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)] w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('batches')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
            activeTab === 'batches'
              ? 'bg-[#1F6A37] text-white shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          FEFO Batch Lots ({stockBatches.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('products')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
            activeTab === 'products'
              ? 'bg-[#1F6A37] text-white shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Product Stock Matrix ({products.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('movements')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
            activeTab === 'movements'
              ? 'bg-[#1F6A37] text-white shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Wastage & Movement Ledger ({stockMovements.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('warehouses')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
            activeTab === 'warehouses'
              ? 'bg-[#1F6A37] text-white shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Cold-Chain Hub Facilities
        </button>
      </div>

      {/* Tab 1: FEFO Batch View */}
      {activeTab === 'batches' && (
        <Card padding="p-0" className="overflow-hidden">
          <div className="p-4 border-b border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[var(--text-primary)]">Filter Batches:</span>
              <div className="flex items-center gap-1 p-0.5 rounded-full bg-[var(--bg-canvas)]">
                <button
                  type="button"
                  onClick={() => setBatchFilter('all')}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer ${
                    batchFilter === 'all'
                      ? 'bg-[#1F6A37] text-white'
                      : 'text-[var(--text-secondary)]'
                  }`}
                >
                  All Batches
                </button>
                <button
                  type="button"
                  onClick={() => setBatchFilter('at-risk')}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer ${
                    batchFilter === 'at-risk'
                      ? 'bg-red-600 text-white'
                      : 'text-[var(--text-secondary)]'
                  }`}
                >
                  At Risk (&lt;= 7d)
                </button>
              </div>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-[var(--text-secondary)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search batch # or produce..."
                className="w-full h-8 pl-8 pr-3 rounded-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs focus:outline-none"
              />
            </div>
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]/50 text-[11px] font-semibold text-[var(--text-secondary)]">
                  <th className="py-3 px-4">Batch / Lot #</th>
                  <th className="py-3 px-4">Product & SKU</th>
                  <th className="py-3 px-4">Warehouse & Bin</th>
                  <th className="py-3 px-4">Expiry Date</th>
                  <th className="py-3 px-4 text-right">Available Qty</th>
                  <th className="py-3 px-4 text-right">Reserved Qty</th>
                  <th className="py-3 px-4">FEFO Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] text-xs">
                {filteredBatches.map((b) => (
                  <tr key={b.id} className="hover:bg-[var(--bg-canvas)]/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono-tabular font-semibold text-[var(--text-primary)]">
                      {b.batchNumber}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-[var(--text-primary)]">
                      {b.productName}
                    </td>
                    <td className="py-3.5 px-4">
                      <div>{b.warehouseName}</div>
                      <div className="font-mono-tabular text-[11px] text-[var(--text-secondary)]">
                        Bin: {b.binCode}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono-tabular">
                      <div>{b.expiryDate}</div>
                      <div
                        className={`text-[11px] font-semibold ${
                          b.daysToExpiry <= 5
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-[var(--text-secondary)]'
                        }`}
                      >
                        {b.daysToExpiry}d remaining
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono-tabular font-semibold text-[var(--text-primary)]">
                      {b.availableQty.toLocaleString()} {b.unit}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono-tabular text-[var(--text-secondary)]">
                      {b.reservedQty.toLocaleString()} {b.unit}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={b.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden divide-y divide-[var(--border-subtle)]">
            {filteredBatches.map((b) => (
              <div key={b.id} className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono-tabular text-xs font-semibold text-[#1F6A37] dark:text-[#4EB462]">
                    {b.batchNumber}
                  </span>
                  <StatusBadge status={b.status} />
                </div>
                <div className="text-xs font-semibold">{b.productName}</div>
                <div className="text-[11px] text-[var(--text-secondary)]">
                  {b.warehouseName} ({b.binCode}) · Expires {b.expiryDate} ({b.daysToExpiry}d)
                </div>
                <div className="text-xs font-mono-tabular font-semibold">
                  Available: {b.availableQty.toLocaleString()} {b.unit}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Tab 2: Stock Table Matrix */}
      {activeTab === 'products' && (
        <Card padding="p-0" className="overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]/50 text-[11px] font-semibold text-[var(--text-secondary)]">
                  <th className="py-3 px-4">SKU / Code</th>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Available Qty</th>
                  <th className="py-3 px-4 text-right">Safety Buffer</th>
                  <th className="py-3 px-4 text-right">Institutional Price</th>
                  <th className="py-3 px-4">Stock Posture</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] text-xs">
                {products.map((p) => {
                  const isLow = p.availableQty < p.reorderPoint;
                  return (
                    <tr key={p.id} className="hover:bg-[var(--bg-canvas)]/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono-tabular font-semibold text-[var(--text-primary)]">
                        {p.sku}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-[var(--text-primary)]">
                        {p.name}
                      </td>
                      <td className="py-3.5 px-4 text-[var(--text-secondary)]">
                        {p.category}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono-tabular font-semibold">
                        {p.availableQty.toLocaleString()} {p.unit}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono-tabular text-[var(--text-secondary)]">
                        {p.reorderPoint.toLocaleString()} {p.unit}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono-tabular font-semibold text-[#1F6A37] dark:text-[#4EB462]">
                        KES {p.pricing.institutionalKes}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                            isLow
                              ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                              : 'bg-[#E5EFE6] dark:bg-[#142B1B] text-[#1F6A37] dark:text-[#4EB462]'
                          }`}
                        >
                          {isLow ? 'Safety Buffer Low' : 'Adequate'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 3: Movements & Spoilage Ledger */}
      {activeTab === 'movements' && (
        <Card padding="p-0" className="overflow-hidden">
          <div className="divide-y divide-[var(--border-subtle)]">
            {stockMovements.map((m) => (
              <div
                key={m.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={m.type} />
                    <span className="font-semibold text-[var(--text-primary)]">
                      {m.productName}
                    </span>
                    <span className="font-mono-tabular text-[var(--text-secondary)]">
                      ({m.batchNumber})
                    </span>
                  </div>
                  <div className="text-[11px] text-[var(--text-secondary)] mt-1">
                    {m.fromLocation} → {m.toLocation} · Operator: {m.actorName} · {m.reason}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div
                    className={`font-mono-tabular text-sm font-semibold ${
                      m.quantityDelta >= 0
                        ? 'text-[#1F6A37] dark:text-[#4EB462]'
                        : 'text-red-700 dark:text-red-400'
                    }`}
                  >
                    {m.quantityDelta > 0 ? `+${m.quantityDelta}` : m.quantityDelta} {m.unit}
                  </div>
                  <div className="text-[11px] text-[var(--text-secondary)]">
                    {m.timestamp}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Tab 4: Cold-Chain Hub Facilities */}
      {activeTab === 'warehouses' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {warehouses.map((wh) => (
              <Card key={wh.id} className="flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono-tabular text-xs font-semibold text-[#1F6A37] dark:text-[#4EB462]">
                      {wh.code}
                    </span>
                    <span className="text-xs text-[var(--text-secondary)]">
                      {wh.zoneType}
                    </span>
                  </div>
                  <h3 className="font-heading text-base font-semibold mt-1">
                    {wh.name}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    {wh.location}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs">
                  <span>
                    Bins: <strong className="font-mono-tabular">{wh.binsCount}</strong>
                  </span>
                  <span>
                    Utilization:{' '}
                    <strong className="font-mono-tabular text-[#1F6A37] dark:text-[#4EB462]">
                      {wh.utilizationPct}%
                    </strong>
                  </span>
                  <span className="text-[var(--text-secondary)]">
                    Lead: {wh.manager.split(' ')[0]}
                  </span>
                </div>
              </Card>
            ))}
          </div>

          <Card className="overflow-hidden" padding="p-0">
            <div className="h-72 relative">
              <ResilientImage
                src={IMAGE_PATHS.warehouseColdChain}
                alt="Nairobi Cold Hub A interior racking and barcoded fresh produce crates"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#08190C]/90 via-[#08190C]/30 to-transparent p-6 flex flex-col justify-end text-white">
                <div className="text-xs font-semibold text-[#4EB462]">
                  NAIROBI COLD HUB A · INDUSTRIAL AREA
                </div>
                <h3 className="font-heading text-xl font-semibold mt-1">
                  FEFO Barcoded Cold-Storage & Staging Racks (2°C – 6°C)
                </h3>
                <p className="text-xs text-[#A9BEAE] mt-1 max-w-2xl">
                  Every inbound cooperative lot receives a batch barcode at Goods Received Note (GRN) inspection. Order picking enforces earliest expiry allocation automatically.
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Movement Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Record Stock Movement / Wastage"
        subtitle="Log an physical count adjustment, inter-hub transfer, GRN receipt, or spoilage quarantine."
      >
        <form onSubmit={handleSubmitMovement} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1">Target Stock Batch</label>
            <select
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              className="w-full h-10 px-3 rounded-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs"
            >
              {stockBatches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.batchNumber} · {b.productName} ({b.availableQty} {b.unit} avail)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1">Movement Type</label>
              <select
                value={movType}
                onChange={(e) => setMovType(e.target.value as StockMovementRecord['type'])}
                className="w-full h-10 px-3 rounded-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs"
              >
                <option value="Adjustment">Count Adjustment</option>
                <option value="Transfer">Inter-Hub Transfer</option>
                <option value="Wastage">Spoilage / Wastage</option>
                <option value="Receiving">Inbound GRN Receiving</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Quantity Delta</label>
              <input
                type="number"
                value={qtyDelta}
                onChange={(e) => setQtyDelta(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs font-mono-tabular"
              />
            </div>
          </div>

          {movType === 'Transfer' && (
            <div>
              <label className="block text-xs font-medium mb-1">Destination Facility</label>
              <select
                value={toLocation}
                onChange={(e) => setToLocation(e.target.value)}
                className="w-full h-10 px-3 rounded-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs"
              >
                <option value="Westlands Cross-Dock C">Westlands Cross-Dock C</option>
                <option value="Dry Bulk Hub B (Embakasi)">Dry Bulk Hub B (Embakasi)</option>
                <option value="Nairobi Cold Hub A">Nairobi Cold Hub A</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium mb-1">Operational Reason / Notes</label>
            <input
              type="text"
              placeholder="e.g. Expired batch compost quarantine, school rush transfer..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full h-10 px-3 rounded-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs"
            />
          </div>

          <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="h-10 px-4 rounded-full border border-[var(--border-subtle)] text-xs font-medium hover:bg-[var(--bg-canvas)] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-10 px-5 rounded-full bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-semibold cursor-pointer"
            >
              Save Movement
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default function InventoryPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-[var(--text-secondary)]">Loading Inventory Workbench...</div>}>
      <InventoryContent />
    </Suspense>
  );
}

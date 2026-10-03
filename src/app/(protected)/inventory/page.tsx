'use client';

import React, { useState } from 'react';
import {
  ArrowLeftRight,
  ClipboardCheck,
  Plus,
  Trash2,
  Warehouse,
} from 'lucide-react';
import { useBos } from '@/lib/services/bos-context';
import {
  Card,
  FeedbackBanner,
  Modal,
  PageHeader,
  ResilientImage,
  StatusBadge,
} from '@/components/ui/primitives';
import { IMAGE_PATHS } from '@/lib/services/initial-data';
import { StockMovementRecord } from '@/types/domain/bos';

export default function InventoryPage() {
  const {
    warehouses,
    stockBatches,
    stockMovements,
    can,
    recordStockMovement,
  } = useBos();

  const [activeTab, setActiveTab] = useState<
    'batches' | 'warehouses' | 'movements'
  >('batches');
  const [modalOpen, setModalOpen] = useState(false);
  const [batchId, setBatchId] = useState(stockBatches[0]?.id || '');
  const [movType, setMovType] =
    useState<StockMovementRecord['type']>('Adjustment');
  const [qtyDelta, setQtyDelta] = useState(-10);
  const [reason, setReason] = useState('');
  const [toLocation, setToLocation] = useState('Westlands Cross-Dock C');
  const [feedback, setFeedback] = useState<{
    msg: string;
    type: 'success' | 'error';
  } | null>(null);

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
    <div>
      <PageHeader
        kicker="COLD CHAIN & DRY BULK WAREHOUSING"
        title="FEFO Inventory, Batches & Wastage Control"
        description="Track warehouse bins, perishable lot expiry countdowns, First-Expired First-Out (FEFO) picking priority, inter-hub transfers, and spoilage quarantine."
        actions={
          (can('inventory.adjust') ||
            can('inventory.transfer') ||
            can('inventory.receive')) && (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="h-10 px-4 rounded-full bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-medium inline-flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Record Adjustment / Transfer / Wastage</span>
            </button>
          )
        }
      />

      <FeedbackBanner
        message={feedback?.msg || null}
        type={feedback?.type}
        onDismiss={() => setFeedback(null)}
      />

      {/* Warehouse Facility Overview Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
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

      {/* Interactive View Switcher */}
      <div className="flex items-center gap-1 p-1 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)] w-fit mb-6">
        <button
          type="button"
          onClick={() => setActiveTab('batches')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${
            activeTab === 'batches'
              ? 'bg-[#1F6A37] text-white'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          FEFO Stock Batches ({stockBatches.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('movements')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${
            activeTab === 'movements'
              ? 'bg-[#1F6A37] text-white'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Stock Movements & Wastage Ledger ({stockMovements.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('warehouses')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${
            activeTab === 'warehouses'
              ? 'bg-[#1F6A37] text-white'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Cold-Chain Facility Visual
        </button>
      </div>

      {activeTab === 'batches' && (
        <Card padding="p-0" className="overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]/50 text-[11px] font-semibold text-[var(--text-secondary)]">
                  <th className="py-3 px-4">Batch / Lot #</th>
                  <th className="py-3 px-4">Product & SKU</th>
                  <th className="py-3 px-4">Warehouse & Bin</th>
                  <th className="py-3 px-4">Expiry & FEFO Window</th>
                  <th className="py-3 px-4 text-right">Available</th>
                  <th className="py-3 px-4 text-right">Reserved</th>
                  <th className="py-3 px-4">FEFO Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] text-xs">
                {stockBatches.map((b) => (
                  <tr key={b.id} className="hover:bg-[var(--bg-canvas)]/60">
                    <td className="py-3.5 px-4 font-mono-tabular font-semibold text-[#1F6A37] dark:text-[#4EB462]">
                      {b.batchNumber}
                      <div className="text-[11px] font-normal text-[var(--text-secondary)]">
                        Rec: {b.receivedDate}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[var(--text-primary)]">
                        {b.productName}
                      </div>
                      <div className="text-[11px] text-[var(--text-secondary)]">
                        {b.sku} · Supplier: {b.supplierName}
                      </div>
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
                        className={`text-[11px] ${
                          b.daysToExpiry <= 5
                            ? 'text-amber-700 dark:text-amber-400 font-semibold'
                            : 'text-[var(--text-secondary)]'
                        }`}
                      >
                        {b.daysToExpiry} days remaining
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono-tabular font-semibold">
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
            {stockBatches.map((b) => (
              <div key={b.id} className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono-tabular text-xs font-semibold text-[#1F6A37] dark:text-[#4EB462]">
                    {b.batchNumber}
                  </span>
                  <StatusBadge status={b.status} />
                </div>
                <div className="text-xs font-semibold">{b.productName}</div>
                <div className="text-[11px] text-[var(--text-secondary)]">
                  {b.warehouseName} ({b.binCode}) · Expires {b.expiryDate} (
                  {b.daysToExpiry}d)
                </div>
                <div className="text-xs font-mono-tabular font-semibold">
                  Available: {b.availableQty.toLocaleString()} {b.unit}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

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
                    {m.fromLocation} → {m.toLocation} · Actor: {m.actorName} ·{' '}
                    {m.reason}
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
                    {m.quantityDelta > 0 ? `+${m.quantityDelta}` : m.quantityDelta}{' '}
                    {m.unit}
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

      {activeTab === 'warehouses' && (
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
                Every inbound cooperative lot receives a batch barcode at Goods
                Received Note (GRN) inspection. Order picking enforces earliest
                expiry allocation automatically.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Stock Adjustment / Wastage / Transfer Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Record Warehouse Stock Movement"
        subtitle="Log a physical count adjustment, inter-warehouse transfer, GRN receipt, or spoilage wastage."
      >
        <form onSubmit={handleSubmitMovement} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1">
              Target Stock Batch
            </label>
            <select
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs"
            >
              {stockBatches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.batchNumber} · {b.productName} ({b.availableQty} {b.unit}{' '}
                  avail)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1">
                Movement Type
              </label>
              <select
                value={movType}
                onChange={(e) =>
                  setMovType(e.target.value as StockMovementRecord['type'])
                }
                className="w-full h-10 px-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs"
              >
                <option value="Adjustment">Stock Count Adjustment</option>
                <option value="Wastage">Spoilage / Wastage Write-Off</option>
                <option value="Transfer">Inter-Warehouse Transfer</option>
                <option value="Receipt (GRN)">Goods Received (GRN Post)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">
                Quantity Change (use - for deduction)
              </label>
              <input
                type="number"
                required
                value={qtyDelta}
                onChange={(e) => setQtyDelta(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs font-mono-tabular"
              />
            </div>
          </div>

          {movType === 'Transfer' && (
            <div>
              <label className="block text-xs font-medium mb-1">
                Destination Warehouse Hub
              </label>
              <select
                value={toLocation}
                onChange={(e) => setToLocation(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.name}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium mb-1">
              Operational Reason (Logged to Audit Trail)
            </label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Cold room physical cycle count verification"
              className="w-full h-10 px-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-full border border-[var(--border-subtle)] text-xs font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-full bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-medium cursor-pointer"
            >
              Post Stock Movement
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

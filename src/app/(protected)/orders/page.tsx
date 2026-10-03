'use client';

import React, { useMemo, useState } from 'react';
import {
  Download,
  Eye,
  Plus,
  Search,
  ShoppingBag,
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
import { OrderLifecycleStatus, OrderRecord } from '@/types/domain/bos';

const STATUS_FILTERS: ('All' | OrderLifecycleStatus)[] = [
  'All',
  'Confirmed',
  'Picking',
  'Packed',
  'Dispatched',
  'Delivered',
  'On Hold',
];

export default function OrdersPage() {
  const {
    orders,
    customers,
    products,
    warehouses,
    can,
    createOrder,
    advanceOrderStatus,
  } = useBos();

  const [statusFilter, setStatusFilter] = useState<'All' | OrderLifecycleStatus>('All');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [feedback, setFeedback] = useState<{
    msg: string;
    type: 'success' | 'error';
  } | null>(null);

  // Form state for New Order
  const [customerId, setCustomerId] = useState(customers[0]?.id || '');
  const [channel, setChannel] = useState<OrderRecord['channel']>(
    'Institutional Contract'
  );
  const [deliveryDate, setDeliveryDate] = useState('2026-10-01');
  const [warehouseName, setWarehouseName] = useState(
    warehouses[0]?.name || 'Nairobi Cold Hub A'
  );
  const [productId, setProductId] = useState(products[0]?.id || '');
  const [quantity, setQuantity] = useState(100);
  const [overridePrice, setOverridePrice] = useState('');
  const [notes, setNotes] = useState('');

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchesStatus =
        statusFilter === 'All' || o.status === statusFilter;
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        o.orderNumber.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.channel.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [orders, statusFilter, search]);

  const selectedProduct = products.find((p) => p.id === productId);
  const selectedCustomer = customers.find((c) => c.id === customerId);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await createOrder({
      customerId,
      channel,
      deliveryDate,
      warehouseName,
      productId,
      quantity: Number(quantity),
      overridePriceKes: overridePrice ? Number(overridePrice) : undefined,
      notes,
    });
    setFeedback({ msg: res.message, type: res.ok ? 'success' : 'error' });
    if (res.ok) {
      setCreateOpen(false);
      setOverridePrice('');
      setNotes('');
    }
  };

  const handleExportCsv = () => {
    const headers = [
      'Order Number',
      'Customer',
      'Segment',
      'Channel',
      'Status',
      'Delivery Date',
      'Warehouse',
      'Total KES',
    ];
    const rows = filteredOrders.map((o) => [
      o.orderNumber,
      `"${o.customerName}"`,
      o.customerSegment,
      o.channel,
      o.status,
      o.deliveryDate,
      `"${o.warehouseName}"`,
      o.totalKes,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'agro-deliveries-orders.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader
        kicker="SALES & INSTITUTIONAL SUPPLY"
        title="Order Management"
        description="Manage institutional contracts, termly school tenders, hospital commissary schedules, and walk-in retail orders with automated FEFO stock reservation."
        actions={
          <>
            {can('orders.export') && (
              <button
                type="button"
                onClick={handleExportCsv}
                className="h-10 px-4 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs font-medium inline-flex items-center gap-2 hover:border-[#4EB462] cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#1F6A37] dark:text-[#4EB462]" />
                <span>Export Manifest</span>
              </button>
            )}
            {can('orders.create') && (
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="h-10 px-4 rounded-full bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-medium inline-flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>New Order</span>
              </button>
            )}
          </>
        }
      />

      <FeedbackBanner
        message={feedback?.msg || null}
        type={feedback?.type}
        onDismiss={() => setFeedback(null)}
      />

      {/* KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPI
          label="Total Orders in Pipeline"
          value={`${orders.length}`}
          sublabel="Institutional, Tender & Retail"
          delta="100% FEFO Linked"
          tone="positive"
        />
        <KPI
          label="Gross Order Value (KES)"
          value={`KES ${orders
            .reduce((s, o) => s + o.totalKes, 0)
            .toLocaleString()}`}
          sublabel="Contract & Wholesale Pricing"
          tone="positive"
        />
        <KPI
          label="Awaiting Picking / Packing"
          value={`${
            orders.filter(
              (o) =>
                o.status === 'Confirmed' ||
                o.status === 'Picking' ||
                o.status === 'Packed'
            ).length
          }`}
          sublabel="Active warehouse staging"
          tone="neutral"
        />
        <KPI
          label="Exceptions / On Hold"
          value={`${orders.filter((o) => o.status === 'On Hold').length}`}
          sublabel="Price override or credit review"
          tone="warning"
        />
      </div>

      {/* Filter & Search Bar */}
      <Card className="mb-6" padding="p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Interactive Segmented Status Filter */}
          <div className="flex items-center gap-1 p-1 rounded-full bg-[var(--bg-canvas)] overflow-x-auto">
            {STATUS_FILTERS.map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  statusFilter === st
                    ? 'bg-[#1F6A37] text-white'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="relative w-full lg:w-72">
            <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by order # or institution..."
              className="w-full h-9 pl-9 pr-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs focus:outline-none focus:ring-2 focus:ring-[#4EB462]"
            />
          </div>
        </div>
      </Card>

      {filteredOrders.length === 0 ? (
        <EmptyState
          title="No orders match the current filter"
          description="Adjust your lifecycle filter or create a new institutional supply order."
          actionLabel={can('orders.create') ? 'Create New Order' : undefined}
          onAction={() => setCreateOpen(true)}
        />
      ) : (
        <Card padding="p-0" className="overflow-hidden">
          {/* Desktop Data Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]/50 text-[11px] font-semibold text-[var(--text-secondary)]">
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Customer / Institution</th>
                  <th className="py-3 px-4">Channel & Payment</th>
                  <th className="py-3 px-4">Dispatch Hub</th>
                  <th className="py-3 px-4">Lifecycle Status</th>
                  <th className="py-3 px-4 text-right">Order Total (KES)</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] text-xs">
                {filteredOrders.map((ord) => (
                  <tr
                    key={ord.id}
                    className="hover:bg-[var(--bg-canvas)]/60 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono-tabular font-semibold text-[var(--text-primary)]">
                      {ord.orderNumber}
                      <div className="text-[11px] font-normal text-[var(--text-secondary)]">
                        Delivery: {ord.deliveryDate}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[var(--text-primary)]">
                        {ord.customerName}
                      </div>
                      <div className="text-[11px] text-[var(--text-secondary)]">
                        {ord.customerSegment} · {ord.itemsCount} line item(s)
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-[var(--text-primary)]">
                        {ord.channel}
                      </div>
                      <div className="text-[11px] text-[var(--text-secondary)]">
                        {ord.paymentStatus}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[var(--text-secondary)]">
                      {ord.warehouseName}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={ord.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono-tabular font-semibold text-[var(--text-primary)]">
                      {ord.totalKes.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(ord)}
                          className="px-3 py-1.5 rounded-full border border-[var(--border-subtle)] text-xs font-medium hover:bg-[var(--bg-canvas)] inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Record Cards */}
          <div className="md:hidden divide-y divide-[var(--border-subtle)]">
            {filteredOrders.map((ord) => (
              <div key={ord.id} className="p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono-tabular text-xs font-semibold">
                    {ord.orderNumber}
                  </span>
                  <StatusBadge status={ord.status} />
                </div>
                <div>
                  <div className="text-xs font-semibold text-[var(--text-primary)]">
                    {ord.customerName}
                  </div>
                  <div className="text-[11px] text-[var(--text-secondary)]">
                    {ord.channel} · {ord.warehouseName}
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="font-mono-tabular text-xs font-semibold text-[#1F6A37] dark:text-[#4EB462]">
                    KES {ord.totalKes.toLocaleString()}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedOrder(ord)}
                    className="px-3 py-1.5 rounded-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs font-medium cursor-pointer"
                  >
                    Inspect Order
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Order Detail & Lifecycle Progression Modal */}
      <Modal
        open={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        title={
          selectedOrder
            ? `${selectedOrder.orderNumber} · ${selectedOrder.customerName}`
            : 'Order Details'
        }
        subtitle={
          selectedOrder
            ? `${selectedOrder.channel} · Dispatch Hub: ${selectedOrder.warehouseName}`
            : ''
        }
      >
        {selectedOrder && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 p-3.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)]">
              <div>
                <div className="text-[11px] text-[var(--text-secondary)]">
                  Current Lifecycle State
                </div>
                <div className="mt-1">
                  <StatusBadge status={selectedOrder.status} />
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-[var(--text-secondary)]">
                  Next Operational Action
                </div>
                <div className="text-xs font-medium text-[var(--text-primary)] mt-0.5">
                  {selectedOrder.nextStepLabel}
                </div>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold mb-2">
                Allocated FEFO Line Items
              </div>
              <div className="space-y-2">
                {selectedOrder.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-medium text-[var(--text-primary)]">
                        {item.productName}
                      </div>
                      <div className="text-[11px] text-[var(--text-secondary)]">
                        Batch:{' '}
                        <span className="font-mono-tabular text-[#1F6A37] dark:text-[#4EB462]">
                          {item.allocatedBatch}
                        </span>{' '}
                        · {item.quantity} {item.unit} @ KES {item.unitPriceKes} (
                        {item.pricingTier})
                      </div>
                    </div>
                    <div className="font-mono-tabular font-semibold">
                      KES {item.lineTotalKes.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Authorized Lifecycle Stage Transitions */}
            <div className="pt-4 border-t border-[var(--border-subtle)]">
              <div className="text-xs font-semibold mb-2">
                Authorized Workflow Transitions
              </div>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    'Confirmed',
                    'Picking',
                    'Packed',
                    'Dispatched',
                    'Delivered',
                    'Closed',
                  ] as OrderLifecycleStatus[]
                ).map((st) => (
                  <button
                    key={st}
                    type="button"
                    disabled={selectedOrder.status === st}
                    onClick={async () => {
                      const res = await advanceOrderStatus(selectedOrder.id, st);
                      setFeedback({
                        msg: res.message,
                        type: res.ok ? 'success' : 'error',
                      });
                      if (res.ok) setSelectedOrder(null);
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                      selectedOrder.status === st
                        ? 'bg-[#E5EFE6] border-[#4EB462] text-[#12512C] opacity-60 cursor-default'
                        : 'bg-[var(--bg-canvas)] border-[var(--border-subtle)] hover:border-[#4EB462]'
                    }`}
                  >
                    Move to {st}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Order Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create Institutional or Retail Order"
        subtitle="Automatically reserves earliest-expiring non-expired FEFO batch and applies contract pricing."
      >
        <form onSubmit={handleCreateOrder} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1">
                Institution / Customer
              </label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.segment})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">
                Order Channel
              </label>
              <select
                value={channel}
                onChange={(e) =>
                  setChannel(e.target.value as OrderRecord['channel'])
                }
                className="w-full h-10 px-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs"
              >
                <option value="Institutional Contract">
                  Institutional Contract
                </option>
                <option value="Recurring Weekly">Recurring Weekly</option>
                <option value="Tender Supply">Tender Supply</option>
                <option value="Walk-In / Manual">Walk-In / Manual</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1">
                Dispatch Warehouse Hub
              </label>
              <select
                value={warehouseName}
                onChange={(e) => setWarehouseName(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.name}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">
                Requested Delivery Date
              </label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">
              Product SKU (FEFO Tracked)
            </label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.availableQty} {p.unit} avail · Inst. KES{' '}
                  {p.pricing.institutionalKes}/{p.unit})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1">
                Quantity ({selectedProduct?.unit || 'units'})
              </label>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs font-mono-tabular"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">
                Price Override (KES, optional)
              </label>
              <input
                type="number"
                value={overridePrice}
                onChange={(e) => setOverridePrice(e.target.value)}
                placeholder={`Default: KES ${
                  selectedCustomer?.isInstitutional
                    ? selectedProduct?.pricing.institutionalKes
                    : selectedProduct?.pricing.retailKes
                }`}
                className="w-full h-10 px-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs font-mono-tabular"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">
              Receiving Bay / Kitchen Instructions
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Deliver before 06:30 EAT to Hospital Dietetics Bay"
              className="w-full h-10 px-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="px-4 py-2 rounded-full border border-[var(--border-subtle)] text-xs font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-full bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Confirm & Reserve FEFO Stock</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

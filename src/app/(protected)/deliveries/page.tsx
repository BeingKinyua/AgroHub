'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileCheck2,
  Filter,
  MapPin,
  Navigation,
  Phone,
  Search,
  Truck,
  UserCheck,
} from 'lucide-react';
import { useBos } from '@/lib/services/bos-context';
import {
  Card,
  FeedbackBanner,
  KPI,
  Modal,
  PageHeader,
  StatusBadge,
  WorkQueue,
  WorkQueueItem,
} from '@/components/ui/primitives';
import { DeliveryRunRecord, DiscrepancyReason, UnitOfMeasure } from '@/types/domain/bos';
import { calculatePODLineQuantities, classifyPODDiscrepancy } from '@/lib/services/business-rules';

interface PodLineFormItem {
  productId: string;
  productName: string;
  sku: string;
  unit: UnitOfMeasure;
  orderedQty: number;
  dispatchedQty: number;
  receivedQty: number;
  acceptedQty: number;
  rejectedQty: number;
  unitPriceKes: number;
  discrepancyReason?: DiscrepancyReason;
  discrepancyExplanation?: string;
}

function DeliveriesContent() {
  const searchParams = useSearchParams();
  const {
    deliveries,
    orders,
    vehicles,
    drivers,
    can,
    updateDeliveryStatus,
    recordDeliveryArrival,
    reassignDeliveryRun,
  } = useBos();

  const [filterMode, setFilterMode] = useState<'all' | 'exceptions' | 'in-transit' | 'pending' | 'delivered'>('all');
  const [podRun, setPodRun] = useState<DeliveryRunRecord | null>(null);
  const [selectedOrderNum, setSelectedOrderNum] = useState<string>('');
  const [reassignRun, setReassignRun] = useState<DeliveryRunRecord | null>(null);
  const [selectedVehicleReg, setSelectedVehicleReg] = useState('');
  const [selectedDriverName, setSelectedDriverName] = useState('');
  const [transportCostInput, setTransportCostInput] = useState<number>(4500);
  const [recipientName, setRecipientName] = useState('');
  const [recipientRole, setRecipientRole] = useState('Stores Receiving Officer / Head Cateress');
  const [receivingDepartment, setReceivingDepartment] = useState('Main Stores & Central Kitchen');
  const [podLineItems, setPodLineItems] = useState<PodLineFormItem[]>([]);
  const [feedback, setFeedback] = useState<{
    msg: string;
    type: 'success' | 'error';
  } | null>(null);

  // Sync selected order and pre-populate POD items when opening POD modal
  useEffect(() => {
    if (!podRun) {
      setSelectedOrderNum('');
      setPodLineItems([]);
      return;
    }
    const orderToInspect = selectedOrderNum || podRun.ordersIncluded[0] || '';
    setSelectedOrderNum(orderToInspect);
    const ord = orders.find((o) => o.orderNumber === orderToInspect || o.id === orderToInspect);
    if (ord) {
      setPodLineItems(
        ord.items.map((it) => ({
          productId: it.productId,
          productName: it.productName,
          sku: it.sku,
          unit: it.unit,
          orderedQty: it.quantity,
          dispatchedQty: it.quantity,
          receivedQty: it.quantity,
          acceptedQty: it.quantity,
          rejectedQty: 0,
          unitPriceKes: it.unitPriceKes,
          discrepancyReason: undefined,
          discrepancyExplanation: '',
        }))
      );
    }
  }, [podRun, selectedOrderNum, orders]);

  // Read search parameters for drill-down support (Section 14 & 26)
  useEffect(() => {
    const filterParam = searchParams.get('filter');
    const statusParam = searchParams.get('status');

    if (filterParam === 'exceptions') {
      setFilterMode('exceptions');
    } else if (statusParam === 'Dispatched' || statusParam === 'In Transit') {
      setFilterMode('in-transit');
    }
  }, [searchParams]);

  // Top Metrics (Section 26: Today's Deliveries, Pending Dispatch, In Transit, Delivered, Exceptions)
  const todayTotal = deliveries.length;
  const pendingDispatch = deliveries.filter((d) => d.status === 'Planned' || d.status === 'Loaded').length;
  const inTransit = deliveries.filter((d) => d.status === 'Dispatched').length;
  const deliveredCount = deliveries.filter((d) => d.status === 'Delivered').length;
  const exceptionsCount = 1; // DR-2026-081 Waiyaki Way traffic congestion

  const handleStatusChange = async (
    runId: string,
    status: DeliveryRunRecord['status'],
    signOff?: string
  ) => {
    const res = await updateDeliveryStatus(runId, status, signOff);
    setFeedback({ msg: res.message, type: res.ok ? 'success' : 'error' });
  };

  const handleReceivedQtyChange = (idx: number, newReceived: number) => {
    setPodLineItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        const clampedReceived = Math.max(0, newReceived);
        const accepted = Math.min(item.acceptedQty, clampedReceived);
        const rejected = Math.max(0, clampedReceived - accepted);
        return {
          ...item,
          receivedQty: clampedReceived,
          acceptedQty: accepted,
          rejectedQty: rejected,
        };
      })
    );
  };

  const handleAcceptedQtyChange = (idx: number, newAccepted: number) => {
    setPodLineItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        const clampedAccepted = Math.max(0, Math.min(newAccepted, item.receivedQty));
        const rejected = Math.max(0, item.receivedQty - clampedAccepted);
        return {
          ...item,
          acceptedQty: clampedAccepted,
          rejectedQty: rejected,
        };
      })
    );
  };

  const handleReassignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassignRun) return;

    const foundDriver = drivers.find((d) => d.fullName === selectedDriverName);
    const foundVehicle = vehicles.find((v) => v.registration === selectedVehicleReg);

    const res = await reassignDeliveryRun(reassignRun.id, {
      vehicleId: foundVehicle?.id,
      vehicleReg: selectedVehicleReg,
      driverId: foundDriver?.id,
      driverName: selectedDriverName,
      driverPhone: foundDriver?.phone || reassignRun.driverPhone,
      transportCostKes: Number(transportCostInput),
    });

    setFeedback({ msg: res.message, type: res.ok ? 'success' : 'error' });
    if (res.ok) {
      setReassignRun(null);
    }
  };

  const handlePodSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!podRun || !selectedOrderNum) return;

    const ord = orders.find((o) => o.orderNumber === selectedOrderNum || o.id === selectedOrderNum);
    if (!ord) return;

    const signOffRecipient = recipientName.trim() || 'Institutional Receiving Officer';

    const res = await recordDeliveryArrival(ord.id, {
      recipientName: signOffRecipient,
      recipientRole,
      receivingDepartment,
      deliveredItems: podLineItems.map((it) => ({
        productId: it.productId,
        productName: it.productName,
        sku: it.sku,
        unit: it.unit,
        orderedQty: it.orderedQty,
        dispatchedQty: it.dispatchedQty,
        receivedQty: it.receivedQty,
        acceptedQty: it.acceptedQty,
        rejectedQty: it.rejectedQty,
        unitPriceKes: it.unitPriceKes,
        discrepancyReason: it.rejectedQty > 0 || it.receivedQty < it.dispatchedQty ? it.discrepancyReason : undefined,
        discrepancyExplanation: it.discrepancyExplanation,
      })),
      notes: `Captured via Run ${podRun.runNumber} (${podRun.vehiclePlate || podRun.vehicleReg})`,
    });

    setFeedback({ msg: res.message, type: res.ok ? 'success' : 'error' });

    if (res.ok) {
      // Check if all orders in this run have now been recorded
      const otherOrders = podRun.ordersIncluded.filter((oNum) => oNum !== selectedOrderNum);
      const remainingUnfulfilled = otherOrders.filter(
        (oNum) => orders.find((o) => (o.orderNumber === oNum || o.id === oNum) && o.status !== 'Delivered' && o.status !== 'Closed')
      );
      if (remainingUnfulfilled.length === 0) {
        await handleStatusChange(
          podRun.id,
          'Delivered',
          `${signOffRecipient} (${recipientRole}) · Signed Electronic POD`
        );
      }
      setPodRun(null);
      setRecipientName('');
    }
  };

  const filteredRuns = useMemo(() => {
    return deliveries.filter((run) => {
      if (filterMode === 'exceptions') {
        return run.routeZone.includes('Westlands') || run.status === 'Dispatched';
      }
      if (filterMode === 'pending') {
        return run.status === 'Planned' || run.status === 'Loaded';
      }
      if (filterMode === 'in-transit') {
        return run.status === 'Dispatched';
      }
      if (filterMode === 'delivered') {
        return run.status === 'Delivered';
      }
      return true;
    });
  }, [deliveries, filterMode]);

  // Delivery Exceptions Work Queue
  const deliveryExceptionsQueue: WorkQueueItem[] = [
    {
      id: 'ex-01',
      title: 'Run DR-2026-081 · +35 min Congestion Delay',
      subtitle: 'Van KDC-304L delayed along Waiyaki Way approaching Westlands',
      tag: 'Stop 2 of 4',
      severity: 'warning',
      actionLabel: 'Update Destination ETA',
      onAction: () => setFeedback({ msg: 'ETA adjusted by +30m. Hospital cateress notified via SMS.', type: 'success' }),
      metadata: 'Driver: Peter Otieno (+254 721 440 219)',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header (Section 26 & 31) */}
      <PageHeader
        kicker="FLEET DISPATCH & LAST-MILE LOGISTICS"
        title="Today's Operational Movement & Dispatch"
        description="Keep today's refrigerated and dry bulk deliveries moving toward successful on-time arrival: live ETAs, route milestones, and electronic POD capture."
      />

      <FeedbackBanner
        message={feedback?.msg || null}
        type={feedback?.type}
        onDismiss={() => setFeedback(null)}
      />

      {/* Top Decision Summary Metrics (Section 26: Today's Deliveries, Pending Dispatch, In Transit, Delivered, Exceptions) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KPI
          label="Today's Deliveries"
          value={`${todayTotal} Runs`}
          sublabel="Fleet route schedules"
          tone="positive"
        />
        <KPI
          label="Pending Dispatch"
          value={`${pendingDispatch} Runs`}
          sublabel="Cold hub loading bays"
          tone="neutral"
        />
        <KPI
          label="In Transit"
          value={`${inTransit} Active`}
          sublabel="Telemetry tracking on"
          tone="positive"
        />
        <KPI
          label="Delivered & POD"
          value={`${deliveredCount} Verified`}
          sublabel="Kitchen receiving signed"
          tone="positive"
        />
        <KPI
          label="Fleet Exceptions"
          value={`${exceptionsCount} Delay`}
          sublabel="Waiyaki Way traffic alert"
          tone="warning"
        />
      </div>

      {/* Exceptions Work Queue */}
      {exceptionsCount > 0 && (
        <WorkQueue
          title="Fleet Exceptions & Route Alerts"
          subtitle="Real-time delivery delays requiring customer ETA updates"
          badgeCount={deliveryExceptionsQueue.length}
          items={deliveryExceptionsQueue}
        />
      )}

      {/* Interactive Filter Pills */}
      <div className="flex items-center gap-1 p-1 rounded-[10px] bg-[var(--bg-card)] border border-[var(--border-subtle)] w-fit">
        <button
          type="button"
          onClick={() => setFilterMode('all')}
          className={`px-3.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
            filterMode === 'all'
              ? 'bg-[#1F6A37] text-white shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          All Runs ({deliveries.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterMode('pending')}
          className={`px-3.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
            filterMode === 'pending'
              ? 'bg-[#1F6A37] text-white shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Pending Dispatch ({pendingDispatch})
        </button>
        <button
          type="button"
          onClick={() => setFilterMode('in-transit')}
          className={`px-3.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
            filterMode === 'in-transit'
              ? 'bg-[#1F6A37] text-white shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          In Transit ({inTransit})
        </button>
        <button
          type="button"
          onClick={() => setFilterMode('delivered')}
          className={`px-3.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
            filterMode === 'delivered'
              ? 'bg-[#1F6A37] text-white shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Delivered ({deliveredCount})
        </button>
        <button
          type="button"
          onClick={() => setFilterMode('exceptions')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
            filterMode === 'exceptions'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Exceptions ({exceptionsCount})
        </button>
      </div>

      {/* Delivery Cards Workbench (Section 26: Customer, Destination, Driver, ETA, Status, Primary action) */}
      <div className="space-y-4">
        {filteredRuns.map((run) => (
          <Card key={run.id} padding="p-5" variant="raised">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="font-mono-tabular text-sm font-semibold text-[#1F6A37] dark:text-[#4EB462]">
                    {run.runNumber}
                  </span>
                  <StatusBadge status={run.status} />
                  <span className="text-xs text-[var(--text-secondary)] font-mono-tabular">
                    Departure SLA: {run.departureTime}
                  </span>
                </div>

                <h3 className="font-heading text-base font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#1F6A37] dark:text-[#4EB462] shrink-0" />
                  <span>{run.routeZone}</span>
                </h3>

                <div className="text-xs text-[var(--text-secondary)] flex flex-wrap items-center gap-2">
                  <span>Vehicle: <strong className="text-[var(--text-primary)]">{run.vehicleReg}</strong></span>
                  <span>·</span>
                  <span>Driver: <strong className="text-[var(--text-primary)]">{run.driverName}</strong> ({run.driverPhone})</span>
                  <span>·</span>
                  <span className="font-mono-tabular">Payload: {run.totalWeightKg.toLocaleString()} kg</span>
                  <span>·</span>
                  <span className="font-mono-tabular text-[#1F6A37] dark:text-[#4EB462] font-semibold">
                    Transport Cost: KES {(run.transportCostKes || 4500).toLocaleString()}
                  </span>
                </div>

                <div className="text-xs text-[var(--text-secondary)] pt-1">
                  Target Institutions Served:{' '}
                  <span className="text-[var(--text-primary)] font-semibold">
                    {run.institutionsServed.join(' · ')}
                  </span>
                </div>

                {run.recipientSignOff && (
                  <div className="text-xs text-[#1F6A37] dark:text-[#4EB462] font-semibold pt-1 flex items-center gap-1.5">
                    <FileCheck2 className="w-3.5 h-3.5" />
                    <span>Electronic POD: {run.recipientSignOff}</span>
                  </div>
                )}
              </div>

              {/* Status-Driven Primary Action (Section 26) */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setReassignRun(run);
                    setSelectedVehicleReg(run.vehicleReg);
                    setSelectedDriverName(run.driverName);
                    setTransportCostInput(run.transportCostKes || 4500);
                  }}
                  className="h-9 px-3.5 rounded-md border border-[var(--border-subtle)] text-xs font-medium hover:bg-[var(--bg-canvas)] cursor-pointer"
                >
                  Assign Fleet / Driver
                </button>

                {can('deliveries.dispatch') && (
                  <>
                    {run.status === 'Planned' && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(run.id, 'Loaded')}
                        className="h-9 px-4 rounded-md bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs font-semibold hover:border-[#4EB462] cursor-pointer"
                      >
                        Confirm Loading
                      </button>
                    )}
                    {(run.status === 'Planned' || run.status === 'Loaded') && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(run.id, 'Dispatched')}
                        className="h-9 px-4 rounded-md bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>Dispatch Route</span>
                      </button>
                    )}
                    {run.status !== 'Delivered' && (
                      <button
                        type="button"
                        onClick={() => setPodRun(run)}
                        className="h-9 px-4 rounded-md bg-[#12512C] hover:bg-[#1F6A37] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Capture POD</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Reassign Vehicle & Driver Modal */}
      <Modal
        open={Boolean(reassignRun)}
        onClose={() => setReassignRun(null)}
        title={reassignRun ? `Assign Vehicle & Driver · ${reassignRun.runNumber}` : ''}
        subtitle="Select from registered AgroHub fleet vehicles and certified driver roster"
      >
        {reassignRun && (
          <form onSubmit={handleReassignSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1">Select Fleet Vehicle *</label>
              <select
                value={selectedVehicleReg}
                onChange={(e) => setSelectedVehicleReg(e.target.value)}
                className="w-full h-10 px-3 rounded-md bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs cursor-pointer"
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.registration}>
                    {v.registration} · {v.makeModel} ({v.type} · Capacity {v.capacityKg} kg · {v.status})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Select Assigned Driver *</label>
              <select
                value={selectedDriverName}
                onChange={(e) => setSelectedDriverName(e.target.value)}
                className="w-full h-10 px-3 rounded-md bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs cursor-pointer"
              >
                {drivers.map((d) => (
                  <option key={d.id} value={d.fullName}>
                    {d.fullName} ({d.phone} · DL: {d.licenseNumber} · {d.status})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Estimated Transport & Fuel Cost (KES)</label>
              <input
                type="number"
                value={transportCostInput}
                onChange={(e) => setTransportCostInput(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-md bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs font-mono-tabular"
              />
            </div>

            <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setReassignRun(null)}
                className="h-9 px-4 rounded-md border border-[var(--border-subtle)] text-xs font-medium hover:bg-[var(--bg-canvas)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-9 px-5 rounded-md bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-semibold cursor-pointer shadow-xs"
              >
                Save Assignment
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Electronic Proof of Delivery Modal with Line-Item Discrepancy Reconciliation */}
      <Modal
        open={Boolean(podRun)}
        onClose={() => setPodRun(null)}
        title={podRun ? `Capture Electronic POD · Route ${podRun.runNumber}` : ''}
        subtitle={podRun ? `Record physical offload, verify actual received produce, and document any shortages or rejections.` : ''}
      >
        {podRun && (
          <form onSubmit={handlePodSubmit} className="space-y-4">
            {/* Multi-Order Selection Header (if multiple stops) */}
            {podRun.ordersIncluded.length > 1 && (
              <div className="p-3 rounded-md bg-[var(--bg-canvas)] border border-[var(--border-subtle)] flex items-center justify-between gap-3">
                <label className="text-xs font-semibold text-[var(--text-primary)]">
                  Select Delivery Stop Order:
                </label>
                <select
                  value={selectedOrderNum}
                  onChange={(e) => setSelectedOrderNum(e.target.value)}
                  className="h-8 px-3 rounded-md text-xs bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-mono font-semibold cursor-pointer"
                >
                  {podRun.ordersIncluded.map((oNum) => {
                    const matched = orders.find((o) => o.orderNumber === oNum || o.id === oNum);
                    return (
                      <option key={oNum} value={oNum}>
                        {oNum} · {matched?.customerName || 'Customer Order'}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* Receiving Officer & Department Credentials */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-md bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs">
              <div>
                <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                  Receiving Officer Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="e.g. Mrs. Esther Wambui"
                  className="w-full h-8 px-2.5 rounded-md text-xs bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                  Designation / Role *
                </label>
                <input
                  type="text"
                  required
                  value={recipientRole}
                  onChange={(e) => setRecipientRole(e.target.value)}
                  placeholder="e.g. Stores In-Charge / Cateress"
                  className="w-full h-8 px-2.5 rounded-md text-xs bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                  Department / Section
                </label>
                <input
                  type="text"
                  value={receivingDepartment}
                  onChange={(e) => setReceivingDepartment(e.target.value)}
                  placeholder="e.g. Main Central Kitchen / Dock"
                  className="w-full h-8 px-2.5 rounded-md text-xs bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                />
              </div>
            </div>

            {/* Line Items Quantity Reconciliation Table */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-[var(--text-primary)]">
                  Line Items Received & Quality Acceptance ({podLineItems.length})
                </span>
                <span className="text-[11px] text-[var(--text-secondary)]">
                  Edit actual received and accepted quantities if discrepancies exist.
                </span>
              </div>

              <div className="border border-[var(--border-subtle)] rounded-md overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[var(--bg-canvas)] border-b border-[var(--border-subtle)] text-[10px] font-semibold text-[var(--text-secondary)] sticky top-0">
                    <tr>
                      <th className="py-2 px-2.5">Produce Item</th>
                      <th className="py-2 px-2 text-right">Dispatched</th>
                      <th className="py-2 px-2 text-center w-20">Received</th>
                      <th className="py-2 px-2 text-center w-20">Accepted</th>
                      <th className="py-2 px-2 text-right">Rejected</th>
                      <th className="py-2 px-2 text-right">Shortage</th>
                      <th className="py-2 px-2.5">Reason / Discrepancy</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {podLineItems.map((item, idx) => {
                      const shortage = Math.max(0, item.dispatchedQty - item.receivedQty);
                      const rejected = item.rejectedQty;
                      const hasDiscrepancy = shortage > 0 || rejected > 0 || item.receivedQty > item.dispatchedQty;
                      const classification = classifyPODDiscrepancy(
                        item.orderedQty,
                        item.dispatchedQty,
                        item.receivedQty,
                        item.acceptedQty
                      );

                      return (
                        <tr key={item.productId || idx} className="hover:bg-[var(--bg-canvas)]/50">
                          <td className="py-2 px-2.5">
                            <div className="font-medium text-[var(--text-primary)]">{item.productName}</div>
                            <div className="text-[10px] text-[var(--text-secondary)] font-mono">{item.sku}</div>
                          </td>
                          <td className="py-2 px-2 text-right font-mono font-medium">
                            {item.dispatchedQty} {item.unit}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <input
                              type="number"
                              min="0"
                              value={item.receivedQty}
                              onChange={(e) => handleReceivedQtyChange(idx, Number(e.target.value))}
                              className="w-16 h-7 px-1.5 text-center font-mono font-semibold rounded text-xs bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                            />
                          </td>
                          <td className="py-2 px-2 text-center">
                            <input
                              type="number"
                              min="0"
                              max={item.receivedQty}
                              value={item.acceptedQty}
                              onChange={(e) => handleAcceptedQtyChange(idx, Number(e.target.value))}
                              className="w-16 h-7 px-1.5 text-center font-mono font-bold rounded text-xs bg-[var(--bg-card)] border border-[#1F6A37]/50 text-[#1F6A37] dark:text-[#4EB462]"
                            />
                          </td>
                          <td className="py-2 px-2 text-right font-mono font-semibold text-red-600 dark:text-red-400">
                            {rejected > 0 ? `${rejected} ${item.unit}` : '0'}
                          </td>
                          <td className="py-2 px-2 text-right font-mono text-amber-600 dark:text-amber-400">
                            {shortage > 0 ? `${shortage} ${item.unit}` : '0'}
                          </td>
                          <td className="py-2 px-2.5">
                            {hasDiscrepancy ? (
                              <div className="space-y-1">
                                <select
                                  value={item.discrepancyReason || 'Dispatch Shortage'}
                                  onChange={(e) => {
                                    const val = e.target.value as DiscrepancyReason;
                                    setPodLineItems((prev) =>
                                      prev.map((it, i) => (i === idx ? { ...it, discrepancyReason: val } : it))
                                    );
                                  }}
                                  className="h-6 px-1 rounded text-[10px] bg-[var(--bg-card)] border border-amber-500/50 text-amber-800 dark:text-amber-300"
                                >
                                  <option value="Damaged in Transit">Damaged in Transit</option>
                                  <option value="Quality / Spoilage">Quality / Spoilage</option>
                                  <option value="Packaging Defect">Packaging Defect</option>
                                  <option value="Incorrect Produce / Spec">Incorrect Produce / Spec</option>
                                  <option value="Dispatch Shortage">Dispatch Shortage</option>
                                  <option value="Customer Refusal">Customer Refusal</option>
                                  <option value="Other">Other</option>
                                </select>
                                <input
                                  type="text"
                                  placeholder="Specific note"
                                  value={item.discrepancyExplanation || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setPodLineItems((prev) =>
                                      prev.map((it, i) => (i === idx ? { ...it, discrepancyExplanation: val } : it))
                                    );
                                  }}
                                  className="w-full h-5 px-1 rounded text-[10px] bg-[var(--bg-card)] border border-[var(--border-subtle)]"
                                />
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>{classification}</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-3 rounded-md bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">
              <strong>Invoice Policy:</strong> Customer invoice is strictly generated against verified <strong>accepted quantities</strong>. Discrepancies and rejected goods are documented in the audit log and exempted from billing.
            </div>

            <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPodRun(null)}
                className="h-9 px-4 rounded-md border border-[var(--border-subtle)] text-xs font-medium hover:bg-[var(--bg-canvas)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-9 px-5 rounded-md bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-semibold cursor-pointer shadow-xs inline-flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Submit Verified POD Sign-off</span>
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

export default function DeliveriesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-[var(--text-secondary)]">Loading Deliveries Workbench...</div>}>
      <DeliveriesContent />
    </Suspense>
  );
}

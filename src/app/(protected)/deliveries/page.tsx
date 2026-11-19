'use client';

import { Suspense, useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, MapPin, Truck } from 'lucide-react';
import { Card, FeedbackBanner, KPI, Modal, PageHeader, StatusBadge } from '@/components/ui/primitives';
import { PODQuantityForm, podInputClass, podPrimaryClass, podSecondaryClass } from '@/components/ui/PODQuantityForm';
import { useBos } from '@/lib/services/bos-context';
import { canAccessDeliveryRun, getDeliveryRunStops, getPODExpectedLines, getUnassignedPackedOrders, hasDeliveryRunException, isOpenPODDiscrepancy, type PODQuantityInput } from '@/lib/services/delivery-workflow';
import type { DeliveryRunRecord, OrderRecord } from '@/types/domain/bos';

type Filter = 'all' | 'dispatch' | 'in-transit' | 'delivered' | 'exceptions';

function CapturePOD({ run, order, onClose, onRecorded }: {
  run: DeliveryRunRecord; order: OrderRecord; onClose: () => void; onRecorded: (message: string) => void;
}) {
  const { podRecords, recordDeliveryArrival } = useBos();
  const [recipient, setRecipient] = useState('');
  const [role, setRole] = useState('');
  const [department, setDepartment] = useState('');
  const [notes, setNotes] = useState('');

  async function save(quantities: PODQuantityInput[]) {
    const result = await recordDeliveryArrival(order.id, {
      deliveryRunId: run.id,
      recipientName: recipient,
      recipientRole: role,
      receivingDepartment: department,
      quantities,
      quantitiesConfirmed: true,
      notes: notes.trim() || undefined,
    });
    if (result.ok) onRecorded(result.message);
    return result;
  }

  return (
    <PODQuantityForm mode="capture" expected={getPODExpectedLines(order, podRecords)} onSubmit={save} onCancel={onClose}>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="ui-label space-y-1">
          <span>Recipient name</span>
          <input className={podInputClass} value={recipient} onChange={(event) => setRecipient(event.target.value)} required />
        </label>
        <label className="ui-label space-y-1">
          <span>Recipient role (optional)</span>
          <input className={podInputClass} value={role} onChange={(event) => setRole(event.target.value)} />
        </label>
        <label className="ui-label space-y-1">
          <span>Receiving department (optional)</span>
          <input className={podInputClass} value={department} onChange={(event) => setDepartment(event.target.value)} />
        </label>
        <label className="ui-label space-y-1 sm:col-span-3">
          <span>Delivery notes (optional)</span>
          <textarea className={podInputClass} rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} />
        </label>
      </div>
    </PODQuantityForm>
  );
}

function AssignFleet({ run, onClose, onSaved }: {
  run: DeliveryRunRecord; onClose: () => void; onSaved: (message: string) => void;
}) {
  const { drivers, vehicles, reassignDeliveryRun } = useBos();
  const [vehicleId, setVehicleId] = useState(run.assignedVehicleId || vehicles.find((vehicle) => vehicle.registration === run.vehicleReg)?.id || '');
  const [driverId, setDriverId] = useState(run.assignedDriverId || drivers.find((driver) => driver.fullName === run.driverName)?.id || '');
  const [cost, setCost] = useState(run.transportCostKes?.toString() ?? '');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    try {
      const result = await reassignDeliveryRun(run.id, {
        vehicleId, driverId, transportCostKes: cost === '' ? undefined : Number(cost),
      });
      if (result.ok) onSaved(result.message);
      else setError(result.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={save}>
      <label className="ui-label block space-y-1">
        <span>Vehicle</span>
        <select className={podInputClass} value={vehicleId} onChange={(event) => setVehicleId(event.target.value)} required>
          <option value="">Select a vehicle</option>
          {vehicles.filter((vehicle) => !['Maintenance', 'Out of Service'].includes(vehicle.status)).map((vehicle) =>
            <option key={vehicle.id} value={vehicle.id}>{vehicle.registration} · {vehicle.makeModel}</option>)}
        </select>
      </label>
      <label className="ui-label block space-y-1">
        <span>Driver</span>
        <select className={podInputClass} value={driverId} onChange={(event) => setDriverId(event.target.value)} required>
          <option value="">Select a driver</option>
          {drivers.filter((driver) => !['Leave', 'Off Duty'].includes(driver.status)).map((driver) =>
            <option key={driver.id} value={driver.id}>{driver.fullName}</option>)}
        </select>
      </label>
      <label className="ui-label block space-y-1">
        <span>Transport cost (KES, optional)</span>
        <input className={podInputClass} type="number" min="0" step="0.01" value={cost} onChange={(event) => setCost(event.target.value)} />
      </label>
      {error && <p role="alert" className="text-sm text-[var(--status-danger-fg)]">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" className={podSecondaryClass} onClick={onClose} disabled={pending}>Cancel</button>
        <button type="submit" className={podPrimaryClass} disabled={pending}>{pending ? 'Saving…' : 'Save assignment'}</button>
      </div>
    </form>
  );
}

function PlanRun({ orderNumber, onClose, onSaved }: { orderNumber?: string; onClose: () => void; onSaved: (message: string) => void }) {
  const { orders, deliveries, drivers, vehicles, createDeliveryRun } = useBos();
  const available = getUnassignedPackedOrders(orders, deliveries);
  const [orderIds, setOrderIds] = useState(() => available.filter((order) => order.orderNumber === orderNumber).map((order) => order.id));
  const [routeZone, setRouteZone] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    try {
      const result = await createDeliveryRun({ routeZone, scheduledDate, departureTime, orderIds, vehicleId, driverId });
      if (result.ok) onSaved(result.message);
      else setError(result.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={save}>
      <label className="ui-label block space-y-1"><span>Route name</span><input required className={podInputClass} value={routeZone} onChange={(event) => setRouteZone(event.target.value)} /></label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="ui-label block space-y-1"><span>Delivery date</span><input type="date" required className={podInputClass} value={scheduledDate} onChange={(event) => setScheduledDate(event.target.value)} /></label>
        <label className="ui-label block space-y-1"><span>Departure time (EAT)</span><input type="time" required className={podInputClass} value={departureTime} onChange={(event) => setDepartureTime(event.target.value)} /></label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="ui-label block space-y-1"><span>Vehicle</span>
          <select required className={podInputClass} value={vehicleId} onChange={(event) => setVehicleId(event.target.value)}>
            <option value="">Select a vehicle</option>
            {vehicles.filter((vehicle) => !['Maintenance', 'Out of Service'].includes(vehicle.status)).map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.registration}</option>)}
          </select>
        </label>
        <label className="ui-label block space-y-1"><span>Driver</span>
          <select required className={podInputClass} value={driverId} onChange={(event) => setDriverId(event.target.value)}>
            <option value="">Select a driver</option>
            {drivers.filter((driver) => !['Leave', 'Off Duty'].includes(driver.status)).map((driver) => <option key={driver.id} value={driver.id}>{driver.fullName}</option>)}
          </select>
        </label>
      </div>
      <fieldset className="space-y-2 rounded-lg border border-[var(--border-subtle)] p-3">
        <legend className="px-1 text-sm font-semibold">Packed orders</legend>
        {available.length === 0 && <p className="text-sm text-[var(--text-secondary)]">No packed orders are available to add to a run.</p>}
        {available.map((order) => (
          <label key={order.id} className="ui-label flex min-h-11 items-center gap-3">
            <input type="checkbox" checked={orderIds.includes(order.id)} className="size-5 shrink-0 accent-[var(--brand-accent)]"
              onChange={(event) => setOrderIds((current) => event.target.checked ? [...current, order.id] : current.filter((id) => id !== order.id))} />
            {order.orderNumber} · {order.customerName}
          </label>
        ))}
      </fieldset>
      {error && <p role="alert" className="text-sm text-[var(--status-danger-fg)]">{error}</p>}
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" disabled={pending} onClick={onClose} className={podSecondaryClass}>Cancel</button>
        <button type="submit" disabled={pending || !orderIds.length} className={podPrimaryClass}>{pending ? 'Saving…' : 'Plan run'}</button>
      </div>
    </form>
  );
}

function DeliveriesContent() {
  const searchParams = useSearchParams();
  const { deliveries, orders, currentUser, drivers, can, podRecords, updateDeliveryStatus } = useBos();
  const requestedFilter = searchParams.get('filter');
  const requestedStatus = searchParams.get('status');
  const orderFilter = searchParams.get('order');
  const filter: Filter = (
    requestedFilter === 'exceptions' || requestedFilter === 'dispatch' || requestedFilter === 'in-transit' || requestedFilter === 'delivered'
      ? requestedFilter
      : requestedStatus === 'Dispatched' || requestedStatus === 'In Transit' ? 'in-transit' : 'all'
  );
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [captureOrderId, setCaptureOrderId] = useState<string | null>(null);
  const [assignRunId, setAssignRunId] = useState<string | null>(null);
  const [planning, setPlanning] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const visibleRuns = deliveries.filter((run) => canAccessDeliveryRun(run, currentUser, drivers));
  const runs = visibleRuns.filter((run) => !orderFilter || run.ordersIncluded.includes(orderFilter));
  const allStops = new Map(runs.map((run) => [run.id, getDeliveryRunStops(run, orders, podRecords)]));
  const isDispatch = (run: DeliveryRunRecord) => run.status === 'Planned' || run.status === 'Loaded';
  const isInTransit = (run: DeliveryRunRecord) => run.status === 'Dispatched' || run.status === 'Partially Delivered';
  const pending = runs.filter(isDispatch);
  const inTransit = runs.filter(isInTransit);
  const recorded = runs.filter((run) => run.status === 'Delivered');
  const exceptions = runs.filter((run) => hasDeliveryRunException(run, orders, podRecords));
  const filters: { id: Filter; label: string; list: DeliveryRunRecord[] }[] = [
    { id: 'all', label: 'All runs', list: runs },
    { id: 'dispatch', label: 'Pending dispatch', list: pending },
    { id: 'in-transit', label: 'In transit', list: inTransit },
    { id: 'delivered', label: 'Arrivals recorded', list: recorded },
    { id: 'exceptions', label: 'Exceptions', list: exceptions },
  ];
  const activeRun = visibleRuns.find((run) => run.id === activeRunId);
  const assignRun = visibleRuns.find((run) => run.id === assignRunId);
  const captureOrder = orders.find((order) => order.id === captureOrderId);

  async function changeStatus(run: DeliveryRunRecord, status: DeliveryRunRecord['status']) {
    if (updating) return;
    setUpdating(run.id);
    try {
      const result = await updateDeliveryStatus(run.id, status);
      setFeedback({ msg: result.message, type: result.ok ? 'success' : 'error' });
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title={currentUser?.roleId === 'delivery_driver' ? 'My delivery runs' : 'Delivery runs'}
        description="Review dispatch, customer stops and proof of delivery."
        actions={can('deliveries.assign') && <button type="button" className={podPrimaryClass} onClick={() => setPlanning(true)}>Plan delivery run</button>} />
      <FeedbackBanner message={feedback?.msg ?? null} type={feedback?.type} onDismiss={() => setFeedback(null)} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPI label="Pending dispatch" value={String(pending.length)} tone="neutral" />
        <KPI label="In transit" value={String(inTransit.length)} tone="neutral" />
        <KPI label="Arrivals recorded" value={String(recorded.length)} tone="positive" />
        <KPI label="Exceptions" value={String(exceptions.length)} tone={exceptions.length ? 'warning' : 'neutral'} />
      </div>

      {orderFilter && <div className="flex flex-wrap items-center gap-3 text-sm">Runs for {orderFilter} <Link href="/deliveries" className="underline">Show all runs</Link></div>}
      <div className="flex flex-wrap gap-2" aria-label="Filter delivery runs" role="group">
        {filters.map((item) => (
          <Link key={item.id} href={`/deliveries?${new URLSearchParams({ filter: item.id, ...(orderFilter ? { order: orderFilter } : {}) })}`} aria-current={filter === item.id ? 'page' : undefined}
            className="ui-tab">
            {item.label} ({item.list.length})
          </Link>
        ))}
      </div>

      <div className="grid gap-4">
        {filters.find((item) => item.id === filter)?.list.map((run) => {
          const stops = allStops.get(run.id) ?? [];
          const arrivals = stops.filter(({ receipt, stop }) => receipt ? receipt.status !== 'Rejected' : stop?.status === 'Delivered').length;
          return (
            <section key={run.id} id={`run-${run.id}`} className="scroll-mt-24">
              <Card padding="p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold tabular-nums">{run.runNumber}</span>
                      <StatusBadge status={run.status === 'Delivered' ? 'Arrivals recorded' : run.status} />
                    </div>
                    <h2 className="ui-section-title flex items-start gap-2"><MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{run.routeZone}</h2>
                    <p className="text-sm text-[var(--text-secondary)]">{run.driverName} · {run.vehicleReg}</p>
                    <p className="text-sm text-[var(--text-secondary)]">{[run.scheduledDate, run.departureTime].filter(Boolean).join(' · ')} · {arrivals} of {stops.length} stops recorded</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {can('deliveries.dispatch') && run.status === 'Planned' &&
                      <button type="button" onClick={() => changeStatus(run, 'Loaded')} disabled={Boolean(updating)} className={podSecondaryClass}>Confirm loading</button>}
                    {can('deliveries.dispatch') && isDispatch(run) &&
                      <button type="button" onClick={() => changeStatus(run, 'Dispatched')} disabled={Boolean(updating)} className={podPrimaryClass}><Truck className="mr-2 size-4" aria-hidden="true" />Dispatch run</button>}
                    <button type="button" onClick={() => setActiveRunId(run.id)} className={podSecondaryClass}>View stops <ArrowRight className="ml-2 size-4" aria-hidden="true" /></button>
                  </div>
                </div>
              </Card>
            </section>
          );
        })}
        {filters.find((item) => item.id === filter)?.list.length === 0 && <p className="rounded-xl border border-[var(--border-subtle)] p-6 text-sm text-[var(--text-secondary)]">No delivery runs match this view.</p>}
      </div>

      <Modal open={Boolean(activeRun && !captureOrder)} onClose={() => setActiveRunId(null)}
        title={activeRun?.runNumber ?? 'Delivery run'} subtitle={activeRun?.routeZone} size="lg">
        {activeRun && !captureOrder && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-[var(--border-subtle)] p-3 text-sm">
              <div className="space-y-1">
                <p>{activeRun.vehicleReg}</p>
                <p>{activeRun.driverName} · {activeRun.driverPhone}</p>
                {activeRun.transportCostKes !== undefined && <p>KES {activeRun.transportCostKes.toLocaleString('en-KE')} transport cost</p>}
              </div>
              {isDispatch(activeRun) && (can('deliveries.assign') || can('fleet.manage')) &&
                <button type="button" className={podSecondaryClass} onClick={() => { setActiveRunId(null); setAssignRunId(activeRun.id); }}>Assign fleet</button>}
            </div>
            <h3 className="ui-section-title">Customer stops</h3>
            <ul className="space-y-2">
              {getDeliveryRunStops(activeRun, orders, podRecords).map(({ identifier, order, stop, receipt, customer }) => (
                <li key={identifier} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-[var(--border-subtle)] p-3">
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-semibold">{customer ?? identifier}</p>
                    <p className="text-sm text-[var(--text-secondary)]">{identifier}{(order?.deliveryAddress || stop?.deliveryAddress) && ` · ${order?.deliveryAddress || stop?.deliveryAddress}`}</p>
                    {receipt ? <StatusBadge status={receipt.status} /> : <StatusBadge status={stop?.status ?? 'Awaiting arrival'} />}
                  </div>
                  {order && can('deliveries.dispatch') && (isInTransit(activeRun) || receipt?.status === 'Rejected') &&
                    (!receipt || receipt.status === 'Rejected') &&
                    <button type="button" className={podPrimaryClass} onClick={() => setCaptureOrderId(order.id)}>{receipt ? 'Correct receipt' : 'Capture proof of delivery'}</button>}
                  {order && receipt && receipt.status !== 'Rejected' && can('fulfillment.manage') &&
                    <Link href={`/fulfillment?receipt=${receipt.id}`} className={podSecondaryClass}>View receipt</Link>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Modal>

      <Modal open={Boolean(activeRun && captureOrder)} onClose={() => setCaptureOrderId(null)}
        title="Capture proof of delivery" subtitle={captureOrder && `${captureOrder.orderNumber} · ${captureOrder.customerName}`} size="2xl">
        {activeRun && captureOrder && (
          <CapturePOD key={captureOrder.id} run={activeRun} order={captureOrder} onClose={() => setCaptureOrderId(null)}
            onRecorded={(message) => { setFeedback({ msg: message, type: 'success' }); setCaptureOrderId(null); }} />
        )}
      </Modal>

      <Modal open={Boolean(assignRun)} onClose={() => setAssignRunId(null)} title="Assign driver and vehicle" subtitle={assignRun?.runNumber}>
        {assignRun && <AssignFleet key={assignRun.id} run={assignRun} onClose={() => setAssignRunId(null)}
          onSaved={(message) => { setFeedback({ msg: message, type: 'success' }); setAssignRunId(null); }} />}
      </Modal>
      <Modal open={planning} onClose={() => setPlanning(false)} title="Plan delivery run" size="lg">
        {planning && <PlanRun orderNumber={orderFilter ?? undefined} onClose={() => setPlanning(false)}
          onSaved={(message) => { setFeedback({ msg: message, type: 'success' }); setPlanning(false); }} />}
      </Modal>
    </div>
  );
}

export default function DeliveriesPage() {
  return <Suspense fallback={<p className="p-6 text-sm text-[var(--text-secondary)]">Loading delivery runs…</p>}><DeliveriesContent /></Suspense>;
}

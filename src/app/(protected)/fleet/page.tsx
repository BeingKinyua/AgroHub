'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Car,
  CheckCircle2,
  Clock,
  Filter,
  Plus,
  Search,
  Shield,
  Truck,
  UserCheck,
  Users,
  Wrench,
} from 'lucide-react';
import { useBos } from '@/lib/services/bos-context';
import { DriverRecord, VehicleRecord } from '@/types/domain/bos';
import {
  Breadcrumbs,
  EmptyState,
  Modal,
  PageHeader,
  StatusBadge,
} from '@/components/ui/primitives';

const fleetField = 'ui-field mt-1.5 w-full';
const fleetCancel = 'ui-button ui-button-secondary';
const fleetSave = 'ui-button ui-button-primary';

export default function FleetPage() {
  const {
    vehicles,
    drivers,
    createVehicle,
    updateVehicle,
    createDriver,
    updateDriver,
    can,
  } = useBos();

  const [activeTab, setActiveTab] = useState<'vehicles' | 'drivers'>('vehicles');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Modals
  const [isRegisterVehicleOpen, setIsRegisterVehicleOpen] = useState(false);
  const [isOnboardDriverOpen, setIsOnboardDriverOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<VehicleRecord | null>(null);
  const [editingDriver, setEditingDriver] = useState<DriverRecord | null>(null);
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // New vehicle form state
  const [vehReg, setVehReg] = useState('');
  const [vehMakeModel, setVehMakeModel] = useState('');
  const [vehType, setVehType] = useState<VehicleRecord['type']>('Ambient Pickup');
  const [vehCapacity, setVehCapacity] = useState('1200');
  const [vehFuel, setVehFuel] = useState<VehicleRecord['fuelType']>('Diesel');
  const [vehDriverId, setVehDriverId] = useState('');
  const [vehSubmitting, setVehSubmitting] = useState(false);

  // New driver form state
  const [drvName, setDrvName] = useState('');
  const [drvPhone, setDrvPhone] = useState('');
  const [drvLicense, setDrvLicense] = useState('');
  const [drvClasses, setDrvClasses] = useState('B, C, E');
  const [drvVehicleId, setDrvVehicleId] = useState('');
  const [drvSubmitting, setDrvSubmitting] = useState(false);

  // Metrics
  const totalVehicles = vehicles.length;
  const onRouteVehicles = vehicles.filter((v) => v.status === 'On Route').length;
  const availableVehicles = vehicles.filter((v) => v.status === 'Available').length;
  const maintenanceVehicles = vehicles.filter((v) => v.status === 'Maintenance' || v.status === 'Out of Service').length;

  const totalDrivers = drivers.length;
  const availableDrivers = drivers.filter((d) => d.status === 'Available').length;
  const onDeliveryDrivers = drivers.filter((d) => d.status === 'On Delivery').length;

  // Filtered vehicles
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const matchesSearch =
        v.registration.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.makeModel.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (v.assignedDriverName && v.assignedDriverName.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = statusFilter === 'All' || v.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [vehicles, searchQuery, statusFilter]);

  // Filtered drivers
  const filteredDrivers = useMemo(() => {
    return drivers.filter((d) => {
      const matchesSearch =
        d.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.licenseNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.assignedVehicleReg && d.assignedVehicleReg.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = statusFilter === 'All' || d.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [drivers, searchQuery, statusFilter]);

  const handleRegisterVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehReg.trim() || !vehMakeModel.trim()) {
      setModalError('Enter the registration number and the vehicle’s make and model.');
      return;
    }
    setVehSubmitting(true);
    setModalError('');
    try {
      const assignedDriver = drivers.find((d) => d.id === vehDriverId);
      const result = await createVehicle({
        registration: vehReg.trim().toUpperCase(),
        makeModel: vehMakeModel.trim(),
        type: vehType,
        capacityKg: Number(vehCapacity) || 1000,
        fuelType: vehFuel,
        status: 'Available',
        assignedDriverId: vehDriverId || undefined,
        assignedDriverName: assignedDriver?.fullName,
        lastServiceDate: new Date().toISOString().split('T')[0],
        insuranceExpiry: '2027-12-31',
      });
      if (!result.ok) {
        setModalError(result.message);
        return;
      }
      setIsRegisterVehicleOpen(false);
      setVehReg('');
      setVehMakeModel('');
      setVehDriverId('');
    } finally {
      setVehSubmitting(false);
    }
  };

  const handleOnboardDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!drvName.trim() || !drvPhone.trim() || !drvLicense.trim() || !drvClasses.trim()) {
      setModalError('Enter the driver’s name, phone number, licence number, and licence classes.');
      return;
    }
    setDrvSubmitting(true);
    setModalError('');
    try {
      const assignedVeh = vehicles.find((v) => v.id === drvVehicleId);
      const result = await createDriver({
        fullName: drvName.trim(),
        phone: drvPhone.trim(),
        licenseNumber: drvLicense.trim().toUpperCase(),
        licenseClasses: drvClasses.trim(),
        status: 'Available',
        assignedVehicleId: drvVehicleId || undefined,
        assignedVehicleReg: assignedVeh?.registration,
      });
      if (!result.ok) {
        setModalError(result.message);
        return;
      }
      setIsOnboardDriverOpen(false);
      setDrvName('');
      setDrvPhone('');
      setDrvLicense('');
      setDrvVehicleId('');
    } finally {
      setDrvSubmitting(false);
    }
  };

  const handleUpdateStatus = async (update: () => Promise<{ ok: boolean; message: string }>, onSaved: () => void) => {
    setStatusSubmitting(true);
    setModalError('');
    try {
      const result = await update();
      if (result.ok) onSaved();
      else setModalError(result.message);
    } finally {
      setStatusSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Operations', href: '/fulfillment' },
          { label: 'Fleet & Driver Directory' },
        ]}
      />

      <PageHeader
        kicker="FLEET & LOGISTICS DIRECTORY"
        title="Fleet & Driver Directory"
        description="Manage logistics assets, refrigerated distribution vans, ambient delivery trucks, and licensed drivers for customer route fulfillment."
        actions={
          <div className="flex items-center gap-3">
            {can('fleet.manage') && (
              <>
                <button
                  type="button"
                  onClick={() => setIsOnboardDriverOpen(true)}
                  className="ui-button ui-button-secondary"
                >
                  <Users className="h-4 w-4" />
                  Onboard Driver
                </button>
                <button
                  type="button"
                  onClick={() => setIsRegisterVehicleOpen(true)}
                  className="ui-button ui-button-primary"
                >
                  <Plus className="h-4 w-4" />
                  Register Vehicle
                </button>
              </>
            )}
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Total Fleet</span>
            <Truck className="h-4 w-4 text-[var(--status-success-fg)]" />
          </div>
          <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">{totalVehicles}</p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">{availableVehicles} Available for dispatch</p>
        </div>

        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">On Delivery Runs</span>
            <Clock className="h-4 w-4 text-[var(--status-warning-fg)]" />
          </div>
          <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">{onRouteVehicles}</p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">{onDeliveryDrivers} drivers active in transit</p>
        </div>

        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Service & Workshop</span>
            <Wrench className="h-4 w-4 text-orange-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">{maintenanceVehicles}</p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">Scheduled maintenance / inspection</p>
        </div>

        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Driver Roster</span>
            <UserCheck className="h-4 w-4 text-[var(--status-info-fg)]" />
          </div>
          <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">{totalDrivers}</p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">{availableDrivers} available for immediate assignment</p>
        </div>
      </div>

      {/* Tabs and Controls */}
      <div className="flex flex-col gap-4 border-b border-[var(--border-subtle)] pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab('vehicles');
              setStatusFilter('All');
            }}
            aria-pressed={activeTab === 'vehicles'}
            className="ui-tab"
          >
            Vehicles ({vehicles.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('drivers');
              setStatusFilter('All');
            }}
            aria-pressed={activeTab === 'drivers'}
            className="ui-tab"
          >
            Drivers ({drivers.length})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
            <input
              type="text"
              aria-label={activeTab === 'vehicles' ? 'Search vehicles' : 'Search drivers'}
              placeholder={activeTab === 'vehicles' ? 'Search plate, model, driver...' : 'Search driver name, phone, license...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ui-field w-full pl-9 pr-3"
            />
          </div>

          <select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="ui-field"
          >
            <option value="All">All Statuses</option>
            {activeTab === 'vehicles' ? (
              <>
                <option value="Available">Available</option>
                <option value="On Route">On Route</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Out of Service">Out of Service</option>
              </>
            ) : (
              <>
                <option value="Available">Available</option>
                <option value="On Delivery">On Delivery</option>
                <option value="Off Duty">Off Duty</option>
                <option value="Leave">Leave</option>
              </>
            )}
          </select>
        </div>
      </div>

      {/* Vehicles Table */}
      {activeTab === 'vehicles' && (
        <div className="overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-xs">
          <table className="ui-table min-w-full">
            <thead className="bg-[var(--bg-canvas)]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Plate & Model</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Type & Fuel</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Payload Capacity</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Assigned Driver</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {filteredVehicles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8">
                    <EmptyState
                      title="No vehicles found"
                      description="No fleet vehicles match the active query."
                    />
                  </td>
                </tr>
              ) : (
                filteredVehicles.map((v) => (
                  <tr key={v.id} className="hover:bg-[var(--bg-canvas)]">
                    <td className="px-4 py-3 text-sm">
                      <div className="font-semibold text-[var(--text-primary)]">{v.registration}</div>
                      <div className="text-xs text-[var(--text-secondary)]">{v.makeModel}</div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="text-[var(--text-primary)]">{v.type}</div>
                      <div className="text-xs text-[var(--text-secondary)]">{v.fuelType}</div>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-[var(--text-primary)]">
                      {v.capacityKg.toLocaleString()} kg
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {v.assignedDriverName ? (
                        <span className="inline-flex items-center gap-1.5 text-[var(--text-primary)]">
                          <UserCheck className="h-3.5 w-3.5 text-[var(--status-success-fg)]" />
                          {v.assignedDriverName}
                        </span>
                      ) : (
                        <span className="text-xs italic text-[var(--text-secondary)]">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <StatusBadge
                        status={v.status}
                        tone={
                          v.status === 'Available'
                            ? 'success'
                            : v.status === 'On Route'
                            ? 'info'
                            : v.status === 'Maintenance'
                            ? 'warning'
                            : 'error'
                        }
                      />
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      {can('fleet.manage') && (
                        <button
                          type="button"
                          onClick={() => setEditingVehicle(v)}
                          className="ui-button ui-button-secondary ui-button-compact"
                        >
                          Change Status
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Drivers Table */}
      {activeTab === 'drivers' && (
        <div className="overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-xs">
          <table className="ui-table min-w-full">
            <thead className="bg-[var(--bg-canvas)]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Driver Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">License Classes</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Assigned Vehicle</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Completed Runs</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {filteredDrivers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8">
                    <EmptyState
                      title="No drivers found"
                      description="No registered drivers match the active query."
                    />
                  </td>
                </tr>
              ) : (
                filteredDrivers.map((d) => (
                  <tr key={d.id} className="hover:bg-[var(--bg-canvas)]">
                    <td className="px-4 py-3 text-sm">
                      <div className="font-semibold text-[var(--text-primary)]">{d.fullName}</div>
                      <div className="text-xs text-[var(--text-secondary)]">{d.licenseNumber}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">{d.phone}</td>
                    <td className="px-4 py-3 text-sm font-medium text-[var(--text-primary)]">
                      Class {d.licenseClasses}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {d.assignedVehicleReg ? (
                        <span className="inline-flex items-center gap-1.5 font-medium text-[var(--text-primary)]">
                          <Truck className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
                          {d.assignedVehicleReg}
                        </span>
                      ) : (
                        <span className="text-xs italic text-[var(--text-secondary)]">Pool / Standby</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--text-primary)]">
                      {d.deliveriesCompleted} deliveries
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <StatusBadge
                        status={d.status}
                        tone={
                          d.status === 'Available'
                            ? 'success'
                            : d.status === 'On Delivery'
                            ? 'info'
                            : 'warning'
                        }
                      />
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      {can('fleet.manage') && (
                        <button
                          type="button"
                          onClick={() => setEditingDriver(d)}
                          className="ui-button ui-button-secondary ui-button-compact"
                        >
                          Change Status
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={isRegisterVehicleOpen}
        onClose={() => {
          if (vehSubmitting) return;
          setModalError('');
          setIsRegisterVehicleOpen(false);
        }}
        title="Register fleet vehicle"
        size="lg"
        allowEscapeClose={!vehSubmitting}
        allowBackdropClose={!vehSubmitting}
      >
        <form onSubmit={handleRegisterVehicle} className="space-y-4 text-sm">
          <div>
            <label className="ui-label" htmlFor="fleet-registration">Registration number</label>
            <input id="fleet-registration" type="text" required placeholder="KBZ 412M" value={vehReg}
              onChange={(event) => setVehReg(event.target.value)} className={fleetField} />
          </div>
          <div>
            <label className="ui-label" htmlFor="fleet-make-model">Make and model</label>
            <input id="fleet-make-model" type="text" required placeholder="Toyota Hilux 4x4" value={vehMakeModel}
              onChange={(event) => setVehMakeModel(event.target.value)} className={fleetField} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="ui-label" htmlFor="fleet-vehicle-type">Vehicle type</label>
              <select id="fleet-vehicle-type" value={vehType}
                onChange={(event) => setVehType(event.target.value as VehicleRecord['type'])} className={fleetField}>
                <option value="Ambient Pickup">Ambient Pickup</option>
                <option value="Refrigerated Van">Refrigerated Van</option>
                <option value="3-Ton Truck">3-Ton Truck</option>
                <option value="Motorbike Box">Motorbike Box</option>
              </select>
            </div>
            <div>
              <label className="ui-label" htmlFor="fleet-capacity">Payload capacity (kg)</label>
              <input id="fleet-capacity" type="number" required min={50} max={15000} value={vehCapacity}
                onChange={(event) => setVehCapacity(event.target.value)} className={fleetField} />
            </div>
            <div>
              <label className="ui-label" htmlFor="fleet-fuel">Fuel type</label>
              <select id="fleet-fuel" value={vehFuel}
                onChange={(event) => setVehFuel(event.target.value as VehicleRecord['fuelType'])} className={fleetField}>
                <option value="Diesel">Diesel</option>
                <option value="Petrol">Petrol</option>
                <option value="Electric">Electric</option>
              </select>
            </div>
            <div>
              <label className="ui-label" htmlFor="fleet-primary-driver">Assigned driver (optional)</label>
              <select id="fleet-primary-driver" value={vehDriverId} onChange={(event) => setVehDriverId(event.target.value)} className={fleetField}>
                <option value="">No driver assigned</option>
                {drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.fullName} ({driver.status})</option>)}
              </select>
            </div>
          </div>
          {modalError && <p role="alert" className="text-[var(--status-danger-fg)]">{modalError}</p>}
          <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--border-subtle)] pt-4">
            <button type="button" className={fleetCancel} disabled={vehSubmitting} onClick={() => {
              setModalError('');
              setIsRegisterVehicleOpen(false);
            }}>Cancel</button>
            <button type="submit" className={fleetSave} disabled={vehSubmitting}>{vehSubmitting ? 'Registering…' : 'Register vehicle'}</button>
          </div>
        </form>
      </Modal>

      <Modal
        open={isOnboardDriverOpen}
        onClose={() => {
          if (drvSubmitting) return;
          setModalError('');
          setIsOnboardDriverOpen(false);
        }}
        title="Onboard delivery driver"
        size="lg"
        allowEscapeClose={!drvSubmitting}
        allowBackdropClose={!drvSubmitting}
      >
        <form onSubmit={handleOnboardDriver} className="space-y-4 text-sm">
          <div>
            <label className="ui-label" htmlFor="fleet-driver-name">Full legal name</label>
            <input id="fleet-driver-name" type="text" required autoComplete="name" value={drvName}
              onChange={(event) => setDrvName(event.target.value)} className={fleetField} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="ui-label" htmlFor="fleet-driver-phone">Phone number</label>
              <input id="fleet-driver-phone" type="tel" required autoComplete="tel" placeholder="+254 7XX XXX XXX" value={drvPhone}
                onChange={(event) => setDrvPhone(event.target.value)} className={fleetField} />
            </div>
            <div>
              <label className="ui-label" htmlFor="fleet-driver-license">Driver licence number</label>
              <input id="fleet-driver-license" type="text" required placeholder="DL-XXXXX" value={drvLicense}
                onChange={(event) => setDrvLicense(event.target.value)} className={fleetField} />
            </div>
            <div>
              <label className="ui-label" htmlFor="fleet-license-classes">Licence classes</label>
              <input id="fleet-license-classes" type="text" required placeholder="B, C, E" value={drvClasses}
                onChange={(event) => setDrvClasses(event.target.value)} className={fleetField} />
            </div>
            <div>
              <label className="ui-label" htmlFor="fleet-primary-vehicle">Assigned vehicle (optional)</label>
              <select id="fleet-primary-vehicle" value={drvVehicleId} onChange={(event) => setDrvVehicleId(event.target.value)} className={fleetField}>
                <option value="">No vehicle assigned</option>
                {vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.registration} ({vehicle.type})</option>)}
              </select>
            </div>
          </div>
          {modalError && <p role="alert" className="text-[var(--status-danger-fg)]">{modalError}</p>}
          <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--border-subtle)] pt-4">
            <button type="button" className={fleetCancel} disabled={drvSubmitting} onClick={() => {
              setModalError('');
              setIsOnboardDriverOpen(false);
            }}>Cancel</button>
            <button type="submit" className={fleetSave} disabled={drvSubmitting}>{drvSubmitting ? 'Saving…' : 'Onboard driver'}</button>
          </div>
        </form>
      </Modal>

      {editingVehicle && (
        <FleetStatusDialog
          title={`Update vehicle status · ${editingVehicle.registration}`}
          statuses={['Available', 'On Route', 'Maintenance', 'Out of Service']}
          selected={editingVehicle.status}
          pending={statusSubmitting}
          error={modalError}
          onClose={() => {
            setModalError('');
            setEditingVehicle(null);
          }}
          onSelect={(status) => handleUpdateStatus(() => updateVehicle(editingVehicle.id, { status }), () => setEditingVehicle(null))}
        />
      )}

      {editingDriver && (
        <FleetStatusDialog
          title={`Update driver status · ${editingDriver.fullName}`}
          statuses={['Available', 'On Delivery', 'Off Duty', 'Leave']}
          selected={editingDriver.status}
          pending={statusSubmitting}
          error={modalError}
          onClose={() => {
            setModalError('');
            setEditingDriver(null);
          }}
          onSelect={(status) => handleUpdateStatus(() => updateDriver(editingDriver.id, { status }), () => setEditingDriver(null))}
        />
      )}
    </div>
  );
}

function FleetStatusDialog<T extends string>({ title, statuses, selected, pending, error, onClose, onSelect }: {
  title: string;
  statuses: T[];
  selected: T;
  pending: boolean;
  error: string;
  onClose: () => void;
  onSelect: (status: T) => void;
}) {
  return (
    <Modal open title={title} size="sm" onClose={() => { if (!pending) onClose(); }}
      allowBackdropClose={!pending} allowEscapeClose={!pending}>
      <div className="space-y-2" aria-busy={pending}>
        {statuses.map((status) => (
          <button key={status} type="button" disabled={pending} aria-pressed={selected === status}
            onClick={() => onSelect(status)}
            className="ui-tab w-full justify-start text-left">
            {status}
          </button>
        ))}
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-[var(--status-danger-fg)]">{error}</p>}
    </Modal>
  );
}

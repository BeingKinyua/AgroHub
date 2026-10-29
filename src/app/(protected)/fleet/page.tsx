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
  X,
} from 'lucide-react';
import { useBos } from '@/lib/services/bos-context';
import { DriverRecord, VehicleRecord } from '@/types/domain/bos';
import {
  Breadcrumbs,
  EmptyState,
  PageHeader,
  StatusBadge,
} from '@/components/ui/primitives';

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
    if (!vehReg.trim() || !vehMakeModel.trim()) return;
    setVehSubmitting(true);
    const assignedDriver = drivers.find((d) => d.id === vehDriverId);
    await createVehicle({
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
    setVehSubmitting(false);
    setIsRegisterVehicleOpen(false);
    setVehReg('');
    setVehMakeModel('');
    setVehDriverId('');
  };

  const handleOnboardDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!drvName.trim() || !drvPhone.trim() || !drvLicense.trim()) return;
    setDrvSubmitting(true);
    const assignedVeh = vehicles.find((v) => v.id === drvVehicleId);
    await createDriver({
      fullName: drvName.trim(),
      phone: drvPhone.trim(),
      licenseNumber: drvLicense.trim().toUpperCase(),
      licenseClasses: drvClasses.trim(),
      status: 'Available',
      assignedVehicleId: drvVehicleId || undefined,
      assignedVehicleReg: assignedVeh?.registration,
    });
    setDrvSubmitting(false);
    setIsOnboardDriverOpen(false);
    setDrvName('');
    setDrvPhone('');
    setDrvLicense('');
    setDrvVehicleId('');
  };

  const handleUpdateVehicleStatus = async (veh: VehicleRecord, newStatus: VehicleRecord['status']) => {
    await updateVehicle(veh.id, { status: newStatus });
    setEditingVehicle(null);
  };

  const handleUpdateDriverStatus = async (drv: DriverRecord, newStatus: DriverRecord['status']) => {
    await updateDriver(drv.id, { status: newStatus });
    setEditingDriver(null);
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
                  className="inline-flex items-center gap-2 rounded-md border border-neutral-300 bg-white px-3.5 py-2 text-sm font-medium text-neutral-700 shadow-xs hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
                >
                  <Users className="h-4 w-4" />
                  Onboard Driver
                </button>
                <button
                  type="button"
                  onClick={() => setIsRegisterVehicleOpen(true)}
                  className="inline-flex items-center gap-2 rounded-md bg-[#1F6A37] px-3.5 py-2 text-sm font-medium text-white shadow-xs hover:bg-[#12512C]"
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
        <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">Total Fleet</span>
            <Truck className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-neutral-900 dark:text-white">{totalVehicles}</p>
          <p className="mt-1 text-xs text-neutral-500">{availableVehicles} Available for dispatch</p>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">On Delivery Runs</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-neutral-900 dark:text-white">{onRouteVehicles}</p>
          <p className="mt-1 text-xs text-neutral-500">{onDeliveryDrivers} drivers active in transit</p>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">Service & Workshop</span>
            <Wrench className="h-4 w-4 text-orange-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-neutral-900 dark:text-white">{maintenanceVehicles}</p>
          <p className="mt-1 text-xs text-neutral-500">Scheduled maintenance / inspection</p>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">Driver Roster</span>
            <UserCheck className="h-4 w-4 text-blue-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-neutral-900 dark:text-white">{totalDrivers}</p>
          <p className="mt-1 text-xs text-neutral-500">{availableDrivers} available for immediate assignment</p>
        </div>
      </div>

      {/* Tabs and Controls */}
      <div className="flex flex-col gap-4 border-b border-neutral-200 pb-4 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab('vehicles');
              setStatusFilter('All');
            }}
            className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === 'vehicles'
                ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
            }`}
          >
            Vehicles ({vehicles.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('drivers');
              setStatusFilter('All');
            }}
            className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === 'drivers'
                ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
            }`}
          >
            Drivers ({drivers.length})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder={activeTab === 'vehicles' ? 'Search plate, model, driver...' : 'Search driver name, phone, license...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-md border border-neutral-300 bg-white py-1.5 pl-9 pr-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-[#1F6A37] focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-900 focus:border-[#1F6A37] focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
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
        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
          <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-800">
            <thead className="bg-neutral-50 dark:bg-neutral-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">Plate & Model</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">Type & Fuel</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">Payload Capacity</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">Assigned Driver</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-neutral-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
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
                  <tr key={v.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30">
                    <td className="px-4 py-3 text-sm">
                      <div className="font-semibold text-neutral-900 dark:text-white">{v.registration}</div>
                      <div className="text-xs text-neutral-500">{v.makeModel}</div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="text-neutral-900 dark:text-neutral-200">{v.type}</div>
                      <div className="text-xs text-neutral-500">{v.fuelType}</div>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {v.capacityKg.toLocaleString()} kg
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {v.assignedDriverName ? (
                        <span className="inline-flex items-center gap-1.5 text-neutral-900 dark:text-neutral-200">
                          <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                          {v.assignedDriverName}
                        </span>
                      ) : (
                        <span className="text-xs italic text-neutral-400">Unassigned</span>
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
                          className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
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
        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
          <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-800">
            <thead className="bg-neutral-50 dark:bg-neutral-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">Driver Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">License Classes</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">Assigned Vehicle</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">Completed Runs</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-neutral-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
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
                  <tr key={d.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30">
                    <td className="px-4 py-3 text-sm">
                      <div className="font-semibold text-neutral-900 dark:text-white">{d.fullName}</div>
                      <div className="text-xs text-neutral-500">{d.licenseNumber}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-300">{d.phone}</td>
                    <td className="px-4 py-3 text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      Class {d.licenseClasses}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {d.assignedVehicleReg ? (
                        <span className="inline-flex items-center gap-1.5 font-medium text-neutral-900 dark:text-neutral-200">
                          <Truck className="h-3.5 w-3.5 text-neutral-500" />
                          {d.assignedVehicleReg}
                        </span>
                      ) : (
                        <span className="text-xs italic text-neutral-400">Pool / Standby</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-900 dark:text-neutral-200">
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
                          className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
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

      {/* Register Vehicle Modal */}
      {isRegisterVehicleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3 dark:border-neutral-800">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Register Fleet Vehicle</h3>
              <button
                type="button"
                onClick={() => setIsRegisterVehicleOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterVehicle} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Registration Number (e.g. KBZ 412M)
                </label>
                <input
                  type="text"
                  required
                  placeholder="KXX 123Y"
                  value={vehReg}
                  onChange={(e) => setVehReg(e.target.value)}
                  className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Make & Model
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Toyota Hilux 4x4 or Isuzu FRR"
                  value={vehMakeModel}
                  onChange={(e) => setVehMakeModel(e.target.value)}
                  className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Vehicle Type
                  </label>
                  <select
                    value={vehType}
                    onChange={(e) => setVehType(e.target.value as VehicleRecord['type'])}
                    className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  >
                    <option value="Ambient Pickup">Ambient Pickup</option>
                    <option value="Refrigerated Van">Refrigerated Van</option>
                    <option value="3-Ton Truck">3-Ton Truck</option>
                    <option value="Motorbike Box">Motorbike Box</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Payload Capacity (KG)
                  </label>
                  <input
                    type="number"
                    required
                    min={50}
                    max={15000}
                    value={vehCapacity}
                    onChange={(e) => setVehCapacity(e.target.value)}
                    className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Fuel Type
                  </label>
                  <select
                    value={vehFuel}
                    onChange={(e) => setVehFuel(e.target.value as VehicleRecord['fuelType'])}
                    className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  >
                    <option value="Diesel">Diesel</option>
                    <option value="Petrol">Petrol</option>
                    <option value="Electric">Electric</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Assign Driver (Optional)
                  </label>
                  <select
                    value={vehDriverId}
                    onChange={(e) => setVehDriverId(e.target.value)}
                    className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  >
                    <option value="">-- No driver assigned --</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.fullName} ({d.status})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsRegisterVehicleOpen(false)}
                  className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 dark:border-neutral-700 dark:text-neutral-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={vehSubmitting}
                  className="rounded-md bg-[#1F6A37] px-4 py-2 text-sm font-medium text-white hover:bg-[#12512C] disabled:opacity-50"
                >
                  {vehSubmitting ? 'Registering...' : 'Confirm Registration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Onboard Driver Modal */}
      {isOnboardDriverOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3 dark:border-neutral-800">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Onboard Delivery Driver</h3>
              <button
                type="button"
                onClick={() => setIsOnboardDriverOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleOnboardDriver} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Full Legal Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Samuel Omondi"
                  value={drvName}
                  onChange={(e) => setDrvName(e.target.value)}
                  className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+254 7XX XXX XXX"
                    value={drvPhone}
                    onChange={(e) => setDrvPhone(e.target.value)}
                    className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Driver License Number
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="DL-XXXXX"
                    value={drvLicense}
                    onChange={(e) => setDrvLicense(e.target.value)}
                    className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    License Classes
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="B, C, E"
                    value={drvClasses}
                    onChange={(e) => setDrvClasses(e.target.value)}
                    className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Assign Primary Vehicle
                  </label>
                  <select
                    value={drvVehicleId}
                    onChange={(e) => setDrvVehicleId(e.target.value)}
                    className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  >
                    <option value="">-- Standby / Pool --</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.registration} ({v.type})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsOnboardDriverOpen(false)}
                  className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 dark:border-neutral-700 dark:text-neutral-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={drvSubmitting}
                  className="rounded-md bg-[#1F6A37] px-4 py-2 text-sm font-medium text-white hover:bg-[#12512C] disabled:opacity-50"
                >
                  {drvSubmitting ? 'Onboarding...' : 'Confirm Driver Onboarding'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Vehicle Status Modal */}
      {editingVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-800 dark:bg-neutral-900">
            <h3 className="text-base font-semibold text-neutral-900 dark:text-white">
              Update Status: {editingVehicle.registration}
            </h3>
            <p className="mt-1 text-xs text-neutral-500">
              Select current operational readiness status.
            </p>

            <div className="mt-4 space-y-2">
              {(['Available', 'On Route', 'Maintenance', 'Out of Service'] as VehicleRecord['status'][]).map(
                (status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => handleUpdateVehicleStatus(editingVehicle, status)}
                    className={`w-full rounded-md border p-2.5 text-left text-sm font-medium transition-colors ${
                      editingVehicle.status === status
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : 'border-neutral-200 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200'
                    }`}
                  >
                    {status}
                  </button>
                )
              )}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setEditingVehicle(null)}
                className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 dark:border-neutral-700 dark:text-neutral-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Driver Status Modal */}
      {editingDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-800 dark:bg-neutral-900">
            <h3 className="text-base font-semibold text-neutral-900 dark:text-white">
              Update Status: {editingDriver.fullName}
            </h3>
            <p className="mt-1 text-xs text-neutral-500">
              Select driver operational duty status.
            </p>

            <div className="mt-4 space-y-2">
              {(['Available', 'On Delivery', 'Off Duty', 'Leave'] as DriverRecord['status'][]).map(
                (status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => handleUpdateDriverStatus(editingDriver, status)}
                    className={`w-full rounded-md border p-2.5 text-left text-sm font-medium transition-colors ${
                      editingDriver.status === status
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : 'border-neutral-200 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200'
                    }`}
                  >
                    {status}
                  </button>
                )
              )}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setEditingDriver(null)}
                className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 dark:border-neutral-700 dark:text-neutral-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export type AccountStatus = 'Invited' | 'Active' | 'Suspended' | 'Disabled';

export type InternalRoleId =
  | 'executive'
  | 'operations_manager'
  | 'sales_rep'
  | 'procurement_officer'
  | 'storekeeper'
  | 'accounts_clerk'
  | 'finance_manager'
  | 'delivery_driver'
  | 'administrator';

export type PermissionKey =
  | 'dashboard.view'
  | 'orders.view'
  | 'orders.create'
  | 'orders.edit'
  | 'orders.approve'
  | 'orders.export'
  | 'fulfillment.view'
  | 'fulfillment.manage'
  | 'customers.view'
  | 'customers.create'
  | 'customers.edit'
  | 'products.view'
  | 'products.create'
  | 'products.edit'
  | 'inventory.view'
  | 'inventory.receive'
  | 'inventory.adjust'
  | 'inventory.transfer'
  | 'procurement.view'
  | 'procurement.create'
  | 'procurement.approve'
  | 'suppliers.view'
  | 'suppliers.create'
  | 'suppliers.edit'
  | 'deliveries.view'
  | 'deliveries.assign'
  | 'deliveries.dispatch'
  | 'finance.view'
  | 'finance.record_payment'
  | 'finance.allocate_payment'
  | 'finance.reconcile'
  | 'crm.view'
  | 'crm.manage'
  | 'reports.view'
  | 'reports.export'
  | 'approvals.view'
  | 'approvals.approve'
  | 'documents.view'
  | 'documents.manage'
  | 'administration.users.view'
  | 'administration.users.create'
  | 'administration.users.edit'
  | 'administration.roles.view'
  | 'administration.roles.manage'
  | 'audit.view';

export interface RoleDefinition {
  id: InternalRoleId | string;
  name: string;
  description: string;
  permissions: PermissionKey[];
  defaultFocus: string;
  lastModified?: string;
}

export interface InternalUser {
  id: string;
  email: string;
  fullName: string;
  nickname: string;
  avatarUrl?: string;
  roleId: InternalRoleId | string;
  roleName: string;
  status: AccountStatus;
  department: string;
  branch: string;
  phone: string;
  lastActiveAt: string;
  invitedBy: string;
}

export type UnitOfMeasure =
  | 'kilograms'
  | 'pieces'
  | 'bunches'
  | 'dozens'
  | 'packs'
  | 'bags';

export interface PriceHistoryEntry {
  date: string;
  tier: 'Retail' | 'Online' | 'Wholesale' | 'Institutional' | 'Supplier Cost';
  priceKes: number;
  changedBy: string;
}

export interface ProductRecord {
  id: string;
  sku: string;
  name: string;
  category:
    | 'Fresh Vegetables'
    | 'Fruits & Orchard'
    | 'Dry Grains & Cereals'
    | 'Root & Tubers'
    | 'Dairy & Cold Chain'
    | 'Herbs & Greens';
  unit: UnitOfMeasure;
  description: string;
  imageUrl: string;
  status: 'Active' | 'Seasonal Hold' | 'Discontinued';
  batchTracked: boolean;
  expiryTracked: boolean;
  availableQty: number;
  reservedQty: number;
  incomingQty: number;
  reorderPoint: number;
  pricing: {
    retailKes: number;
    onlineKes: number;
    wholesaleKes: number;
    institutionalKes: number;
    supplierCostKes: number;
  };
  priceHistory: PriceHistoryEntry[];
}

export interface WarehouseRecord {
  id: string;
  code: string;
  name: string;
  location: string;
  zoneType: 'Cold Chain (2°C - 6°C)' | 'Ambient Dry Bulk' | 'Cross-Dock Staging';
  utilizationPct: number;
  binsCount: number;
  manager: string;
}

export interface StockBatchRecord {
  id: string;
  batchNumber: string;
  productId: string;
  productName: string;
  sku: string;
  unit: UnitOfMeasure;
  warehouseId: string;
  warehouseName: string;
  binCode: string;
  supplierName: string;
  receivedDate: string;
  expiryDate: string;
  daysToExpiry: number;
  availableQty: number;
  reservedQty: number;
  unitCostKes: number;
  fefoPriority: 1 | 2 | 3;
  status: 'FEFO Priority' | 'Nominal' | 'Expiring Soon' | 'Quarantined';
}

export interface StockMovementRecord {
  id: string;
  timestamp: string;
  type: 'Receipt (GRN)' | 'Order Pick' | 'Transfer' | 'Adjustment' | 'Wastage';
  productName: string;
  batchNumber: string;
  quantityDelta: number;
  unit: UnitOfMeasure;
  fromLocation: string;
  toLocation: string;
  actorName: string;
  reason: string;
}

export type OrderLifecycleStatus =
  | 'Draft'
  | 'Pending Payment'
  | 'Confirmed'
  | 'Picking'
  | 'Packed'
  | 'Dispatched'
  | 'Delivered'
  | 'Closed'
  | 'On Hold'
  | 'Partially Fulfilled'
  | 'Cancelled';

export interface OrderLineItem {
  productId: string;
  productName: string;
  sku: string;
  unit: UnitOfMeasure;
  quantity: number;
  allocatedBatch: string;
  unitPriceKes: number;
  pricingTier: 'Institutional' | 'Contract' | 'Wholesale' | 'Retail';
  lineTotalKes: number;
}

export interface OrderRecord {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerSegment: 'School' | 'Hospital' | 'Hotel' | 'Restaurant' | 'Retail';
  channel: 'Institutional Contract' | 'Recurring Weekly' | 'Tender Supply' | 'Walk-In / Manual';
  status: OrderLifecycleStatus;
  paymentStatus: 'Paid' | 'Invoiced (Net 30)' | 'Partially Paid' | 'Overdue' | 'Pending Payment';
  orderDate: string;
  deliveryDate: string;
  warehouseName: string;
  assignedActor: string;
  nextStepLabel: string;
  totalKes: number;
  itemsCount: number;
  items: OrderLineItem[];
  notes?: string;
}

export interface CustomerInstitutionRecord {
  id: string;
  name: string;
  code: string;
  segment: 'School' | 'Hospital' | 'Hotel' | 'Restaurant' | 'NGO / Corporate' | 'Retail Account';
  isInstitutional: boolean;
  county: string;
  deliveryZone: string;
  procurementContact: string;
  contactRole: string;
  phone: string;
  email: string;
  contractRef: string;
  tenderCycle: string;
  orderCadence: 'Daily' | 'Twice Weekly' | 'Weekly' | 'Monthly' | 'Ad-hoc';
  paymentTerms: 'Net 15' | 'Net 30' | 'Net 45' | 'Prepaid / M-Pesa';
  creditLimitKes: number;
  outstandingBalanceKes: number;
  overdueBalanceKes: number;
  priceTier: 'Institutional Contract' | 'Custom Tender' | 'Wholesale' | 'Retail';
  status: 'Active' | 'Credit Watch' | 'Tender Renewal';
}

export interface SupplierRecord {
  id: string;
  code: string;
  name: string;
  category: string;
  region: string;
  contactPerson: string;
  phone: string;
  email: string;
  leadTimeDays: number;
  paymentTerms: string;
  payableBalanceKes: number;
  qualityScorePct: number;
  recentPriceTrend: 'Stable' | 'Increased +6%' | 'Decreased -4%';
  suppliedProducts: {
    productId: string;
    productName: string;
    unit: UnitOfMeasure;
    currentCostKes: number;
    previousCostKes: number;
    lastUpdated: string;
  }[];
  status: 'Active' | 'Under Review';
}

export interface ProcurementOrderRecord {
  id: string;
  poNumber: string;
  prNumber: string;
  supplierId: string;
  supplierName: string;
  warehouseName: string;
  stage:
    | 'Purchase Request'
    | 'Pending Approval'
    | 'PO Issued'
    | 'Receiving (GRN)'
    | 'Quality Check'
    | 'Stock Posted';
  expectedDate: string;
  totalKes: number;
  itemsSummary: string;
  qualityCheckPassPct?: number;
  requestedBy: string;
}

export interface DeliveryRunRecord {
  id: string;
  runNumber: string;
  routeZone: string;
  vehicleReg: string;
  driverName: string;
  driverPhone: string;
  departureTime: string;
  status:
    | 'Planned'
    | 'Loaded'
    | 'Dispatched'
    | 'Delivered'
    | 'Partially Delivered'
    | 'Rescheduled';
  ordersIncluded: string[];
  institutionsServed: string[];
  totalWeightKg: number;
  podCaptured: boolean;
  recipientSignOff?: string;
}

export interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  issueDate: string;
  dueDate: string;
  amountKes: number;
  paidAmountKes: number;
  balanceKes: number;
  status: 'Paid' | 'Partially Paid' | 'Overdue' | 'Issued';
  agingBucket: 'Current (0-15d)' | '16-30 Days' | '31-60 Days' | '60+ Days Overdue';
}

export interface PaymentRecord {
  id: string;
  referenceCode: string;
  direction: 'Inbound (Customer AR)' | 'Outbound (Supplier AP)';
  counterpartyName: string;
  method: 'M-Pesa Paybill' | 'Bank EFT / RTGS' | 'Corporate Cheque';
  date: string;
  amountKes: number;
  allocatedToDoc: string;
  reconciled: boolean;
  recordedBy: string;
}

export interface CrmTicketRecord {
  id: string;
  ticketNumber: string;
  customerName: string;
  type: 'Contract Renewal' | 'Quality Claim' | 'Delivery Window Change' | 'Tender Pricing Inquiry';
  priority: 'High' | 'Medium' | 'Normal';
  status: 'Open' | 'In Progress' | 'Awaiting Client' | 'Resolved';
  assignedTo: string;
  dueDate: string;
  summary: string;
}

export interface ApprovalRequestRecord {
  id: string;
  reference: string;
  category:
    | 'Purchase Order'
    | 'Institutional Price Override'
    | 'Inventory Wastage Write-Off'
    | 'Credit Limit Extension'
    | 'Supplier Payment Batch';
  entityTitle: string;
  requesterName: string;
  requesterRole: string;
  valueKes: number;
  reason: string;
  requestedAt: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  decisionBy?: string;
  decisionComment?: string;
  decisionAt?: string;
}

export interface DocumentRecord {
  id: string;
  docNumber: string;
  title: string;
  category:
    | 'Invoice'
    | 'Delivery Note'
    | 'Purchase Order'
    | 'Goods Received Note (GRN)'
    | 'KEBS / Quality Certificate'
    | 'Proof of Delivery (POD)'
    | 'Supplier Document';
  linkedEntity: string;
  uploadedBy: string;
  uploadedAt: string;
  fileSize: string;
  storageBucket: string;
  verified: boolean;
}

export interface AuditLogRecord {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: string;
  actorEmail: string;
  module: string;
  entity: string;
  action: string;
  beforeValue: string;
  afterValue: string;
}

export interface NotificationItem {
  id: string;
  severity: 'Action Required' | 'Warning' | 'Success' | 'Information';
  title: string;
  description: string;
  timestamp: string;
  href: string;
  permissionRequired: PermissionKey;
  read: boolean;
}

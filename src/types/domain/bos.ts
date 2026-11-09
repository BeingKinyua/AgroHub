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
  | 'suppliers.approve'
  | 'suppliers.suspend'
  | 'deliveries.view'
  | 'deliveries.assign'
  | 'deliveries.dispatch'
  | 'fleet.view'
  | 'fleet.manage'
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

export type ProductCategory =
  | 'Fresh Vegetables'
  | 'Fruits & Orchard'
  | 'Dry Grains & Cereals'
  | 'Root & Tubers'
  | 'Dairy & Cold Chain'
  | 'Herbs & Greens'
  | 'Vegetables'
  | 'Fruits'
  | 'Cereals & Grains'
  | 'Legumes & Pulses'
  | 'Dairy & Eggs'
  | 'Poultry & Meat'
  | 'Tubers & Roots'
  | 'Herbs & Greens'
  | 'Fresh Vegetables & Tubers'
  | 'Dry Grains & Cereals'
  | 'Fresh Herbs & Aromatics'
  | 'Fruits & Berries'
  | 'Animal & Dairy Products'
  | string;

export interface ProductRecord {
  id: string;
  sku: string;
  name: string;
  category: ProductCategory;
  unit: UnitOfMeasure;
  description: string;
  imageUrl: string;
  status: 'Active' | 'Seasonal Hold' | 'Discontinued' | 'Archived';
  archivedAt?: string;
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

export type PODStatus =
  | 'Not Submitted'
  | 'Pending Verification'
  | 'Verified'
  | 'Rejected'
  | 'Submitted';

export type DiscrepancyClassification =
  | 'Fully Received'
  | 'Short Received'
  | 'Over Received'
  | 'Partially Accepted'
  | 'Damaged / Rejected'
  | 'Not Received';

export type DiscrepancyReason =
  | 'Short supplied'
  | 'Damaged goods'
  | 'Poor quality'
  | 'Wrong product'
  | 'Incorrect quantity'
  | 'Customer rejection'
  | 'Missing package'
  | 'Other';

export type InvoiceGenerationStatus =
  | 'Not Ready'
  | 'Draft Ready'
  | 'Draft Created'
  | 'Issued'
  | 'Paid';

export interface PODDeliveredItem {
  productId: string;
  productName: string;
  sku: string;
  unit: UnitOfMeasure | string;
  orderedQty?: number;
  dispatchedQty?: number;
  previousAcceptedQty?: number;
  receivedQty?: number;
  acceptedQty?: number;
  rejectedQty: number;
  outstandingQty?: number;
  currentDeliveryShortage?: number;
  classification?: DiscrepancyClassification;
  rejectionReason?: string;
  discrepancyReason?: DiscrepancyReason | string;
  discrepancyExplanation?: string;
  unitPriceKes: number;
  requestedQty?: number;
  deliveredQty?: number;
  orderedQuantity?: number;
  deliveredQuantity?: number;
  rejectedQuantity?: number;
}

export interface PODEvidenceRecord {
  id: string;
  orderId: string;
  orderNumber: string;
  deliveryRunId?: string;
  customerName: string;
  recipientName: string;
  recipientRole?: string;
  recipientPhone?: string;
  receivingDepartment?: string;
  deliveryDate: string;
  submittedAt: string;
  submittedBy: string;
  status: PODStatus;
  reconciliationStatus?:
    | 'Fully Reconciled'
    | 'Partially Reconciled'
    | 'Disputed'
    | 'Pending Resolution';
  deliveredItems: PODDeliveredItem[];
  evidenceFiles: {
    name: string;
    size: string;
    type: string;
    url: string;
    caption?: string;
  }[];
  deliveryNotes?: string;
  deliveryExceptions?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  verificationNotes?: string;
  rejectionReason?: string;
  invoiceCreated?: boolean;
  invoiceNumber?: string;
  hasDiscrepancies?: boolean;
  discrepancyNotes?: string;
}

export interface CreateOrderItemInput {
  productId: string;
  quantity: number;
  overridePriceKes?: number;
  allocatedBatch?: string;
  sourcingMode?:
    | 'Direct Procurement'
    | 'Existing Stock'
    | 'Mixed Sourcing'
    | 'direct_procurement'
    | 'existing_stock'
    | 'mixed';
  stockAllocatedQty?: number;
  directProcuredQty?: number;
  supplierId?: string;
  supplierName?: string;
  purchaseCostKes?: number;
}

export interface CreateOrderInput {
  customerId: string;
  channel: OrderRecord['channel'];
  deliveryDate: string;
  warehouseName: string;
  items: CreateOrderItemInput[];
  orderDate?: string;
  orderReference?: string;
  deliveryAddress?: string;
  notes?: string;
}

export interface OrderLineItem {
  productId: string;
  productName: string;
  sku: string;
  unit: UnitOfMeasure;
  quantity: number;
  allocatedBatch: string;
  unitPriceKes: number;
  pricingTier: 'Institutional' | 'Contract' | 'Wholesale' | 'Retail' | 'Online';
  lineTotalKes: number;
  sourcingMode?:
    | 'Direct Procurement'
    | 'Existing Stock'
    | 'Mixed Sourcing'
    | 'direct_procurement'
    | 'existing_stock'
    | 'mixed';
  stockAllocatedQty?: number;
  directProcuredQty?: number;
  supplierId?: string;
  supplierName?: string;
  purchaseCostKes?: number;
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
  orderReference?: string;
  deliveryAddress?: string;
  customerPhone?: string;
  deliveryRunId?: string;
  podStatus?: PODStatus;
  podEvidenceId?: string;
  invoiceStatus?: InvoiceGenerationStatus;
  invoiceNumber?: string;
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
  kraPin?: string;
}

export interface SupplierContract {
  id: string;
  contractRef: string;
  title: string;
  startDate: string;
  endDate: string;
  status: 'Active' | 'Expiring Soon' | 'Expired' | 'Pending Review';
  valueKes: number;
  paymentTerms: string;
  deliveryCadence: string;
  notes?: string;
  signedDate?: string;
}

export interface SupplierDocumentItem {
  id: string;
  docNumber: string;
  title: string;
  category:
    | 'KEBS Certificate'
    | 'County Trade License'
    | 'Tax Compliance (KRA PIN)'
    | 'Supply Agreement'
    | 'Phytosanitary Inspection'
    | 'Bank Details & Cheque Leaf';
  issueDate: string;
  expiryDate?: string;
  status: 'Verified' | 'Pending Verification' | 'Expired';
  fileSize?: string;
}

export interface SupplierEvaluationRecord {
  id: string;
  evaluationDate: string;
  evaluator: string;
  overallScorePct: number;
  qualityScorePct: number;
  timelinessScorePct: number;
  pricingCompliancePct: number;
  packagingGrade: 'Grade A' | 'Grade B' | 'Grade C';
  notes: string;
  recommendation: 'Preferred Cooperative' | 'Standard Approved' | 'Performance Watch' | 'Suspended';
  grade?: string;
  evaluatedBy?: string;
  qualityScore?: number;
  timelinessScore?: number;
  pricingScore?: number;
}

export interface SupplierProductItem {
  id?: string;
  productId: string;
  productName: string;
  unit: UnitOfMeasure;
  currentCostKes: number;
  priceKes?: number;
  previousCostKes?: number;
  lastUpdated?: string;
  lastPriceUpdate?: string;
  priceChangeReason?: string;
  leadTimeDays?: number;
  moq?: number;
  minOrderQty?: number;
  availability?: 'Available' | 'Seasonal' | 'Unavailable';
  preferredSupplier?: boolean;
  notes?: string;
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
  recentPriceTrend: 'Stable' | 'Increased +6%' | 'Decreased -4%' | 'Price Review Needed';
  suppliedProducts: SupplierProductItem[];
  status: 'Active' | 'Under Review' | 'Suspended';
  isArchived?: boolean;
  archivedAt?: string;
  suspendedReason?: string;
  contracts?: SupplierContract[];
  documents?: SupplierDocumentItem[];
  evaluations?: SupplierEvaluationRecord[];
  paymentDetails?: string;
}

export interface PurchaseOrderLineItem {
  productId: string;
  productName: string;
  sku: string;
  unit: UnitOfMeasure;
  quantity: number;
  unitCostKes: number;
  lineTotalKes: number;
  customerOrderRef?: string;
}

export interface ProcurementOrderRecord {
  id: string;
  poNumber: string;
  prNumber: string;
  supplierId: string;
  supplierName: string;
  warehouseName: string;
  purpose?: 'Direct Customer Fulfillment' | 'Bulk Stock Procurement';
  customerOrderId?: string;
  customerOrderNumber?: string;
  lines?: PurchaseOrderLineItem[];
  stage:
    | 'Purchase Request'
    | 'Pending Approval'
    | 'PO Issued'
    | 'Receiving (GRN)'
    | 'Quality Check'
    | 'Stock Posted'
    | 'Goods Collected'
    | 'Completed';
  status?: string;
  expectedDate: string;
  totalKes: number;
  itemsSummary: string;
  createdAt?: string;
  qualityCheckPassPct?: number;
  requestedBy: string;
  goodsCollected?: boolean;
  collectionDate?: string;
  collectionLocation?: string;
  actualPurchaseCostKes?: number;
  supplierPayableCreated?: boolean;
  supplierPayableId?: string;
}

export interface DeliveryRunStop {
  orderId: string;
  orderNumber: string;
  customerName: string;
  deliveryAddress: string;
  status: 'Pending' | 'Delivered' | 'Failed';
  deliveredAt?: string;
  notes?: string;
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
  runCode?: string;
  vehiclePlate?: string;
  orderNumbers?: string[];
  assignedVehicleId?: string;
  assignedDriverId?: string;
  transportCostKes?: number;
  fuelExpensesKes?: number;
  stops?: DeliveryRunStop[];
  vehicleId?: string;
}

export interface VehicleRecord {
  id: string;
  registration: string;
  makeModel: string;
  type: 'Refrigerated Van' | 'Ambient Pickup' | '3-Ton Truck' | 'Motorbike Box';
  capacityKg: number;
  fuelType: 'Diesel' | 'Petrol' | 'Electric';
  status: 'Available' | 'On Route' | 'Maintenance' | 'Out of Service';
  assignedDriverId?: string;
  assignedDriverName?: string;
  lastServiceDate?: string;
  insuranceExpiry?: string;
}

export interface DriverRecord {
  id: string;
  fullName: string;
  phone: string;
  licenseNumber: string;
  licenseClasses: string;
  status: 'Available' | 'On Delivery' | 'Off Duty' | 'Leave';
  assignedVehicleId?: string;
  assignedVehicleReg?: string;
  deliveriesCompleted: number;
  rating: number;
}

export interface SupplierPayableRecord {
  id: string;
  payableNumber?: string;
  supplierId: string;
  supplierName: string;
  purchaseOrderId?: string;
  poId?: string;
  poNumber: string;
  customerOrderNumber?: string;
  invoiceRef?: string;
  issueDate?: string;
  dueDate: string;
  totalAmountKes?: number;
  amountKes?: number;
  paidAmountKes: number;
  balanceKes: number;
  status: 'Pending' | 'Partially Paid' | 'Paid' | 'Overdue' | 'Unpaid' | 'Open';
  goodsCollectedDate?: string;
  lineItemsSummary?: string;
  createdAt?: string;
}

export interface SupplierPaymentRecord {
  id: string;
  paymentNumber?: string;
  supplierPayableId?: string;
  payableId?: string;
  payableNumber?: string;
  supplierId: string;
  supplierName: string;
  amountKes: number;
  paymentMethod:
    | 'M-Pesa Business'
    | 'M-Pesa Paybill'
    | 'Bank EFT'
    | 'EFT / Bank Transfer'
    | 'Cheque'
    | 'Cash';
  referenceNumber: string;
  paymentDate: string;
  recordedBy: string;
  notes?: string;
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
  lineItems?: OrderLineItem[];
  podRef?: string;
  subtotalKes?: number;
  paymentTerms?: string;
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

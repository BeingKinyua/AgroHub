# AgroHub — Hybrid Direct-Procurement & Stocked-Inventory Business Operating System

Architectural blueprint and operational specification for AgroHub, the Business Operating System (BOS) for Agro-Deliveries Kenya. This system supports two coexisting operating paradigms: **Operating Model A (Demand-Driven Direct Farm Procurement)** and **Operating Model B (Stocked Inventory & Warehouse FEFO Lots)**.

---

## 1. System Architecture & Dual Operating Paradigms

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                           AGROHUB HYBRID OPERATING ARCHITECTURE                             │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                             │
│  OPERATING MODEL A (Direct Procurement - Zero Warehouse Required)                           │
│  Customer Order ──▶ Supplier Sourcing ──▶ Purchase PO ──▶ Goods Collection ──▶ AP Liability │
│                                                                    │                        │
│                                                                    ▼                        │
│  Customer Invoice ◀── POD Verification ◀── Delivery Drop-off ◀── Direct Transit Dispatch    │
│                                                                                             │
│ ─────────────────────────────────────────────────────────────────────────────────────────── │
│                                                                                             │
│  OPERATING MODEL B (Stocked Inventory & FEFO Allocation)                                    │
│  Bulk Purchase PO ──▶ Goods Receipt ──▶ Quality Inspection ──▶ Batch Lots & Cold Storage    │
│                                                                    │                        │
│                                                                    ▼                        │
│  Customer Invoice ◀── POD Verification ◀── Delivery Run ◀── Warehouse Picking & Dispatch   │
│                                                                                             │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Key Domain Capabilities Delivered

### 2.1 Category-Based SKU Generation
- **Format**: `AD-{CATEGORY_CODE}-{SEQUENCE}` (e.g. `AD-VEG-001`, `AD-FRU-002`, `AD-CER-003`).
- **Sequencing**: Category-specific monotonic sequence tracking preserved across active, archived, and deleted products.
- **Client Preview**: Real-time read-only proposal generated dynamically on category selection.

### 2.2 Product Lifecycle & Sourcing Management
- **Lifecycle States**: `Active`, `Seasonal Hold`, `Discontinued`, and `Archived`.
- **Safe Deletion**: Deletion is blocked if the product is referenced in active/historical orders, purchase requisitions, or inventory batches.
- **Image Handling**: Drag-and-drop replacement, instant preview, removal, and placeholder reset.
- **Connected Suppliers**: Product details surfaces all quoting suppliers with farmgate prices, lead times, and MOQ.

### 2.3 Supplier Sourcing & Accounts Payable (AP) Ledger
- **Supplier Directory**: Region, category, contact person, lead time, contracts, KEBS certifications, and audit evaluations.
- **Multi-Product Sourcing**: Bidirectional associations between suppliers and catalog products with quoted supplier costs and lead times.
- **Integrated AP Ledger**: Purchase-driven supplier liabilities with due dates, payment history, and payment recording modal (M-Pesa Business, M-Pesa Paybill, Bank EFT, Cheque, Cash).

### 2.4 Hybrid Order Composer & Line-Item Sourcing
- **Multi-Item Order Composer**: Dynamic line item editor with channel-specific pricing tiers.
- **Sourcing Strategy**:
  - `Direct Procurement`: Direct farm collection with supplier quotation selector and purchase cost calculation.
  - `Existing Stock`: Allocation against warehouse FEFO batch lots.
  - `Mixed Sourcing`: Split allocation (e.g., 40 kg stock + 60 kg direct farm procurement).

### 2.5 Structured Procurement & Purchase Confirmation
- **Purpose**: "Direct Order Fulfillment" vs "Bulk Stock Buffer".
- **Goods Collection Action**: "Confirm Purchase & Goods Collection" records actual purchase cost, generates supplier payable liability, and advances customer order items to packed/ready for dispatch.

### 2.6 Inventory Dual-Mode
- **Direct Transit Staging**: In-flight produce moving directly from farm gate to customer destination without requiring fictional warehouse bins.
- **FEFO Batch Lots**: Multi-bin warehouse lots tracking expiry dates, harvest dates, and storage conditions.

### 2.7 Fleet & Driver Management (`/fleet`)
- **Vehicle Directory**: Registration numbers, capacity (kg/crates), cold-chain capabilities, and inspection/insurance tracking.
- **Driver Directory**: Licensing classes, medical checks, contact details, and duty assignments.
- **Logistics Integration**: Delivery run creation directly references registered vehicles and drivers with transport cost tracking.

---

## 3. Navigation Architecture

- **Overview**: Dashboard Command Center, Work Queues
- **Commercial**: Orders (`/orders`), Customers (`/customers`), Products (`/products`)
- **Operations**: Fulfillment (`/fulfillment`), Procurement (`/procurement`), Inventory (`/inventory`), Suppliers (`/suppliers`), Deliveries (`/deliveries`), Fleet & Drivers (`/fleet`)
- **Finance**: Customer Invoices (`/invoices`), Supplier Payables (`/suppliers?tab=payables`), Payments (`/payments`), Financial Reports
- **Management & Governance**: People & Payroll, Reports & Analytics, Approvals, Documents, Administration (`/administration`)

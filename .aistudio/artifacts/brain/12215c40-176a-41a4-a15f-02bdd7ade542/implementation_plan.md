# AgroHub — UI Restoration, Design System Refinement & Command Center Optimization

Architectural blueprint and design system refinement specification for the AgroHub Business Operating System (BOS) for Agro-Deliveries Kenya. This plan establishes visual discipline, restores the semantic radius hierarchy, creates a minimal 3-element utility topbar, moves contextual actions to page workbenches, and transforms the dashboard into a calm, structured executive command center.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following key decisions have been aligned based on user guidance and requirements:

- **Persona Switcher Removed**: The prototype/demo role switcher will be completely removed from the topbar, profile menu, and ordinary user interface. Legitimate RBAC permission checks and role governance in Administration remain 100% active.
- **Balanced Executive Density**: The Command Center dashboard will adopt a balanced executive density with clear spatial separation, subtle hairline dividers, and high-readability typography instead of compressed widgets or oversized pill containers.
- **Default Theme Posture**: New visitors and unconfigured clients default to `'system'`, seamlessly syncing with `prefers-color-scheme` without initial theme flashing. Previously saved light/dark preferences remain respected.
- **Breadcrumb Placement (Option A)**: The topbar remains strictly a utility bar (Search, Notifications, Profile). Breadcrumbs are located cleanly in the main canvas above the PageHeader across all modules.

---

## 1. Overview & Core Concept

AgroHub is the mission-critical Business Operating System governing institutional produce supply, FEFO cold-chain inventory, multi-depot fulfillment, and cash reconciliation for Agro-Deliveries Kenya. 

### Target Audience & Operational Personas
The system serves 9 distinct operational roles operating across Nairobi Central, Embakasi, and Westlands hubs:
- **Managing Director & Executives**: Strategic cash margin, gross revenue, institutional pipeline, and systemic bottlenecks.
- **Operations & Warehouse Managers**: Batch dispatch, packing lines, driver assignments, cold storage thresholds.
- **Procurement & Sourcing Officers**: Smallholder cooperative orders, purchase requisitions, supplier pricing variance.
- **Finance Controllers & Clerks**: Invoicing status, M-Pesa/EFT reconciliations, credit terms, and overdue collections.
- **Quality Assurance & Compliance**: KEBS standards, batch expiry monitoring, quarantine workflows.

### Core Value Delivery
Transitioning from a noisy, pill-heavy dashboard to a composed, authoritative command center ensures operators make split-second logistics decisions without cognitive fatigue.

---

## 2. User Experience & Visual Design

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ AGROHUB DESKTOP WORKSPACE LAYOUT                                                       │
├──────────────┬─────────────────────────────────────────────────────────────────────────┤
│ [BRAND LOGO] │ [ Search orders, FEFO batches, institutions, SKUs... ⌘K ]     🔔   👤   │ <- Minimalist Topbar
│ AGRO-DELIV.  ├─────────────────────────────────────────────────────────────────────────┤
│              │ AgroHub BOS / Command Center                                            │ <- Canvas Breadcrumb
│ Operations   │                                                                         │
│ ├ Dashboard  │ Command Center                                            [New Order]   │ <- PageHeader + Actions
│ ├ Orders     │ Real-time operational decision system across Kenya depots               │
│ ├ Inventory  ├─────────────────────────────────────────────────────────────────────────┤
│ ├ Deliveries │ OPERATIONAL PULSE (High-priority exceptions requiring immediate action) │
│              ├─────────────────────────────────────────────────────────────────────────┤
│ Commercial   │ 4 ACTIONABLE DECISION KPIS (Orders, Cash, FEFO Risk, Fleet Efficiency)  │
│ ├ Customers  ├─────────────────────────────────────────────────────────────────────────┤
│ ├ Suppliers  │ MY WORK & OPERATIONAL QUEUES (Approvals, Route Dispatch, Picking)       │
│ ├ Finance    ├─────────────────────────────────────────────────────────────────────────┤
│              │ PERFORMANCE & TRENDS (Margin sustainability, category volume mix)       │
│ Governance   ├─────────────────────────────────────────────────────────────────────────┤
│ └ Admin      │ RECENT AUDITED ACTIVITY PIPELINE                                        │
└──────────────┴─────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Design System Discipline & Radius Hierarchy
Eliminate excessive `rounded-full` containers on cards, dialogs, matrix items, and multiline buttons. Enforce the mathematical radius hierarchy:

| Surface Type | Border Radius Token | Concrete Application |
|---|---|---|
| Large Cards & Panels | `--radius-card` (18px) | Workbench containers, chart panels, metric cards, role selectors |
| Modals & Dialogs | `--radius-modal` (20px) | Search command palette, order creation modal, confirmation sheets |
| Form Controls & Inputs | `--radius-control` (10px) | Text inputs, dropdown selects, textareas, search trigger bar |
| Buttons & Interactive Rows | `10px – 12px` | Standard buttons (`px-4 py-2`), WorkQueue rows, action triggers |
| Matrix & Permission Cards | `12px` | Administration role matrix items, module capability boxes |
| Status Badges & Chips | `Pill` / Compact `6px` | State badges (`Delivered`, `Pending`), active filter indicators |
| User Avatars | `Pill` (Circular) | User initials and photography avatars |

### 2.2 Minimalist Utility Topbar
The header is streamlined into a single-row, 3-element utility bar:
1. **Global Search Trigger**: Occupies the primary flexible zone (`max-w-xl`), displays placeholder and `⌘K` keyboard affordance, opens the existing accessible command palette.
2. **Notification Center**: Outlined bell icon with clean numerical unread badge; opens the role-filtered operational notification popover.
3. **Profile Menu Trigger**: Compact avatar with subtle focus ring.

*Removed from Topbar*:
- Global Quick Action dropdown (relocated contextually to PageHeaders).
- Prototype role switcher pill (fully removed).
- Theme mode segmented control (relocated inside the Profile Menu and Settings).
- Redundant header page title (rendered in PageHeader and breadcrumb).

### 2.3 Refined Profile Menu Architecture
Redesigned as an enterprise dropdown:
- **Identity Block**: Left-aligned compact avatar, operator full name, `@nickname`, and neutral `RoleLabel` (e.g. `Administrator`, `Operations Manager`) using quiet slate/mint tokens rather than a status badge.
- **Account Links**: Direct navigation to `My Profile & Account` and `Workspace Settings`.
- **Appearance Control**: Segmented 3-way theme toggle (`Light`, `Dark`, `System`) with accessible radio semantics.
- **Sign Out**: Subdued red text item with clear keyboard focus.

### 2.4 Command Center Dashboard Hierarchy
Transform the dashboard from an editable widget canvas into a stable, role-aware operational command center:
1. **Operational Pulse**: Compact alert strip showing critical exceptions (e.g., cold-chain batch expiry within 48h, overdue receivables > KES 500k). Replaces thick amber outlines and pulsing dots with quiet severity icons (`AlertTriangle`, `Clock`) and direct resolution links.
2. **Actionable Decision Metrics**: Exactly 4 high-leverage KPIs customized to the active role's responsibilities, complete with context, trend delta, and next-step action.
3. **Operational Work Queues**: Two-column layout for immediate task queues (e.g., Pending Credit Approvals, Route Dispatch Queue, Picking Workbench) with unboxed row metadata.
4. **Performance & Trends**: Visual charts answering core business inquiries (Revenue vs. Sourcing Cost, Institutional Mix).
5. **Recent Operational Activity**: Audited feed of logistics and financial events.
*Removed*: "Customize View" button, modal, drag handles, and layout toggles.

### 2.5 Page-Specific Quick Actions
Contextual actions are placed within each module's `PageHeader`:
- **Orders**: `+ New Institutional Order`
- **Inventory**: `Record Stock Adjustment`
- **Procurement**: `+ Raise Purchase Order`
- **Suppliers**: `+ Register Supplier`
- **Customers**: `+ Onboard Institution`
- **Finance & Payments**: `Record Payment`
- **Administration / Users**: `Invite Internal Operator`

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Relocating Quick Actions to Contextual PageHeaders
- *Approach*: Remove the global topbar "+ Quick Action" button and place primary actions directly on their respective domain pages.
- *Rationale*: Global action menus cause cognitive distraction and misaligned workflow states. Placing actions in the PageHeader respects role-based authorization in context.
- *Alternatives Considered*: Retaining a smaller "+" icon in the topbar was rejected because it duplicates on-page action buttons and crowds the utility header.

### Decision 2: Elimination of Prototype Role Switcher
- *Approach*: Completely remove persona switcher pills from the topbar, profile menu, and ordinary user navigation.
- *Rationale*: Production-grade BOS interfaces should reflect genuine authenticated sessions. The RBAC engine remains intact, and administration role management in `/administration/roles` remains fully functional.
- *Alternatives Considered*: Floating developer toggles were considered, but the user explicitly requested complete removal to ensure absolute UI cleanliness.

### Decision 3: System Theme as Default with Synchronized State
- *Approach*: Default `theme` to `'system'` in `bos-context.tsx`, reading `prefers-color-scheme`. Sync theme switching between the Profile Menu and Settings page through the shared context.
- *Rationale*: Eliminates harsh white or dark flashes on startup and matches native OS behavior without hydration mismatches.

---

## 4. Technical Architecture & Component Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ APPLICATION ARCHITECTURE & DATA FLOW                                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                          BosProvider (Context)                          │   │
│   │   - Active User & RBAC Permissions (can())                              │   │
│   │   - Global Search Index & Filter Handlers                               │   │
│   │   - Shared Theme Engine ('system' | 'light' | 'dark')                   │   │
│   │   - Operational Data (Orders, Batches, Warehouses, Invoices)            │   │
│   └────────────────────────────────────┬────────────────────────────────────┘   │
│                                        │                                        │
│                 ┌──────────────────────┴──────────────────────┐                 │
│                 ▼                                             ▼                 │
│   ┌───────────────────────────┐                 ┌───────────────────────────┐   │
│   │    AppShell Component     │                 │   Module Page Viewports   │   │
│   ├───────────────────────────┤                 ├───────────────────────────┤   │
│   │ - Persistent Nav Rail     │                 │ - Dashboard Command Center│   │
│   │ - Minimal Utility Topbar  │                 │ - Orders & Fulfillment    │   │
│   │   ├ Search Palette (⌘K)   │                 │ - FEFO Inventory Matrix   │   │
│   │   ├ Notification Popover  │                 │ - Procurement & Suppliers │   │
│   │   └ Profile Menu          │                 │ - Institutional Finance   │   │
│   │     ├ Identity + RoleLabel│                 │ - Administration & Roles  │   │
│   │     ├ Theme Segmented Ctr.│                 └─────────────┬─────────────┘   │
│   │     └ Sign Out Action     │                               │                 │
│   └───────────────────────────┘                               │                 │
│                                                               ▼                 │
│                                                 ┌───────────────────────────┐   │
│                                                 │ Shared Design Primitives  │   │
│                                                 ├───────────────────────────┤   │
│                                                 │ - Card (18px radius)      │   │
│                                                 │ - RoleLabel (Neutral)     │   │
│                                                 │ - StatusBadge (Semantic)  │   │
│                                                 │ - PageHeader + Actions    │   │
│                                                 │ - ActionableMetricCard    │   │
│                                                 │ - OperationalPulse (Calm) │   │
│                                                 │ - WorkQueue (Stacked Rows)│   │
│                                                 │ - Form Controls (10px)    │   │
│                                                 └───────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Component State & Interaction Strategy
- **Search Interaction**: Keyboard listener binds `Meta+K` / `Ctrl+K` to open modal; `Escape` closes; input automatically focused with ARIA modal semantics.
- **Theme Interaction**: `setTheme('system' | 'light' | 'dark')` persists to `localStorage` and toggles `.dark` class on `document.documentElement` dynamically.
- **Breadcrumb Hierarchy**: Computed dynamically from route segments, providing accessible anchor links to parent directories while rendering the terminal segment as plain text.
- **WorkQueue Mobile Adaptability**: Rows transform from horizontal flex to structured vertical stacks on viewports `< 640px`, ensuring item titles and action buttons never collide.
- **Dependency & Lockfile Integrity**: Audit `package.json`, eliminate obsolete dependencies, and ensure the canonical lockfile is consistent with Next.js 15 App Router requirements.

---

## 5. Verification & Acceptance Plan

- [ ] **Topbar Minimalist Verification**: Topbar contains only Global Search, Notification bell, and Profile avatar. No global quick action, no theme pill, no role switcher, no duplicate title.
- [ ] **Design System Radius Audit**: No cards, matrix blocks, or multi-line buttons use `rounded-full`. All cards use 18px; inputs and buttons use 10px; modals use 20px.
- [ ] **Profile Menu Integrity**: Displays clean avatar, name, email, neutral `RoleLabel`, Profile & Settings links, 3-way theme toggle, and Sign Out. No demo role switcher.
- [ ] **Theme Hydration Check**: System theme defaults cleanly without hydration mismatch or screen flicker.
- [ ] **Dashboard Command Center**: Clean Operational Pulse without excessive borders or pulsing animations, 4 role-filtered KPIs, two-column WorkQueues, and no "Customize View" controls.
- [ ] **Icon Cleanliness**: All Lucide icons inherit stroke color without hardcoded fills.
- [ ] **Responsive Verification**: Fluid layout verified at 375px (mobile), 768px (tablet), 1024px, and 1440px (desktop).
- [ ] **Build & Type Safety**: `npm run lint` and `npm run build` pass with zero errors.

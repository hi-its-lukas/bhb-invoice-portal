# Design Guidelines: BHB Invoice & Dunning Management Portal

## Design Approach

**Selected System**: Material Design 3 + Carbon Design (hybrid)
- **Rationale**: Financial data platform requiring clear information hierarchy, robust data tables, and professional trust. Material Design provides form elements and navigation; Carbon Design patterns for complex data tables and dashboards.

## Core Design Principles

1. **Information Clarity**: Financial data must be scannable and unambiguous
2. **Trust & Professionalism**: Conservative, reliable aesthetic for business users
3. **Efficient Data Entry**: Streamlined forms for admin workflows
4. **Status Visibility**: Clear visual indicators for payment states, dunning levels, overdue items

---

## Typography

**Font Family**: 
- Primary: Inter (via Google Fonts CDN)
- Monospace: JetBrains Mono (for invoice numbers, amounts)

**Type Scale**:
- Page Titles: text-3xl font-semibold (32px)
- Section Headers: text-xl font-semibold (20px)
- Subsections: text-lg font-medium (18px)
- Body/Tables: text-base (16px)
- Captions/Labels: text-sm (14px)
- Financial Figures: text-lg font-medium tabular-nums

---

## Layout System

**Spacing Primitives**: Tailwind units of 2, 4, 6, and 8
- Component padding: p-4, p-6
- Section gaps: gap-6, gap-8
- Page margins: px-6, px-8
- Card spacing: p-6

**Container Structure**:
- Max width: max-w-7xl mx-auto
- Sidebar width: w-64 (fixed navigation)
- Main content: flex-1 with px-6 py-8

---

## Component Library

### Navigation

**Top Bar** (fixed, full-width):
- Height: h-16
- Logo left, user profile/logout right
- Breadcrumb navigation for deep pages
- Shadow: shadow-sm

**Sidebar** (for logged-in users):
- Fixed left, w-64
- Navigation items: py-3 px-4, hover state, active indicator
- Icons from Heroicons (outline style, 24px)
- Sections: Dashboard, Invoices, Debtors, Dunning Management, Settings

### Data Tables

**Invoice/Receipt Lists**:
- Striped rows for readability (alternate row treatment)
- Sortable columns with sort indicators
- Fixed header on scroll
- Row height: h-14
- Column padding: px-4 py-3
- Status badges: inline-flex rounded-full px-3 py-1 text-sm

**Key Columns**:
- Invoice Number (monospace, link)
- Debtor Name
- Date/Due Date
- Amount (right-aligned, tabular-nums)
- Payment Status (badge)
- Dunning Level (badge)
- Actions (icon buttons)

**Table Pagination**:
- Bottom right
- Items per page selector + page numbers
- "Showing X-Y of Z results"

### Status Indicators

**Payment Status Badges**:
- Paid: Subtle success treatment
- Unpaid: Neutral treatment
- Overdue: Warning treatment (amber tones conceptually)
- Urgent: Alert treatment

**Dunning Level Badges**:
- No action: Subtle neutral
- Reminder: Info treatment
- Dunning 1/2/3: Escalating visual weight

### Cards & Panels

**Dashboard Cards**:
- rounded-lg with shadow-sm
- p-6 spacing
- Header with icon + title (text-lg font-semibold)
- Metric display: text-3xl font-bold tabular-nums
- Supporting text: text-sm
- Grid layout: grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6

**Detail Panels**:
- Invoice detail: Two-column layout (invoice info left, financial summary right)
- Calculation breakdown tables (interest, fees)
- PDF preview integration

### Forms

**Admin Forms** (Debtor Setup, User Management):
- Stacked labels above inputs
- Input height: h-11
- Label: text-sm font-medium mb-2
- Help text: text-xs mt-1
- Field spacing: space-y-6
- Form sections with dividers
- Action buttons bottom-right (primary + cancel)

**Input Types**:
- Text/Email: Standard inputs with border focus states
- Select dropdowns: Native styling with chevron icon
- Date pickers: Integration-ready container
- Number inputs: Right-aligned text, tabular-nums
- Checkboxes/Radio: Material Design patterns

### Buttons

**Hierarchy**:
- Primary (CTA): Filled, font-medium, px-6 py-2.5 rounded-md
- Secondary: Outlined, same padding
- Text button: No border, px-4 py-2
- Icon buttons: p-2 rounded-md, 40x40px clickable area

**Sizes**:
- Default: text-base, h-11
- Small: text-sm, h-9
- Large: text-lg, h-12

### Modals & Dialogs

**Structure**:
- Overlay with backdrop blur
- Dialog: rounded-lg, max-w-lg to max-w-2xl
- Header: p-6, border-b
- Body: p-6
- Footer: p-6, border-t, actions right-aligned

**Use Cases**:
- Confirm send dunning email
- View calculation details
- Quick debtor information
- Error messages

### Icons

**Library**: Heroicons (CDN)
- Navigation: 24px outline
- Table actions: 20px outline
- Status indicators: 16px solid
- Form fields: 20px outline (left-aligned with input text)

---

## Page Templates

### Login Page
- Centered card: max-w-md
- Logo + title
- Email/password fields
- Remember me checkbox
- Primary login button (full-width)
- Minimal, professional

### Dashboard (Post-Login)
- Sidebar + top bar layout
- 4-column metric cards (outstanding invoices, overdue, total amount due, dunning emails sent this month)
- Recent activity table (last 10 invoices)
- Quick actions panel
- Charts for overdue trends (line chart, simple bars)

### Invoice List
- Filters bar: debtor select, date range, status, dunning level
- Search input (invoice number, debtor name)
- Data table with pagination
- Bulk actions (if needed): Select checkboxes

### Invoice Detail
- Header: Invoice number + status badges
- Two-column: Left (invoice metadata, line items), Right (payment info, interest calculation, dunning history)
- Action buttons: Download PDF, Send Reminder, Mark as Paid
- Timeline of dunning events below

### Admin: Debtor Management
- List view with search
- Add Debtor button (opens modal or dedicated page)
- Form fields: Debtor number, display name, email, dunning profile selector
- Assigned users section

### Admin: Dunning Rules
- Per-debtor configuration
- Grace days input
- Interest rate settings (fixed % or legal rate toggle)
- Stages editor: Reminder (X days), Dunning 1 (Y days), Dunning 2 (Z days), fees per stage
- Save as template option

---

## Animations

**Minimal, Purposeful**:
- Table row hover: Subtle treatment transition
- Button interactions: Standard states (no elaborate animations)
- Loading states: Simple spinner (Heroicons, 24px, centered)
- Toast notifications: Slide-in from top-right

---

## Responsive Behavior

**Breakpoints** (Tailwind defaults):
- Mobile (base): Stack all, sidebar becomes hamburger menu, single-column cards
- Tablet (md: 768px): 2-column card grids, compact table (horizontal scroll if needed)
- Desktop (lg: 1024px): Full sidebar, 3-4 column grids, all table columns visible

**Table Mobile Strategy**:
- Card-style list items (stacked fields) OR horizontal scroll with frozen first column

---

## Images

No hero images or marketing imagery needed. This is a functional business portal.

**Icons only**:
- Navigation icons (Heroicons)
- Status badges with optional icon prefixes
- Empty states: Simple illustration (use placeholder comment for custom illustration if needed)

---

**Critical Notes**:
- No color specifications per your guidelines
- Focus: Clean data presentation, efficient workflows, professional trust
- All financial figures use tabular-nums for alignment
- Consistent spacing creates scannable hierarchy
- Material + Carbon patterns ensure familiarity for business users
# Frontend Component Reference

All reusable UI components live in `components/ui/`. Import via the barrel:

```ts
import { StatCard, EmptyState, Modal, DataTable } from "@/components/ui";
```

---

## StatCard / KpiTile

```tsx
import { StatCard, KpiTile } from "@/components/ui";

// Large card with icon + optional trend + link
<StatCard
  label="Total Leads"
  value={142}
  icon={Users}
  color="blue"          // blue | green | red | amber | purple | emerald | slate
  href="/leads"
  subLabel="vs 120 last week"
  trend={18}            // positive = up arrow, negative = down
/>

// Compact tile for dashboard strips (no arrow, no icon)
<KpiTile label="Won Today" value={3} color="green" />
```

---

## EmptyState

```tsx
import { EmptyState } from "@/components/ui";

<EmptyState
  icon={Search}
  title="No leads found"
  description="Try adjusting your filters."
  action={{ label: "Clear filters", onClick: () => setFilters({}) }}
/>
```

---

## LoadingSkeleton / Spinner / PageLoader

```tsx
import { LoadingSkeleton, Spinner, PageLoader } from "@/components/ui";

// Skeleton placeholder while data loads
<LoadingSkeleton type="list" rows={5} />   // list | grid | table | card
<LoadingSkeleton type="table" rows={10} />

// Inline spinner (inside buttons)
<button disabled={saving}>
  {saving && <Spinner className="h-3.5 w-3.5 mr-1.5" />}
  Save
</button>

// Full-page loading state
if (loading) return <PageLoader />;
```

---

## ErrorCard

```tsx
import { ErrorCard } from "@/components/ui";

<ErrorCard
  message="Failed to load leads"
  detail={error}        // shown in expandable panel
  onRetry={load}        // shows Retry button
/>
```

---

## Modal

```tsx
import { Modal } from "@/components/ui";

const [open, setOpen] = useState(false);

<Modal open={open} onClose={() => setOpen(false)} title="Edit Lead" size="lg">
  {/* content */}
</Modal>
```

Sizes: `sm` (384px) | `md` (448px) | `lg` (672px) | `xl` (896px) | `full` (95vw)

Closes on Escape and backdrop click by default.

---

## ConfirmDialog

```tsx
import { ConfirmDialog } from "@/components/ui";

<ConfirmDialog
  open={showDelete}
  onClose={() => setShowDelete(false)}
  onConfirm={handleDelete}
  title="Delete this lead?"
  description="This cannot be undone."
  confirmLabel="Delete"
  variant="danger"      // danger | default
  loading={deleting}
/>
```

---

## SectionHeader / CardHeader

```tsx
import { SectionHeader, CardHeader } from "@/components/ui";

// Top of a page
<SectionHeader
  title="Leads"
  description="All imported businesses"
  icon={Users}
  actions={<button>Add Lead</button>}
/>

// Top of a card
<CardHeader title="Website Analysis" icon={Globe} actions={<button>Re-analyse</button>} />
```

---

## SearchBar

```tsx
import { SearchBar } from "@/components/ui";

<SearchBar
  value={query}
  onChange={setQuery}
  placeholder="Search leads…"
  size="md"             // sm | md
/>
```

---

## DataTable

```tsx
import { DataTable, type Column } from "@/components/ui";

const columns: Column<Business>[] = [
  {
    key: "name",
    header: "Business",
    sortable: true,
    render: (row) => <span className="font-medium">{row.name}</span>,
  },
  {
    key: "status",
    header: "Status",
    align: "center",
    render: (row) => <ContactStatusBadge status={row.contact_status} />,
  },
];

<DataTable
  columns={columns}
  data={businesses}
  rowKey={(b) => b.id}
  loading={loading}
  emptyTitle="No leads found"
  sortKey={sortKey}
  sortDir={sortDir}
  onSort={handleSort}
  onRowClick={(b) => router.push(`/leads/${b.id}`)}
/>
```

---

## Pagination / PageSummary

```tsx
import { Pagination, PageSummary } from "@/components/ui";

<div className="flex items-center justify-between mt-4">
  <PageSummary page={page} pageSize={25} total={total} />
  <Pagination page={page} totalPages={Math.ceil(total / 25)} onPage={setPage} />
</div>
```

---

## Form Controls

```tsx
import { TextInput, Textarea, Select, Checkbox, MoneyInput } from "@/components/ui";

<TextInput label="Business Name" value={name} onChange={e => setName(e.target.value)} />
<Textarea label="Notes" value={notes} onChange={e => setNotes(e.target.value)} rows={4} />
<Select label="Status" value={status} onChange={e => setStatus(e.target.value)}>
  <option value="NEW">New</option>
</Select>
<Checkbox label="Auto-import results" checked={autoImport} onChange={setAutoImport} />
<MoneyInput label="Deal Value" value={value} onChange={setValue} currency="€" />
```

---

## Badge / StatusDot

```tsx
import { Badge, StatusDot } from "@/components/ui";

<Badge variant="green">Active</Badge>
<Badge variant="red" dot>Urgent</Badge>

// Variants: default | slate | blue | green | red | amber | orange | purple | emerald | indigo | cyan

<StatusDot color="bg-green-500" pulse />
```

---

## Domain Badges (existing)

These pre-date the component library but follow the same patterns:

```tsx
import { WebsiteStatusBadge } from "@/components/WebsiteStatusBadge";
import { ContactStatusBadge } from "@/components/ContactStatusBadge";

<WebsiteStatusBadge status={business.website_status} />
<ContactStatusBadge status={business.contact_status} />
```

---

## Shared Data

### Category Data

```ts
import {
  UK_CATEGORY_GROUPS, BULGARIA_CATEGORY_GROUPS,
  MAJOR_CITIES, SMALL_TOWNS, NEIGHBOR_CITIES,
  getGroupCategories, getGroupDisplayName,
  ALL_GROUP_PREFIX,
} from "@/lib/category-data";
```

**Do not copy-paste category arrays into page files.** Import from `lib/category-data.ts`.

### API Client

All backend calls go through `lib/api.ts`. Never call `fetch()` directly in page components.

```ts
import { fetchBusinesses, updateBusiness, type Business } from "@/lib/api";
```

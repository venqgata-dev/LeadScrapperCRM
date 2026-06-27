const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type WebsiteStatus = "NO_WEBSITE" | "FACEBOOK_ONLY" | "FREE_BUILDER" | "BROKEN_WEBSITE" | "HAS_WEBSITE";
export type ContactStatus =
  | "NEW"
  | "CALLED"
  | "NO_ANSWER"
  | "INTERESTED"
  | "FOLLOW_UP"
  | "PROPOSAL_SENT"
  | "WON"
  | "LOST"
  | "CONTACTED"; // legacy

export type CallOutcome = "ANSWERED" | "NO_ANSWER" | "VOICEMAIL" | "BUSY";

export interface Business {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  email_source: string | null;
  website: string | null;
  google_maps_url: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  linkedin_url: string | null;
  website_status: WebsiteStatus;
  address: string | null;
  city: string | null;
  country: string | null;
  category: string | null;
  rating: number | null;
  review_count: number;
  lead_score: number;
  contact_status: ContactStatus;
  last_contacted: string | null;
  opportunity_reason: string | null;
  notes: string | null;
  // CloudTalk fields
  cloudtalk_contact_id: string | null;
  last_call_id: string | null;
  // Sales pipeline fields
  deal_value: number | null;
  follow_up_date: string | null;
  proposal_sent_at: string | null;
  called_at: string | null;
  won_at: string | null;
  // AI scoring
  ai_score: number | null;
  ai_priority: string | null;
  ai_project_value: number | null;
  ai_close_prob: number | null;
  // Website analysis
  website_platform: string | null;
  website_health_score: number | null;
  website_seo_score: number | null;
  website_redesign_score: number | null;
  website_load_time_ms: number | null;
  website_cms: string | null;
  website_mobile_friendly: boolean | null;
  website_https: boolean | null;
  website_has_analytics: boolean | null;
  website_has_contact_form: boolean | null;
  website_wordpress: boolean | null;
  website_shopify: boolean | null;
  website_wix: boolean | null;
  website_last_analyzed: string | null;
  redesign_reasons: string | null;
  // Social
  facebook_found: boolean | null;
  instagram_found: boolean | null;
  fb_followers: number | null;
  ig_followers: number | null;
  // Enrichment
  enrichment_status: string | null;
  last_enriched_at: string | null;
  // Extra links
  youtube_url: string | null;
  tiktok_url: string | null;
  whatsapp_url: string | null;
  contact_form_url: string | null;
  search_campaign_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface CrmDashboardStats {
  total_opportunities: number;
  no_website: number;
  facebook_only: number;
  free_builder: number;
  total_calls: number;
  calls_today: number;
  interested: number;
  proposals_sent: number;
  deals_won: number;
  revenue_won: number;
  avg_deal_value: number;
  revenue_this_month: number;
  revenue_last_30_days: number;
  call_to_interested_rate: number;
  interested_to_proposal_rate: number;
  proposal_to_won_rate: number;
}

export interface RevenueByMonth {
  month: string;
  revenue: number;
  deals: number;
}

export interface CategoryAnalytics {
  category: string;
  opportunities: number;
  won_deals: number;
  revenue: number;
}

export interface MarketAnalytics {
  city: string;
  total: number;
  opportunities: number;
  opportunity_rate: number;
  revenue_won: number;
}


export interface CallLog {
  id: number;
  business_id: number;
  called_at: string;
  outcome: CallOutcome | null;
  notes: string | null;
  created_at: string;
}

export interface BusinessNote {
  id: number;
  business_id: number;
  body: string;
  created_at: string;
}

export interface ImportResult {
  imported: number;
  updated: number;
  skipped: number;
}

export interface BusinessFilters {
  search?: string;
  website_status?: WebsiteStatus;
  country?: string;
  city?: string;
  category?: string;
  has_phone?: boolean;
  has_email?: boolean;
  contact_status?: ContactStatus;
}

export interface SearchResultLead {
  name: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  website_status: WebsiteStatus;
  address: string | null;
  city: string | null;
  country: string | null;
  category: string | null;
  rating: number | null;
  review_count: number;
  lead_score: number;
  opportunity_reason: string;
  google_maps_url: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  linkedin_url: string | null;
}

export interface SearchRequest {
  country: string;
  city: string;
  category: string;
  provider: string;
  radius_km?: number;
  expand_neighbors?: boolean;
  expand_keywords?: boolean;
}

export interface SearchAnalytics {
  raw_count: number;
  deduped_count: number;
  opportunities: number;
  no_website: number;
  facebook_only: number;
  free_builder: number;
  cities_searched: string[];
  keywords_used: string[];
}

export interface SearchResponse {
  leads: SearchResultLead[];
  analytics: SearchAnalytics;
}

export interface ProviderStatus {
  source: string;
  label: string;
  available: boolean;
  note: string;
}

// ---------------------------------------------------------------------------
// Normalization helpers
// ---------------------------------------------------------------------------

function safeRating(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return isFinite(n) ? n : null;
}

function safeCount(v: unknown): number {
  if (v == null || v === "") return 0;
  const n = Number(v);
  return isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

function safeDecimal(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return isFinite(n) ? n : null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeBusiness(raw: any): Business {
  return {
    ...raw,
    rating:       safeRating(raw.rating),
    review_count: safeCount(raw.review_count),
    lead_score:   safeCount(raw.lead_score),
    deal_value:   safeDecimal(raw.deal_value),
  } as Business;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeSearchResultLead(raw: any): SearchResultLead {
  return {
    ...raw,
    rating:       safeRating(raw.rating),
    review_count: safeCount(raw.review_count),
    lead_score:   safeCount(raw.lead_score),
  } as SearchResultLead;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeCrmStats(raw: any): CrmDashboardStats {
  return {
    ...raw,
    revenue_won: safeDecimal(raw.revenue_won) ?? 0,
  } as CrmDashboardStats;
}

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchStats(): Promise<CrmDashboardStats> {
  const raw = await apiFetch<unknown>("/businesses/stats");
  return normalizeCrmStats(raw);
}

export async function fetchBusinesses(filters: BusinessFilters = {}): Promise<Business[]> {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.website_status) params.set("website_status", filters.website_status);
  if (filters.country) params.set("country", filters.country);
  if (filters.city) params.set("city", filters.city);
  if (filters.category) params.set("category", filters.category);
  if (filters.has_phone !== undefined) params.set("has_phone", String(filters.has_phone));
  if (filters.has_email !== undefined) params.set("has_email", String(filters.has_email));
  if (filters.contact_status) params.set("contact_status", filters.contact_status);
  const qs = params.toString();
  const raw = await apiFetch<unknown>(`/businesses${qs ? `?${qs}` : ""}`);
  if (!Array.isArray(raw)) {
    console.error("[fetchBusinesses] expected array, got:", typeof raw, raw);
    return [];
  }
  return raw.map(normalizeBusiness);
}

export async function fetchBusiness(id: number): Promise<Business> {
  const raw = await apiFetch<unknown>(`/businesses/${id}`);
  return normalizeBusiness(raw);
}

export async function fetchOpportunities(): Promise<Business[]> {
  const raw = await apiFetch<unknown>("/businesses/opportunities/no-website");
  if (!Array.isArray(raw)) {
    console.error("[fetchOpportunities] expected array, got:", typeof raw, raw);
    return [];
  }
  return raw.map(normalizeBusiness);
}

export async function updateBusiness(
  id: number,
  payload: {
    notes?: string | null;
    contact_status?: ContactStatus;
    deal_value?: number | null;
    follow_up_date?: string | null;
    proposal_sent_at?: string | null;
    called_at?: string | null;
    won_at?: string | null;
  }
): Promise<Business> {
  const raw = await apiFetch<unknown>(`/businesses/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return normalizeBusiness(raw);
}

export async function logCall(
  businessId: number,
  payload: { outcome?: CallOutcome | null; notes?: string | null; called_at?: string }
): Promise<CallLog> {
  return apiFetch<CallLog>(`/businesses/${businessId}/calls`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchCalls(businessId: number): Promise<CallLog[]> {
  return apiFetch<CallLog[]>(`/businesses/${businessId}/calls`);
}

export async function addNote(businessId: number, body: string): Promise<BusinessNote> {
  return apiFetch<BusinessNote>(`/businesses/${businessId}/notes`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

export async function fetchNotes(businessId: number): Promise<BusinessNote[]> {
  return apiFetch<BusinessNote[]>(`/businesses/${businessId}/notes`);
}

export async function searchLeads(payload: SearchRequest): Promise<SearchResponse> {
  const raw = await apiFetch<Record<string, unknown>>("/search", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  console.log("[searchLeads] response keys:", Object.keys(raw));
  // Backend returns { leads: [...], analytics: {...} }
  const leadsRaw = Array.isArray(raw.leads) ? raw.leads : [];
  if (!Array.isArray(raw.leads)) {
    console.error("[searchLeads] raw.leads is not an array — got:", typeof raw.leads, raw);
  }
  return {
    leads: leadsRaw.map(normalizeSearchResultLead),
    analytics: raw.analytics as SearchAnalytics,
  };
}

export async function fetchRevenueByMonth(): Promise<RevenueByMonth[]> {
  const raw = await apiFetch<unknown>("/businesses/analytics/revenue-by-month");
  if (!Array.isArray(raw)) {
    console.error("[fetchRevenueByMonth] expected array, got:", typeof raw);
    return [];
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return raw.map((r: any) => ({ ...r, revenue: safeDecimal(r.revenue) ?? 0 }));
}

export async function fetchCategoryAnalytics(): Promise<CategoryAnalytics[]> {
  const raw = await apiFetch<unknown>("/businesses/analytics/categories");
  if (!Array.isArray(raw)) {
    console.error("[fetchCategoryAnalytics] expected array, got:", typeof raw);
    return [];
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return raw.map((r: any) => ({ ...r, revenue: safeDecimal(r.revenue) ?? 0 }));
}

export async function fetchMarketAnalytics(): Promise<MarketAnalytics[]> {
  const raw = await apiFetch<unknown>("/businesses/analytics/markets");
  if (!Array.isArray(raw)) {
    console.error("[fetchMarketAnalytics] expected array, got:", typeof raw);
    return [];
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return raw.map((r: any) => ({ ...r, revenue_won: safeDecimal(r.revenue_won) ?? 0 }));
}

export async function discoverEmail(id: number): Promise<Business> {
  const raw = await apiFetch<unknown>(`/businesses/${id}/discover-email`, { method: "POST" });
  return normalizeBusiness(raw);
}

export async function importBatch(leads: SearchResultLead[]): Promise<ImportResult> {
  return apiFetch<ImportResult>("/import-batch", {
    method: "POST",
    body: JSON.stringify({ leads }),
  });
}

export async function fetchProviders(): Promise<ProviderStatus[]> {
  return apiFetch<ProviderStatus[]>("/providers");
}

export async function scrapeLeads(payload: {
  source: string;
  keyword: string;
  location: string;
}): Promise<ImportResult> {
  return apiFetch<ImportResult>("/import-leads", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function previewCsv(file: File): Promise<SearchResultLead[]> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/preview-csv`, { method: "POST", body: form });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  const raw = (await res.json()) as unknown[];
  return raw.map(normalizeSearchResultLead);
}

export async function importCsv(file: File): Promise<ImportResult> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/import-csv`, { method: "POST", body: form });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json() as Promise<ImportResult>;
}

// ---------------------------------------------------------------------------
// CloudTalk
// ---------------------------------------------------------------------------

export interface CloudTalkStatus {
  configured: boolean;
  connected: boolean;
  account_info: Record<string, unknown> | null;
  error: string | null;
}

export interface CloudTalkContactSync {
  cloudtalk_contact_id: string;
  created: boolean;
}

export interface CloudTalkCallInitiate {
  cloudtalk_call_id: string | null;
  message: string;
}

export interface CloudTalkCallRecord {
  id: number;
  business_id: number;
  cloudtalk_call_id: string | null;
  direction: string;
  status: string;
  duration: number | null;
  started_at: string | null;
  ended_at: string | null;
  recording_url: string | null;
  agent: string | null;
  created_at: string;
}

export async function fetchCloudTalkStatus(): Promise<CloudTalkStatus> {
  return apiFetch<CloudTalkStatus>("/cloudtalk/status");
}

export async function testCloudTalkConnection(): Promise<CloudTalkStatus> {
  return apiFetch<CloudTalkStatus>("/cloudtalk/test", { method: "POST" });
}

export async function syncCloudTalkContact(businessId: number): Promise<CloudTalkContactSync> {
  return apiFetch<CloudTalkContactSync>(`/cloudtalk/sync-contact/${businessId}`, { method: "POST" });
}

export async function initiateCloudTalkCall(businessId: number): Promise<CloudTalkCallInitiate> {
  return apiFetch<CloudTalkCallInitiate>(`/cloudtalk/call/${businessId}`, { method: "POST" });
}

export async function fetchCloudTalkCalls(businessId: number): Promise<CloudTalkCallRecord[]> {
  const raw = await apiFetch<unknown>(`/cloudtalk/calls/${businessId}`);
  if (!Array.isArray(raw)) return [];
  return raw as CloudTalkCallRecord[];
}

// ---------------------------------------------------------------------------
// Campaigns
// ---------------------------------------------------------------------------

export type CampaignStatus = "Draft" | "Running" | "Paused" | "Completed" | "Failed" | "Cancelled";

export interface CampaignProgressData {
  current_city?: string;
  cities_done?: number;
  cities_total?: number;
  results_so_far?: number;
  api_requests_so_far?: number;
  error?: string;
}

export interface Campaign {
  id: number;
  name: string;
  country: string;
  provider: string;
  category: string;
  category_group: string | null;
  cities: string[];
  search_type: string;
  expand_keywords: boolean;
  expand_neighbors: boolean;
  auto_import: boolean;
  status: CampaignStatus;
  started_at: string | null;
  completed_at: string | null;
  duration_seconds: number | null;
  raw_results: number;
  deduped_results: number;
  opportunities: number;
  imported: number;
  api_requests: number;
  estimated_cost: number;
  progress_data: CampaignProgressData | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignCreate {
  name: string;
  country: string;
  provider: string;
  category: string;
  category_group?: string | null;
  cities: string[];
  search_type: string;
  expand_keywords: boolean;
  expand_neighbors: boolean;
  auto_import: boolean;
}

export interface CampaignStats {
  total: number;
  running: number;
  completed: number;
  businesses_found: number;
  imported: number;
  opportunities: number;
  estimated_cost: number;
}

export interface DuplicateWarning {
  is_duplicate: boolean;
  similar_campaigns: Campaign[];
  warning_message: string | null;
}

export async function fetchCampaigns(): Promise<Campaign[]> {
  const raw = await apiFetch<unknown>("/campaigns");
  if (!Array.isArray(raw)) return [];
  return raw as Campaign[];
}

export async function fetchCampaignStats(): Promise<CampaignStats> {
  return apiFetch<CampaignStats>("/campaigns/stats");
}

export async function fetchCampaign(id: number): Promise<Campaign> {
  return apiFetch<Campaign>(`/campaigns/${id}`);
}

export async function createCampaign(payload: CampaignCreate): Promise<Campaign> {
  return apiFetch<Campaign>("/campaigns", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function checkDuplicate(payload: CampaignCreate): Promise<DuplicateWarning> {
  return apiFetch<DuplicateWarning>("/campaigns/check-duplicate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function startCampaign(id: number): Promise<Campaign> {
  return apiFetch<Campaign>(`/campaigns/${id}/start`, { method: "POST" });
}

export async function pauseCampaign(id: number): Promise<Campaign> {
  return apiFetch<Campaign>(`/campaigns/${id}/pause`, { method: "POST" });
}

export async function resumeCampaign(id: number): Promise<Campaign> {
  return apiFetch<Campaign>(`/campaigns/${id}/resume`, { method: "POST" });
}

export async function cancelCampaign(id: number): Promise<Campaign> {
  return apiFetch<Campaign>(`/campaigns/${id}/cancel`, { method: "POST" });
}

export async function deleteCampaign(id: number): Promise<void> {
  await apiFetch<void>(`/campaigns/${id}`, { method: "DELETE" });
}

// ---------------------------------------------------------------------------
// Sales Playbooks
// ---------------------------------------------------------------------------

export interface SalesPlaybook {
  id: number;
  name: string;
  description: string | null;
  applies_to: string[];
  opening: string | null;
  questions: string[];
  pain_points: string[];
  closing: string | null;
  objection_handling: Record<string, string>;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlaybookCreate {
  name: string;
  description?: string;
  applies_to?: string[];
  opening?: string;
  questions?: string[];
  pain_points?: string[];
  closing?: string;
  objection_handling?: Record<string, string>;
  is_active?: boolean;
}

export async function fetchPlaybooks(activeOnly = true): Promise<SalesPlaybook[]> {
  const raw = await apiFetch<unknown>(`/playbooks?active_only=${activeOnly}`);
  if (!Array.isArray(raw)) return [];
  return raw as SalesPlaybook[];
}

export async function createPlaybook(payload: PlaybookCreate): Promise<SalesPlaybook> {
  return apiFetch<SalesPlaybook>("/playbooks", { method: "POST", body: JSON.stringify(payload) });
}

export async function updatePlaybook(id: number, payload: Partial<PlaybookCreate>): Promise<SalesPlaybook> {
  return apiFetch<SalesPlaybook>(`/playbooks/${id}`, { method: "PUT", body: JSON.stringify(payload) });
}

export async function deletePlaybook(id: number): Promise<void> {
  await apiFetch<void>(`/playbooks/${id}`, { method: "DELETE" });
}

// ---------------------------------------------------------------------------
// Meeting Notes
// ---------------------------------------------------------------------------

export interface MeetingNote {
  id: number;
  business_id: number;
  summary: string | null;
  requirements: string | null;
  budget: string | null;
  deadline: string | null;
  competitors: string[];
  decision_maker: string | null;
  next_meeting: string | null;
  created_at: string;
  updated_at: string;
}

export async function fetchMeetingNotes(businessId: number): Promise<MeetingNote | null> {
  const raw = await apiFetch<unknown>(`/businesses/${businessId}/meeting-notes`);
  return raw as MeetingNote | null;
}

export async function upsertMeetingNotes(businessId: number, payload: Partial<MeetingNote>): Promise<MeetingNote> {
  return apiFetch<MeetingNote>(`/businesses/${businessId}/meeting-notes`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

// ---------------------------------------------------------------------------
// Competitor Snapshot
// ---------------------------------------------------------------------------

export interface CompetitorSnapshot {
  id: number;
  business_id: number;
  main_competitors: string[];
  notes: string | null;
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
  created_at: string;
  updated_at: string;
}

export async function fetchCompetitor(businessId: number): Promise<CompetitorSnapshot | null> {
  const raw = await apiFetch<unknown>(`/businesses/${businessId}/competitor`);
  return raw as CompetitorSnapshot | null;
}

export async function upsertCompetitor(businessId: number, payload: Partial<CompetitorSnapshot>): Promise<CompetitorSnapshot> {
  return apiFetch<CompetitorSnapshot>(`/businesses/${businessId}/competitor`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

// ---------------------------------------------------------------------------
// Sales Insights
// ---------------------------------------------------------------------------

export interface SalesInsight {
  id: number;
  business_id: number;
  overall_score: number;
  priority: string;
  pain_points: string[];
  strengths: string[];
  recommendations: string[];
  recommended_services: string[];
  recommended_pitch: string | null;
  next_best_action: string | null;
  estimated_project_value: number;
  estimated_close_probability: number;
  talking_points: string[] | null;
  objection_responses: Record<string, string> | null;
  generated_at: string | null;
}

export async function fetchSalesInsights(businessId: number): Promise<SalesInsight | null> {
  const raw = await apiFetch<unknown>(`/businesses/${businessId}/sales-insights`);
  return raw as SalesInsight | null;
}

// ---------------------------------------------------------------------------
// Workspace
// ---------------------------------------------------------------------------

export interface WorkspaceStats {
  calls_today: number;
  follow_ups_today: number;
  follow_ups_overdue: number;
  hot_leads: number;
  in_negotiation: number;
  proposals_waiting: number;
  won_today: number;
  lost_today: number;
  total_pipeline_value: number;
  calls_this_week: number;
  calls_last_week: number;
  win_rate: number;
  avg_response_time_hours: number;
  calls_to_interested_rate: number;
  interested_to_proposal_rate: number;
  proposal_to_won_rate: number;
  top_category: string;
  overdue_follow_ups_pct: number;
}

export async function fetchWorkspaceStats(): Promise<WorkspaceStats> {
  return apiFetch<WorkspaceStats>("/workspace/stats");
}

export async function fetchHotLeads(): Promise<Business[]> {
  const raw = await apiFetch<unknown>("/workspace/hot-leads");
  if (!Array.isArray(raw)) return [];
  return (raw as unknown[]).map(normalizeBusiness);
}

/**
 * Shared TypeScript interfaces for the Browser Copilot Chrome Extension
 * Based on the copilot-rearchitecture.md specification
 */

export type Landmark = 'main'|'header'|'nav'|'footer'|'aside';

export type RoleSelector =
  | { kind:'role'; role:string; name?:string; nameMode?:'exact'|'includes'|'regex';
      pressed?:boolean; disabled?:boolean; withinLandmark?:Landmark; nth?:number; framePath?: string[] }
  | { kind:'text'; text:string; withinLandmark?:Landmark; nth?:number; framePath?: string[] }
  | { kind:'css'; css:string; framePath?: string[] }; // fallback only

export type MiniPCD = {
  url: string;
  origin: string;              // URL.origin
  title: string;
  loginState: 'unknown'|'in'|'out';
  ts: number;                  // version timestamp (ms)
  landmarks: Landmark[];

  actions: Array<MiniAction>;
  forms: Array<MiniForm>;
  collections: Array<MiniCollection>;

  metrics?: { ariaCoverage?: number; viewportH?: number; viewportW?: number };
};

export type MiniAction = {
  id: string;                  // stable within page version
  label: string;               // accessible name or best-effort text
  role: 'button'|'link'|'menuitem'|'tab'|'checkbox'|'radio'|'other';
  kind?: string;               // inferred semantic: 'search'|'login'|'billing'|'checkout'|...
  landmark?: Landmark;
  aboveFold?: boolean;
  clusterId?: string;          // dedupe key (role+label+pathRoot)
  appliesToCollectionId?: string; // template association (grid/list)
};

export type MiniForm = {
  id: string;
  purpose?: string;            // inferred: 'search_products'|'login'|'filter'|...
  landmark?: Landmark;
  fieldSummaries: Array<{ name?: string; label: string; type: string; required?: boolean }>;
  submitLabel?: string;        // accessible name of submit control if obvious
};

export type MiniCollection = {
  id: string;
  name: string;                // e.g., 'results', 'productGrid', 'invoices'
  itemFields: string[];        // e.g., ['title','price','detailUrl']
  landmark?: Landmark;
  approxCount?: number;        // visible count or estimate
};

export type PCDActionDetail = {
  id: string;                      // matches MiniAction.id or MiniForm.id
  selector: RoleSelector;          // primary selector
  altSelectors?: RoleSelector[];   // text locator, css fallback, etc.
  landmark?: Landmark;
  framePath?: string[];            // iframe/frame path if needed
};

export type Observation = {
  url: string;
  title: string;
  ts: number;
  urlChanged?: boolean;
  collectionSummary?: Array<{ id:string; count:number }>;
  focusedRole?: string;
};

export type ToolResult<T=unknown> =
  | { ok:true; data:T }
  | { ok:false; error:string; retryable:boolean; code?: string };

export type ToolCall =
  | { name:'getMiniPCD'; args:{ tabId:number } }
  | { name:'pcd_query'; args:{ tabId:number; kind?:'action'|'form'|'collection'; text?:string; topK?:number } }
  | { name:'getDetails'; args:{ tabId:number; ids:string[] } }
  | { name:'dom_click'; args:{ tabId:number; selector:RoleSelector } }
  | { name:'dom_type'; args:{ tabId:number; selector:RoleSelector; text:string; replace?:boolean } }
  | { name:'dom_select'; args:{ tabId:number; selector:RoleSelector; value:string } }
  | { name:'dom_submit'; args:{ tabId:number; selector:RoleSelector } }
  | { name:'dom_scroll'; args:{ tabId:number; y?:number; selector?:RoleSelector } }
  | { name:'dom_waitFor'; args:{ tabId:number; event:'urlChange'|'networkIdle'|'selector'|'text'; value?:string; timeoutMs?:number } }
  | { name:'dom_extract'; args:{ tabId:number; collectionId:string; fields:string[] } }
  | { name:'dom_findByText'; args:{ tabId:number; searchText:string; elementType?:'any'|'clickable'|'button'|'link'|'input'; exactMatch?:boolean } }
  | { name:'dom_getPageContent'; args:{ tabId:number; includeLinks?:boolean; includeClickables?:boolean } }
  | { name:'navigate'; args:{ url:string } }
  | { name:'tabs_open'; args:{ url:string } }
  | { name:'tabs_switch'; args:{ tabId:number } }
  | { name:'tabs_close'; args:{ tabId:number } }
  | { name:'capture_candidates'; args:{ tabId:number; ids:string[] } };

// Task State Types for LLM Controller
export type TaskStatus = 'created'|'planning'|'exploring'|'executing'|'awaiting_user'|'blocked'|'succeeded'|'failed'|'cancelled';

export type PlannedStep =
  | { kind:'tool'; call: ToolCall; description: string; risk?: 'low'|'medium'|'high' }
  | { kind:'confirm'; message: string }
  | { kind:'branch'; options: Array<{label:string; call: ToolCall}> };

export type StepRecord = { 
  step: PlannedStep; 
  result?: ToolResult|null; 
  observation?: Observation; 
  ts:number; 
  status:'ok'|'error'|'skipped' 
};

export type Plan = { 
  id: string; 
  steps: PlannedStep[]; 
  rationale?: string; 
  createdAt: number 
};

export type Task = {
  id: string;
  userId: string;
  goal: string;
  subgoal?: string;
  status: TaskStatus;
  progress: number;
  createdAt: number; 
  updatedAt: number;

  breadcrumbs: Array<{ url:string; title:string; labelFrom?:string; ts:number }>;
  siteGraph: { nodes:number; edges:number; recentUrls:string[] };
  plan?: Plan;
  history: StepRecord[];
  bindings: Record<string /*skillSlot*/, PCDActionDetail>;
};

// Skill System Types
export interface Skill<P = any> {
  name: string;
  params: any; // ZodSchema<P> - keeping as any for now to avoid zod import
  match(mini: MiniPCD, params: P): { requestedIds: string[]; confidence: number }[];
  bind(details: PCDActionDetail[], params: P): { binding: Record<string, PCDActionDetail>, confidence: number } | null;
  plan(binding: Record<string, PCDActionDetail>, params: P): PlannedStep[];
  effects?: Array<(obs: Observation) => boolean>;
}

// Site Graph Types
export type SiteGraphNode = {
  url: string;
  title: string;
  miniPCD?: MiniPCD;
  visitedAt: number;
  goalScore?: number;
};

export type SiteGraphEdge = {
  from: string; // URL
  to: string;   // URL
  action: MiniAction;
  confidence: number;
};

export type SiteGraph = {
  nodes: Map<string, SiteGraphNode>;
  edges: Map<string, SiteGraphEdge[]>;
};

// Communication Types (between background and content scripts)
export type ContentMessage = 
  | { type: 'getMiniPCD'; payload: {} }
  | { type: 'pcd_query'; payload: { kind?: 'action'|'form'|'collection'; text?: string; topK?: number } }
  | { type: 'getDetails'; payload: { ids: string[] } }
  | { type: 'dom_click'; payload: { selector: RoleSelector } }
  | { type: 'dom_type'; payload: { selector: RoleSelector; text: string; replace?: boolean } }
  | { type: 'dom_select'; payload: { selector: RoleSelector; value: string } }
  | { type: 'dom_submit'; payload: { selector: RoleSelector } }
  | { type: 'dom_scroll'; payload: { y?: number; selector?: RoleSelector } }
  | { type: 'dom_waitFor'; payload: { event: 'urlChange'|'networkIdle'|'selector'|'text'; value?: string; timeoutMs?: number } }
  | { type: 'dom_extract'; payload: { collectionId: string; fields: string[] } }
  | { type: 'capture_candidates'; payload: { ids: string[] } };

export type BackgroundMessage =
  | { type: 'task.create'; payload: { goal: string; userId: string } }
  | { type: 'task.update'; payload: { taskId: string; updates: Partial<Task> } }
  | { type: 'task.cancel'; payload: { taskId: string } }
  | { type: 'tabs.open'; payload: { url: string } }
  | { type: 'tabs.switch'; payload: { tabId: number } }
  | { type: 'tabs.close'; payload: { tabId: number } };

// Action Bundle for PCD Scout
export type ActionBundle = {
  selector: RoleSelector;
  altSelectors?: RoleSelector[];
  label: string;
  kind?: string;
  confidence: number;
  risk: 'low'|'medium'|'high';
  why: string;
};

// Constants
export const MINI_PCD_LIMITS = {
  MAX_ACTIONS: 30,
  MAX_FORMS: 20,
  MAX_COLLECTIONS: 20,
} as const;

export const PERFORMANCE_LIMITS = {
  MAX_CANDIDATES_PER_CYCLE: 200,
  MAX_SLICE_TIME_MS: 8,
  LONG_TASK_THRESHOLD_MS: 10,
} as const;
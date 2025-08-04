# Browser Copilot – Technical Specification

A compact, implementable spec for a Chrome-extension–based copilot that plans and executes multi-step tasks across arbitrary websites. The design separates **perception** (page capabilities) from **planning/execution** (skills + tools), keeps the model context small, and supports reversible exploration.

---

## 1) Scope & Goals

**Goal:** Enable a cloud-hosted LLM to complete user tasks by interacting with the user’s browser tabs via a Chrome extension. The LLM reasons over **MiniPCD** page summaries and calls **tools** implemented in the extension. Heavy DOM/state lives in the browser; the server orchestrates.

**Non-goals:** Continuous "computer-use" vision, site-specific scrapers, shipping raw HTML/DOM to the server.

---

## 2) High-Level Architecture

```
Server (LLM controller + skills + optional Scout)
  ↕  (bi-directional streaming – already implemented)
Background (singleton; orchestrator, site graph, tool adapters)
  ↕  (chrome.runtime Port RPC)
Content (per tab/frame; PCD builder, DSL resolver, DOM tools, scoring worker)
```

### Responsibilities by tier

**Content script (per tab/frame)**

* Build & maintain **MiniPCD** (bounded page capabilities).
* Resolve **role-based selector DSL** → live elements.
* Execute DOM tools (`click`, `type`, `select`, `submit`, `scroll`, `waitFor`, `extract`).
* Run event-driven **relevancy scoring** in a Web Worker.

**Background worker (singleton)**

* Orchestrate Plan→Act→Observe for each tab via a per-tab action queue.
* Maintain a lightweight **Site Graph**; run **beam-search exploration** (open child tabs, close losers).
* Provide **tool adapters** the server calls; capture **screenshots/crops** sparingly.

**Server**

* **LLM controller** (task state machine; ReAct-style loop) with task memory, plan, progress.
* **Reusable skills** (match → plan → effects) bound to MiniPCD.
* **Goal predicates** (detect goal pages from MiniPCD, not raw DOM).
* Optional **PCD Scout subagent** for read-only deep binding when ambiguous.
* Optional **server re-rank** of short context strings; site adapters (per-origin hints).
* **Workflows** callable by name from the frontend when the extension needs backend help.

---

## 3) Project Structure (single repo, shared TS types)

```
/src
  /background.ts                    # orchestrator, site graph, tool adapters, screenshots
  /content/index.ts                 # wiring, observers, SPA detection
  /content/pcd.ts                   # MiniPCD build/update, details, query
  /content/roleDsl.ts               # selector resolution, accessible names
  /content/tool-implementations.ts  # click/type/select/submit/scroll/waitFor/extract
  /content/worker.scoring.ts        # Web Worker scoring
/gensx
  /llm/controller.ts                # task state machine & ReAct loop
  /llm/skills.ts                    # reusable skills (match/plan/effects)
  /llm/goalPredicates.ts            # goal page detectors
  /llm/exploration.ts               # beam search policy (background executes)
  /llm/scout.ts                     # PCD Scout (read-only binding helper)
  /workflows.ts                     # named backend workflows callable from frontend (main agent entry point is called "copilot")
/shared/toolbox.ts                  # toolbox definitions
/shared/types.ts                    # shared TS interfaces & DSL types
/shared/constants.ts
```

---

## 4) Shared Types (single file)

`/src/shared/types.ts`

```ts
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
  | { name:'pcd.query'; args:{ tabId:number; kind?:'action'|'form'|'collection'; text?:string; topK?:number } }
  | { name:'getDetails'; args:{ tabId:number; ids:string[] } }
  | { name:'dom.click'; args:{ tabId:number; selector:RoleSelector } }
  | { name:'dom.type'; args:{ tabId:number; selector:RoleSelector; text:string; replace?:boolean } }
  | { name:'dom.select'; args:{ tabId:number; selector:RoleSelector; value:string } }
  | { name:'dom.submit'; args:{ tabId:number; selector:RoleSelector } }
  | { name:'dom.scroll'; args:{ tabId:number; y?:number; selector?:RoleSelector } }
  | { name:'dom.waitFor'; args:{ tabId:number; event:'urlChange'|'networkIdle'|'selector'|'text'; value?:string; timeoutMs?:number } }
  | { name:'dom.extract'; args:{ tabId:number; collectionId:string; fields:string[] } }
  | { name:'tabs.open'; args:{ url:string } }
  | { name:'tabs.switch'; args:{ tabId:number } }
  | { name:'tabs.close'; args:{ tabId:number } }
  | { name:'capture.candidates'; args:{ tabId:number; ids:string[] } };
```

---

## 5) MiniPCD Specification

**Purpose:** Compact summary of page affordances for planning and binding.

**Construction (content):**

* **Budgets:** cap to **30 actions / 20 forms / 20 collections**.
* **Discovery:** query common roles (buttons/links/forms). For each candidate:

  * **Accessible name**: `aria-label` → `aria-labelledby` → `<label for>` → `title/alt` → visible text.
  * **Landmark**: nearest of `main|header|nav|footer|aside`.
  * **Above-the-fold**: `top < viewportHeight * 1.2`.
  * **Kind/purpose**: heuristics from label + context (regex/keyword sets; no embeddings in-browser).
* **De-duplication:** cluster by `(origin+pathRoot, role, normalizedLabel)` for nav; keep best per cluster.
* **Templates:** for repeated grid/list buttons, create one **template** action with `appliesToCollectionId`.

**Updates:**

* `MutationObserver` marks nearby entries dirty; refresh in small batches.
* `IntersectionObserver` updates above-fold flags.
* Bump `ts` when URL or landmark content changes materially.

**Details (on demand):**

* For selected `ids[]`, compute primary **RoleSelector**, plus `altSelectors`, `framePath`, `landmark`. Cache until node removed or major reflow.

**Query API (content):**

* `pcd.query({kind?, text?, topK?}) → { id, label, kind?, landmark?, score }[]` (coarse scores; no selectors).

---

## 6) Selector DSL Resolution (content)

* **Role→CSS map**: buttons, links, textbox, combobox, checkbox, radio, menuitem, tab, etc.
* **Name matching**: exact/includes/regex against accessible name.
* **Scoping**: `withinLandmark` restricts search region.
* **Order**: role filter → state filter (pressed/disabled) → name match → `nth`.
* **Frames & shadow DOM**: follow `framePath`; recurse into **open** shadow roots. Cross-origin iframes require explicit switch.

---

## 7) Tool Surface (background adapters → content)

### Read tools

* `getMiniPCD(tabId) → MiniPCD`
* `pcd.query(tabId, {kind?, text?, topK?}) → { id, label, kind?, landmark?, score }[]`
* `getDetails(tabId, ids[]) → PCDActionDetail[]`

### Action tools

* `dom.click(tabId, selector)`
* `dom.type(tabId, selector, text, {replace?})` (set `.value`, dispatch `input`/`change`; retry once on re-mount)
* `dom.select(tabId, selector, value)`
* `dom.submit(tabId, selector)`
* `dom.scroll(tabId, {y}|{selector})`
* `dom.waitFor(tabId, {event, value?, timeoutMs?})` → `urlChange` | `networkIdle` | `selector` | `text`
* `dom.extract(tabId, {collectionId, fields[]})` → list of items (scoped by collection template)

### Tab tools

* `tabs.open(url) → { tabId }`
* `tabs.switch(tabId)`
* `tabs.close(tabId)`

### Capture (rare)

* `capture.candidates(tabId, ids[]) → { screenshotBase64, boxes:[{id,x,y,w,h,label}] }`

**Background guarantees**

* Per-tab **action queue**; no concurrent DOM actions on the same tab.
* On error: refresh MiniPCD, try **alt selector**, then re-bind; if still failing, propagate error.

---

## 8) Subagents / Services

### 8.1 Perception Service (content)

* Implements `pcd.mini`, `pcd.details`, `pcd.query` with hard caps, clustering, templates, versioning (`ts`).

### 8.2 Ranking Service (content Web Worker)

* Input: subgoal string + candidate context strings.
* Deterministic scoring (BM25/substring/fuzzy + landmark/above-fold/path + dedupe).
* Event-driven: only on **subgoal change**, **navigation**, or **after our action**.
* Budgets: ≤200 candidates per cycle; ≤8 ms per slice (`requestIdleCallback`); pause when hidden.

### 8.3 Binding Service (content)

* Implements `dom.*` tools. Re-resolve selectors at call-time; try alt selectors; small `Observation` per step.

### 8.4 Exploration Service (background)

* **Site Graph**: nodes = page summaries; edges = candidate nav actions.
* **Beam search**: beam 3–5, depth 3–4. Open in new tabs, fetch MiniPCDs, test **goal predicates**, close losers; switch to the winner.

### 8.5 PCD Scout (server; optional LLM helper)

* Read-only helper for deep binding when local scoring is ambiguous/busy pages.
* Allowed tools: `getMiniPCD`, `pcd.query`, `getDetails`, `capture.candidates`.
* Output: **ActionBundle** (≤5) with `{selector, altSelectors, label, kind, confidence, risk, why}`.
* Planner binds to top candidate; keeps others as fallbacks (disposable after use).

---

## 9) LLM Controller: Task State & Loop (server)

### Task model

```ts
type TaskStatus = 'created'|'planning'|'exploring'|'executing'|'awaiting_user'|'blocked'|'succeeded'|'failed'|'cancelled';

type PlannedStep =
  | { kind:'tool'; call: ToolCall; description: string; risk?: 'low'|'medium'|'high' }
  | { kind:'confirm'; message: string }
  | { kind:'branch'; options: Array<{label:string; call: ToolCall}> };

type StepRecord = { step: PlannedStep; result?: ToolResult|null; observation?: Observation; ts:number; status:'ok'|'error'|'skipped' };

type Plan = { id: string; steps: PlannedStep[]; rationale?: string; createdAt: number };

type Task = {
  id: string;
  userId: string;
  goal: string;
  subgoal?: string;
  status: TaskStatus;
  progress: number;
  createdAt: number; updatedAt: number;

  breadcrumbs: Array<{ url:string; title:string; labelFrom?:string; ts:number }>;
  siteGraph: { nodes:number; edges:number; recentUrls:string[] };
  plan?: Plan;
  history: StepRecord[];
  bindings: Record<string /*skillSlot*/, PCDActionDetail>;
};
```

### Controller loop

1. **Bootstrap**: `getMiniPCD(tabId)`; derive initial `subgoal` from the user **goal**.
2. **Try skills**: `skills.match(mini, params)`; if ambiguous/weak → invoke **PCD Scout**; bind slots.
3. **Plan**: produce 2–5 deterministic `tool` steps; insert `confirm` if any step is high-risk.
4. **Execute**: send each ToolCall; record `StepRecord`; update `breadcrumbs`, `progress`; on failure, refresh MiniPCD → alt selector → re-bind → otherwise **explore**.
5. **Explore**: ask background to beam-search; when a **goal predicate** hits on a child tab, switch and resume skills.
6. **Progress**: fixed plan → `completed/total`; exploration → heuristic (depth + unique nodes), jump ≥0.8 on goal page; finish at 1.0 when effects verify.
7. **Stop**: `succeeded` / `failed` / `awaiting_user` / `cancelled`.

---

## 10) Reusable Skills & Goal Predicates (server)

**Skill interface**

```ts
interface Skill<P> {
  name: string;
  params: ZodSchema<P>;
  match(mini: MiniPCD, params: P): { requestedIds: string[]; confidence: number }[];
  bind(details: PCDActionDetail[], params: P): { binding: Record<string, PCDActionDetail>, confidence: number } | null;
  plan(binding: Record<string, PCDActionDetail>, params: P): PlannedStep[];
  effects?: Array<(obs: Observation) => boolean>;
}
```

**Examples**: `LoginSkill`, `SearchSkill`, `FillFormSkill(schema)`, `PaginateSkill`, `NavigateByMenuSkill`, `CheckoutSkill`.

**Goal predicates**: presence of forms with `purpose ∈ {'billing','payment_method','upload','schedule','checkout'}`; actions with `kind ∈ {'download_invoice','confirm','book','apply'}`; collections with expected fields (e.g., invoices: date, amount, download).

---

## 11) Performance & Power Constraints (front-end)

* Event-driven scoring only on **subgoal change**, **navigation** (history API or landmark/title swap), and **after our action**.
* Caps: ≤200 candidates per scoring cycle; MiniPCD caps: 30 actions / 20 forms / 20 collections.
* Time slicing: `requestIdleCallback` ≤8 ms/slice; pause when `document.hidden`.
* Long tasks: detect and halve budgets for \~10s after a long task.
* Embeddings: off by default in-browser; use server re-rank on short context strings for tie-breaks.

---

## 12) Safety & Privacy

* **Allowlist**: background enforces domain allowlist for write actions.
* **Two-phase confirm**: required for irreversible steps (checkout, delete).
* **Data minimization**: never send raw DOM/HTML; only MiniPCD, labels, IDs, Action Bundles.
* **Secrets**: fields like password/card require explicit user grant.

---

## 13) Telemetry & Replay

* **Background per step**: ToolCall, selector used, timings, ToolResult, Observation, MiniPCD `ts`, optional thumbnail hash.
* **Server task history**: append-only `StepRecord[]` for replay/debugging.
* **Metrics**: MiniPCD build/update time; scoring time; action success/retries; screenshot rate; exploration breadth/depth.

---

## 14) Edge Cases & Policies

* **React/Vue SPAs**: re-resolve selectors each action; detect nav (history API + landmark/title changes); handle portals/modals; treat virtualized lists as collection templates; scroll to materialize before binding.
* **Shadow DOM**: traverse open roots; closed shadows are opaque (may need site adapter).
* **Iframes**: include `framePath` in details; require explicit frame switch for cross-origin frames.
* **ARIA-poor pages**: prefer text locators; when tied/ambiguous, use `capture.candidates` (1 full + ≤3 crops) and a VLM; CSS fallback as last resort.

---

## 15) Example End-to-End Slice

**Goal:** “Download last month’s invoice.”

1. Server: `getMiniPCD(tab)` → MiniPCD.
2. Server: `pcd.query({ kind:'action|form', text:'invoice|billing|statement', topK:20 })`.
3. Ambiguity detected → **PCD Scout** probes and returns ActionBundle with `Invoices` link (confidence 0.86).
4. Server plans: click `Invoices` → wait `urlChange` → extract `invoices` collection → click `Download` on item matching last month.
5. Background executes; content resolves selectors; observations flow back.
6. Effects verify (collection populated + download detected) → Task `succeeded`.

---

**This document is the implementable spec.** Frontend implements tools and PCD; background orchestrates and explores; server plans with skills and optionally calls the Scout for deep binding—all with bounded, minimal context passed to the LLM core.

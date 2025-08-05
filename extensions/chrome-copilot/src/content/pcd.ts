/**
 * MiniPCD (Page Capability Description) Implementation
 * Constructs and maintains compact summaries of page affordances for planning and binding
 */

import { 
  MiniPCD, 
  MiniAction, 
  MiniForm, 
  MiniCollection, 
  PCDActionDetail, 
  RoleSelector, 
  Landmark 
} from '../shared/types';
import { 
  MINI_PCD_LIMITS, 
  PERFORMANCE_LIMITS, 
  SEMANTIC_PATTERNS, 
  FORM_PURPOSE_PATTERNS, 
  COLLECTION_PATTERNS, 
  LANDMARK_SELECTORS 
} from '../shared/constants';
import { resolveRoleSelector } from './roleDsl';

/**
 * Global MiniPCD state
 */
let currentMiniPCD: MiniPCD | null = null;
let detailsCache = new Map<string, PCDActionDetail>();
let lastUpdateTimestamp = 0;

// Collection element mapping (don't rely on DOM attributes that websites might strip)
let collectionElementMap = new Map<string, HTMLElement>();

// Observers for automatic updates
let mutationObserver: MutationObserver | null = null;
let intersectionObserver: IntersectionObserver | null = null;

/**
 * Initialize MiniPCD system with observers
 */
export function initializePCD(): void {
  console.log('🎯 Initializing MiniPCD system...');
  
  // Build initial MiniPCD
  buildMiniPCD();
  
  // Set up mutation observer for content changes
  mutationObserver = new MutationObserver((mutations) => {
    let shouldUpdate = false;
    
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        // Check if added/removed nodes are significant
        const significantNodes = [...mutation.addedNodes, ...mutation.removedNodes]
          .filter(node => node.nodeType === Node.ELEMENT_NODE)
          .some(node => {
            const element = node as Element;
            return element.matches('button, a, form, input, select, textarea, [role], [onclick]');
          });
        
        if (significantNodes) {
          shouldUpdate = true;
          break;
        }
      } else if (mutation.type === 'attributes') {
        // Check for significant attribute changes
        const target = mutation.target as Element;
        if (target.matches('button, a, form, input, select, textarea, [role]')) {
          shouldUpdate = true;
          break;
        }
      }
    }
    
    if (shouldUpdate) {
      // Debounce updates
      setTimeout(() => updateMiniPCD(), 100);
    }
  });
  
  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'id', 'role', 'aria-label', 'disabled', 'hidden']
  });
  
  // Set up intersection observer for above-fold tracking
  intersectionObserver = new IntersectionObserver((entries) => {
    let needsUpdate = false;
    
    for (const entry of entries) {
      const element = entry.target as HTMLElement;
      const id = element.dataset.pcdId;
      
      if (id && currentMiniPCD) {
        const action = currentMiniPCD.actions.find(a => a.id === id);
        if (action) {
          const wasAboveFold = action.aboveFold;
          const isAboveFold = entry.isIntersecting;
          
          if (wasAboveFold !== isAboveFold) {
            action.aboveFold = isAboveFold;
            needsUpdate = true;
          }
        }
      }
    }
    
    if (needsUpdate) {
      updateTimestamp();
    }
  }, {
    root: null,
    rootMargin: `${window.innerHeight * 0.2}px 0px 0px 0px`, // 20% buffer
    threshold: 0.1
  });
  
  console.log('✅ MiniPCD system initialized');
}

/**
 * Build complete MiniPCD from current DOM state
 */
export function buildMiniPCD(): MiniPCD {
  const startTime = performance.now();
  console.log('🔄 Building MiniPCD...');
  
  const url = window.location.href;
  const origin = window.location.origin;
  const title = document.title;
  const ts = Date.now();
  
  // Detect login state (heuristic)
  const loginState = detectLoginState();
  
  // Find landmarks
  const landmarks = findLandmarks();
  
  // Build actions, forms, and collections with limits
  const actions = buildActions();
  const forms = buildForms();
  const collections = buildCollections();
  
  // Calculate metrics
  const metrics = calculateMetrics();
  
  currentMiniPCD = {
    url,
    origin,
    title,
    loginState,
    ts,
    landmarks,
    actions: actions.slice(0, MINI_PCD_LIMITS.MAX_ACTIONS),
    forms: forms.slice(0, MINI_PCD_LIMITS.MAX_FORMS),
    collections: collections.slice(0, MINI_PCD_LIMITS.MAX_COLLECTIONS),
    metrics
  };
  
  // Clear caches on rebuild
  detailsCache.clear();
  collectionElementMap.clear();
  
  const buildTime = performance.now() - startTime;
  console.log(`✅ MiniPCD built in ${buildTime.toFixed(1)}ms:`, {
    actions: currentMiniPCD.actions.length,
    forms: currentMiniPCD.forms.length,
    collections: currentMiniPCD.collections.length,
    landmarks: currentMiniPCD.landmarks.length
  });

  // Debug: Log detected collections
  console.log('🔍 Detected collections:', currentMiniPCD.collections.map(c => ({
    id: c.id,
    name: c.name,
    itemFields: c.itemFields,
    approxCount: c.approxCount,
    landmark: c.landmark
  })));
  
  lastUpdateTimestamp = ts;
  return currentMiniPCD;
}

/**
 * Update MiniPCD incrementally
 */
function updateMiniPCD(): void {
  if (!currentMiniPCD) {
    buildMiniPCD();
    return;
  }
  
  // For now, do full rebuild - could optimize later for incremental updates
  buildMiniPCD();
}

/**
 * Update timestamp only (for minor changes)
 */
function updateTimestamp(): void {
  if (currentMiniPCD) {
    currentMiniPCD.ts = Date.now();
    lastUpdateTimestamp = currentMiniPCD.ts;
  }
}

/**
 * Get current MiniPCD
 */
export function getMiniPCD(): MiniPCD {
  if (!currentMiniPCD || isStale()) {
    return buildMiniPCD();
  }
  return currentMiniPCD;
}

/**
 * Query MiniPCD for specific elements
 */
export function queryPCD(options: {
  kind?: 'action'|'form'|'collection';
  text?: string;
  topK?: number;
}): Array<{ id: string; label: string; kind?: string; landmark?: Landmark; score: number }> {
  const pcd = getMiniPCD();
  const results: Array<{ id: string; label: string; kind?: string; landmark?: Landmark; score: number }> = [];
  const searchText = options.text?.toLowerCase() || '';
  
  // Search actions
  if (!options.kind || options.kind === 'action') {
    for (const action of pcd.actions) {
      const score = calculateRelevanceScore(action.label, action.kind, searchText);
      if (score > 0) {
        results.push({
          id: action.id,
          label: action.label,
          kind: action.kind,
          landmark: action.landmark,
          score
        });
      }
    }
  }
  
  // Search forms
  if (!options.kind || options.kind === 'form') {
    for (const form of pcd.forms) {
      const formLabel = form.purpose || `Form with ${form.fieldSummaries.length} fields`;
      const score = calculateRelevanceScore(formLabel, form.purpose, searchText);
      if (score > 0) {
        results.push({
          id: form.id,
          label: formLabel,
          kind: form.purpose,
          landmark: form.landmark,
          score
        });
      }
    }
  }
  
  // Search collections
  if (!options.kind || options.kind === 'collection') {
    for (const collection of pcd.collections) {
      const score = calculateRelevanceScore(collection.name, undefined, searchText);
      if (score > 0) {
        results.push({
          id: collection.id,
          label: collection.name,
          landmark: collection.landmark,
          score
        });
      }
    }
  }
  
  // Sort by score and return top K
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, options.topK || 10);
}

/**
 * Get collection element by ID
 */
export function getCollectionElement(collectionId: string): HTMLElement | null {
  return collectionElementMap.get(collectionId) || null;
}

/**
 * Get detailed selectors for specific IDs
 */
export function getDetails(ids: string[]): PCDActionDetail[] {
  const results: PCDActionDetail[] = [];
  
  for (const id of ids) {
    // Check cache first
    if (detailsCache.has(id)) {
      results.push(detailsCache.get(id)!);
      continue;
    }
    
    // Find element and generate selectors
    const element = document.querySelector(`[data-pcd-id="${id}"]`) as HTMLElement;
    if (!element) {
      console.warn(`Element with PCD ID ${id} not found`);
      continue;
    }
    
    const detail = generateActionDetail(id, element);
    if (detail) {
      detailsCache.set(id, detail);
      results.push(detail);
    }
  }
  
  return results;
}

/**
 * Check if MiniPCD is stale
 */
function isStale(): boolean {
  if (!currentMiniPCD) return true;
  
  // Check for URL changes
  if (currentMiniPCD.url !== window.location.href) return true;
  
  // Check for title changes
  if (currentMiniPCD.title !== document.title) return true;
  
  // Check if too much time has passed
  const maxAge = 30000; // 30 seconds
  return (Date.now() - lastUpdateTimestamp) > maxAge;
}

/**
 * Detect login state based on page content
 */
function detectLoginState(): 'unknown'|'in'|'out' {
  // Look for logout/account indicators
  const logoutElements = document.querySelectorAll('a, button');
  for (const element of logoutElements) {
    const text = element.textContent?.toLowerCase() || '';
    if (text.includes('logout') || text.includes('sign out') || text.includes('account')) {
      return 'in';
    }
  }
  
  // Look for login forms
  const loginForms = document.querySelectorAll('form');
  for (const form of loginForms) {
    const inputs = form.querySelectorAll('input[type="password"]');
    if (inputs.length > 0) {
      return 'out';
    }
  }
  
  return 'unknown';
}

/**
 * Find page landmarks
 */
function findLandmarks(): Landmark[] {
  const landmarks: Landmark[] = [];
  
  for (const [landmark, selector] of Object.entries(LANDMARK_SELECTORS)) {
    if (document.querySelector(selector)) {
      landmarks.push(landmark as Landmark);
    }
  }
  
  return landmarks;
}

/**
 * Build actions list from interactive elements
 */
function buildActions(): MiniAction[] {
  const actions: MiniAction[] = [];
  const seenClusters = new Set<string>();
  let idCounter = 0;
  
  // Find buttons
  const buttons = document.querySelectorAll('button, input[type="button"], input[type="submit"], [role="button"]');
  for (const button of buttons) {
    const element = button as HTMLElement;
    if (shouldSkipElement(element)) continue;
    
    const action = createMiniAction(element, idCounter++, 'button');
    if (action && shouldIncludeAction(action, seenClusters)) {
      actions.push(action);
      element.dataset.pcdId = action.id;
      
      // Observe for above-fold changes
      if (intersectionObserver) {
        intersectionObserver.observe(element);
      }
    }
  }
  
  // Find links
  const links = document.querySelectorAll('a[href]');
  for (const link of links) {
    const element = link as HTMLElement;
    if (shouldSkipElement(element)) continue;
    
    const action = createMiniAction(element, idCounter++, 'link');
    if (action && shouldIncludeAction(action, seenClusters)) {
      actions.push(action);
      element.dataset.pcdId = action.id;
      
      if (intersectionObserver) {
        intersectionObserver.observe(element);
      }
    }
  }
  
  // Find other interactive elements
  const others = document.querySelectorAll('[role="menuitem"], [role="tab"], input[type="checkbox"], input[type="radio"]');
  for (const other of others) {
    const element = other as HTMLElement;
    if (shouldSkipElement(element)) continue;
    
    const role = element.getAttribute('role') || 
                 (element.tagName === 'INPUT' ? (element as HTMLInputElement).type : 'other');
    const action = createMiniAction(element, idCounter++, role as any);
    if (action && shouldIncludeAction(action, seenClusters)) {
      actions.push(action);
      element.dataset.pcdId = action.id;
      
      if (intersectionObserver) {
        intersectionObserver.observe(element);
      }
    }
  }
  
  return actions;
}

/**
 * Build forms list
 */
function buildForms(): MiniForm[] {
  const forms: MiniForm[] = [];
  let idCounter = 0;
  
  const formElements = document.querySelectorAll('form');
  for (const form of formElements) {
    if (shouldSkipElement(form as HTMLElement)) continue;
    
    const miniForm = createMiniForm(form, idCounter++);
    if (miniForm) {
      forms.push(miniForm);
      (form as HTMLElement).dataset.pcdId = miniForm.id;
    }
  }
  
  return forms;
}

/**
 * Build collections list (grids, lists, etc.)
 */
function buildCollections(): MiniCollection[] {
  const collections: MiniCollection[] = [];
  let idCounter = 0;
  
  // Look for traditional list/grid patterns
  const traditionalCandidates = document.querySelectorAll(
    'ul, ol, table, [role="grid"], [role="list"], .grid, .list, .items, .results'
  );
  
  for (const candidate of traditionalCandidates) {
    const element = candidate as HTMLElement;
    if (shouldSkipElement(element)) continue;
    
    const collection = createMiniCollection(element, idCounter++);
    if (collection) {
      collections.push(collection);
      collectionElementMap.set(collection.id, element);
    }
  }
  
  // Look for modern card-based collections (React components, etc.)
  const modernCandidates = findModernCollections();
  console.log(`🔍 Found ${modernCandidates.length} modern collection candidates`);
  
  for (const candidate of modernCandidates) {
    if (shouldSkipElement(candidate)) continue;
    
    const collection = createMiniCollection(candidate, idCounter++);
    if (collection) {
      console.log(`✅ Created modern collection:`, {
        id: collection.id,
        name: collection.name,
        itemFields: collection.itemFields,
        approxCount: collection.approxCount,
        elementTag: candidate.tagName,
        elementClasses: candidate.className
      });
      collections.push(collection);
      collectionElementMap.set(collection.id, candidate);
    }
  }
  
  return collections;
}

/**
 * Create MiniAction from element
 */
function createMiniAction(element: HTMLElement, index: number, role: string): MiniAction | null {
  const label = getAccessibleName(element);
  if (!label || label.length > MINI_PCD_LIMITS.MAX_LABEL_LENGTH) return null;
  
  const id = `action_${index}`;
  const landmark = findNearestLandmark(element);
  const aboveFold = isAboveFold(element);
  const kind = inferSemanticKind(label);
  const clusterId = generateClusterId(role, label);
  
  return {
    id,
    label: label.substring(0, MINI_PCD_LIMITS.MAX_LABEL_LENGTH),
    role: role as any,
    kind,
    landmark,
    aboveFold,
    clusterId
  };
}

/**
 * Create MiniForm from form element
 */
function createMiniForm(form: HTMLFormElement, index: number): MiniForm | null {
  const id = `form_${index}`;
  const landmark = findNearestLandmark(form);
  
  // Analyze form fields
  const fieldSummaries = [];
  const inputs = form.querySelectorAll('input, textarea, select');
  
  for (const input of inputs) {
    const element = input as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    const type = element.tagName === 'SELECT' ? 'select' : 
                 element.tagName === 'TEXTAREA' ? 'textarea' : 
                 (element as HTMLInputElement).type || 'text';
    
    if (type === 'hidden' || type === 'submit' || type === 'button') continue;
    
    const label = getFieldLabel(element);
    const required = element.hasAttribute('required');
    const name = element.getAttribute('name') || undefined;
    
    fieldSummaries.push({ name, label, type, required });
    
    if (fieldSummaries.length >= MINI_PCD_LIMITS.MAX_FORM_FIELDS) break;
  }
  
  if (fieldSummaries.length === 0) return null;
  
  // Find submit button
  const submitButton = form.querySelector('button[type="submit"], input[type="submit"], button:not([type])');
  const submitLabel = submitButton ? getAccessibleName(submitButton as HTMLElement) : undefined;
  
  // Infer form purpose
  const purpose = inferFormPurpose(form, fieldSummaries, submitLabel);
  
  return {
    id,
    purpose,
    landmark,
    fieldSummaries,
    submitLabel
  };
}

/**
 * Create MiniCollection from element
 */
function createMiniCollection(element: HTMLElement, index: number): MiniCollection | null {
  const id = `collection_${index}`;
  const name = inferCollectionName(element);
  const landmark = findNearestLandmark(element);
  
  // Analyze collection structure
  const items = element.children;
  if (items.length < 2) return null; // Need at least 2 items to be a collection
  
  // Analyze first few items to infer fields
  const itemFields = inferCollectionFields(Array.from(items).slice(0, 3));
  if (itemFields.length === 0) return null;
  
  return {
    id,
    name,
    itemFields,
    landmark,
    approxCount: items.length
  };
}

/**
 * Generate ActionDetail for an element
 */
function generateActionDetail(id: string, element: HTMLElement): PCDActionDetail | null {
  try {
    const primarySelector = createRoleSelector(element);
    const altSelectors = createAlternativeSelectors(element);
    const landmark = findNearestLandmark(element);
    const framePath = getFramePath(element);
    
    return {
      id,
      selector: primarySelector,
      altSelectors,
      landmark,
      framePath
    };
  } catch (error) {
    console.warn(`Failed to generate ActionDetail for ${id}:`, error);
    return null;
  }
}

/**
 * Create primary role-based selector for element
 */
function createRoleSelector(element: HTMLElement): RoleSelector {
  const role = element.getAttribute('role') || 
               element.tagName.toLowerCase();
  
  const name = getAccessibleName(element);
  const landmark = findNearestLandmark(element);
  
  // Try role-based selector first
  if (role && name) {
    return {
      kind: 'role',
      role,
      name,
      nameMode: 'exact',
      withinLandmark: landmark
    };
  }
  
  // Fallback to text selector
  if (name) {
    return {
      kind: 'text',
      text: name,
      withinLandmark: landmark
    };
  }
  
  // Last resort: CSS selector
  return {
    kind: 'css',
    css: generateCSSSelector(element)
  };
}

/**
 * Create alternative selectors
 */
function createAlternativeSelectors(element: HTMLElement): RoleSelector[] {
  const alternatives: RoleSelector[] = [];
  
  const name = getAccessibleName(element);
  const landmark = findNearestLandmark(element);
  
  // Text-based selector if we have name
  if (name) {
    alternatives.push({
      kind: 'text',
      text: name,
      withinLandmark: landmark
    });
    
    // Partial text match
    if (name.length > 10) {
      alternatives.push({
        kind: 'text',
        text: name.substring(0, 20),
        withinLandmark: landmark
      });
    }
  }
  
  // CSS selector as fallback
  alternatives.push({
    kind: 'css',
    css: generateCSSSelector(element)
  });
  
  return alternatives;
}

// Helper functions (implementation details)

function shouldSkipElement(element: HTMLElement): boolean {
  return element.style.display === 'none' || 
         element.style.visibility === 'hidden' ||
         element.hasAttribute('hidden') ||
         element.offsetWidth === 0 ||
         element.offsetHeight === 0;
}

function shouldIncludeAction(action: MiniAction, seenClusters: Set<string>): boolean {
  if (!action.label.trim()) return false;
  
  // Deduplication by cluster ID
  if (action.clusterId && seenClusters.has(action.clusterId)) {
    return false;
  }
  
  if (action.clusterId) {
    seenClusters.add(action.clusterId);
  }
  
  return true;
}

function getAccessibleName(element: HTMLElement): string {
  // Try aria-label first
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel.trim();
  
  // Try aria-labelledby
  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const labelElement = document.getElementById(labelledBy);
    if (labelElement) return labelElement.textContent?.trim() || '';
  }
  
  // Try associated label
  const id = element.getAttribute('id');
  if (id) {
    const label = document.querySelector(`label[for="${id}"]`);
    if (label) return label.textContent?.trim() || '';
  }
  
  // Try title
  const title = element.getAttribute('title');
  if (title) return title.trim();
  
  // Try alt for images
  const alt = element.getAttribute('alt');
  if (alt) return alt.trim();
  
  // Try text content
  const textContent = element.textContent?.trim() || '';
  if (textContent && textContent.length < 100) return textContent;
  
  // Try placeholder
  const placeholder = element.getAttribute('placeholder');
  if (placeholder) return placeholder.trim();
  
  return '';
}

function getFieldLabel(element: HTMLElement): string {
  const label = getAccessibleName(element);
  if (label) return label;
  
  // Try name attribute
  const name = element.getAttribute('name');
  if (name) return name.replace(/[_-]/g, ' ').toLowerCase();
  
  return 'field';
}

function findNearestLandmark(element: HTMLElement): Landmark | undefined {
  let current = element.parentElement;
  
  while (current) {
    for (const [landmark, selector] of Object.entries(LANDMARK_SELECTORS)) {
      if (current.matches(selector)) {
        return landmark as Landmark;
      }
    }
    current = current.parentElement;
  }
  
  return undefined;
}

function isAboveFold(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  return rect.top < (viewportHeight * PERFORMANCE_LIMITS.VIEWPORT_BUFFER_FACTOR);
}

function inferSemanticKind(label: string): string | undefined {
  const lowerLabel = label.toLowerCase();
  
  for (const [kind, pattern] of Object.entries(SEMANTIC_PATTERNS)) {
    if (pattern.test(lowerLabel)) {
      return kind;
    }
  }
  
  return undefined;
}

function generateClusterId(role: string, label: string): string {
  const normalizedLabel = label.toLowerCase().replace(/\s+/g, ' ').trim();
  const pathRoot = window.location.pathname.split('/')[1] || '';
  return `${window.location.origin}:${pathRoot}:${role}:${normalizedLabel}`;
}

function inferFormPurpose(
  form: HTMLFormElement, 
  fields: Array<{name?: string; label: string; type: string}>,
  submitLabel?: string
): string | undefined {
  const allText = [
    ...fields.map(f => f.label + ' ' + (f.name || '')),
    submitLabel || ''
  ].join(' ').toLowerCase();
  
  for (const [purpose, pattern] of Object.entries(FORM_PURPOSE_PATTERNS)) {
    if (pattern.test(allText)) {
      return purpose;
    }
  }
  
  return undefined;
}

function inferCollectionName(element: HTMLElement): string {
  // Try data attributes first
  const dataName = element.dataset.name || element.dataset.collection;
  if (dataName) return dataName;
  
  // Look at the content of clickable items to infer collection purpose
  const clickableItems = element.querySelectorAll('a, button, [onclick], [role="button"]');
  if (clickableItems.length >= 3) {
    // Analyze common patterns in clickable text
    const texts = Array.from(clickableItems)
      .map(item => (item.textContent || '').trim().toLowerCase())
      .filter(text => text.length > 0);
    
    // Look for common collection types based on content
    const hasProjectTerms = texts.some(text => /project|repo|workspace|app/.test(text));
    const hasProductTerms = texts.some(text => /product|item|buy|price|\$/.test(text));
    const hasPostTerms = texts.some(text => /post|article|read|comment/.test(text));
    const hasUserTerms = texts.some(text => /user|profile|member|contact/.test(text));
    const hasFileTerms = texts.some(text => /file|document|download|upload/.test(text));
    
    if (hasProjectTerms) return 'projects';
    if (hasProductTerms) return 'products';
    if (hasPostTerms) return 'posts';
    if (hasUserTerms) return 'users';
    if (hasFileTerms) return 'files';
  }
  
  // Try class names for semantic hints
  const className = element.className.toLowerCase();
  for (const [name, pattern] of Object.entries(COLLECTION_PATTERNS)) {
    if (pattern.test(className)) {
      return name;
    }
  }
  
  // Look for nearby headings
  const heading = element.querySelector('h1, h2, h3, h4, h5, h6') ||
                  element.previousElementSibling?.matches('h1, h2, h3, h4, h5, h6') ? 
                  element.previousElementSibling : null;
  
  if (heading) {
    const headingText = heading.textContent?.trim();
    if (headingText && headingText.length < 50) {
      return headingText.toLowerCase();
    }
  }
  
  // Default based on interaction type
  return 'clickable-items';
}

/**
 * Find interaction-based collections - areas with repeated clickable/actionable content
 */
function findModernCollections(): HTMLElement[] {
  const candidates: HTMLElement[] = [];
  
  // Find all clickable elements on the page
  const explicitClickable = Array.from(document.querySelectorAll('a, button, [onclick], [role="button"], [tabindex]')) as HTMLElement[];
  
  // Find divs/spans with cursor: pointer (common in React apps) 
  // Target likely containers rather than checking every element
  const cursorClickable = Array.from(document.querySelectorAll('div, span, li, section, article')).filter(el => {
    const element = el as HTMLElement;
    const computedStyle = window.getComputedStyle(element);
    return computedStyle.cursor === 'pointer' && 
           !element.matches('a, button') && // Avoid duplicates
           element.textContent && element.textContent.trim().length > 0; // Has content
  }) as HTMLElement[];
  
  const clickableElements = [...explicitClickable, ...cursorClickable];
  console.log(`🔍 Found ${explicitClickable.length} explicit clickable + ${cursorClickable.length} cursor:pointer elements = ${clickableElements.length} total`);
  
  // Group clickable elements by their visual proximity and content similarity
  const clusters = clusterClickableElements(clickableElements);
  
  // For each cluster, find the container that encompasses them
  for (const cluster of clusters) {
    if (cluster.length < 3) continue; // Need at least 3 similar clickable items
    
    const container = findCommonContainer(cluster);
    if (container && !candidates.includes(container)) {
      console.log(`🎯 Found collection container with ${cluster.length} clickable items:`, {
        containerTag: container.tagName,
        containerClasses: container.className,
        childCount: container.children.length,
        clickableItemsInCluster: cluster.length
      });
      candidates.push(container);
    }
  }
  
  return candidates;
}

/**
 * Cluster clickable elements based on visual layout and content patterns
 */
function clusterClickableElements(elements: HTMLElement[]): HTMLElement[][] {
  const clusters: HTMLElement[][] = [];
  const used = new Set<HTMLElement>();
  
  for (const element of elements) {
    if (used.has(element)) continue;
    
    const cluster = [element];
    used.add(element);
    
    const elementRect = element.getBoundingClientRect();
    const elementContent = getElementContent(element);
    
    // Find similar elements nearby
    for (const other of elements) {
      if (used.has(other) || other === element) continue;
      
      const otherRect = other.getBoundingClientRect();
      const otherContent = getElementContent(other);
      
      // Check if elements are similar and reasonably positioned
      if (areElementsSimilar(elementContent, otherContent) && 
          areElementsNearby(elementRect, otherRect)) {
        cluster.push(other);
        used.add(other);
      }
    }
    
    clusters.push(cluster);
  }
  
  return clusters.filter(cluster => cluster.length >= 3);
}

/**
 * Extract interaction-relevant content from an element
 */
function getElementContent(element: HTMLElement): {
  text: string;
  hasImage: boolean;
  hasIcon: boolean;
  tagName: string;
  role: string;
  size: { width: number; height: number };
} {
  const rect = element.getBoundingClientRect();
  const text = (element.textContent || '').trim().substring(0, 100);
  
  return {
    text,
    hasImage: element.querySelector('img') !== null,
    hasIcon: element.querySelector('svg, i, [class*="icon"]') !== null,
    tagName: element.tagName,
    role: element.getAttribute('role') || element.tagName.toLowerCase(),
    size: { width: Math.round(rect.width), height: Math.round(rect.height) }
  };
}

/**
 * Check if two elements are similar for clustering purposes
 */
function areElementsSimilar(content1: any, content2: any): boolean {
  // Same role/interaction type
  if (content1.role !== content2.role) return false;
  
  // Similar sizes (within 50% difference)
  const sizeDiff = Math.abs(content1.size.width - content2.size.width) / Math.max(content1.size.width, content2.size.width);
  if (sizeDiff > 0.5) return false;
  
  // Similar content patterns
  const bothHaveImages = content1.hasImage === content2.hasImage;
  const bothHaveIcons = content1.hasIcon === content2.hasIcon;
  
  // Both have text of reasonable length or both are primarily visual
  const bothHaveText = (content1.text.length > 5) === (content2.text.length > 5);
  
  return bothHaveImages && bothHaveIcons && bothHaveText;
}

/**
 * Check if elements are positioned nearby (same row/column or grid pattern)
 */
function areElementsNearby(rect1: DOMRect, rect2: DOMRect): boolean {
  const maxDistance = 500; // Max pixels apart
  
  // Calculate distance between centers
  const centerX1 = rect1.left + rect1.width / 2;
  const centerY1 = rect1.top + rect1.height / 2;
  const centerX2 = rect2.left + rect2.width / 2;
  const centerY2 = rect2.top + rect2.height / 2;
  
  const distance = Math.sqrt(Math.pow(centerX2 - centerX1, 2) + Math.pow(centerY2 - centerY1, 2));
  
  return distance <= maxDistance;
}

/**
 * Find the smallest container that encompasses all elements in a cluster
 */
function findCommonContainer(elements: HTMLElement[]): HTMLElement | null {
  if (elements.length === 0) return null;
  
  // Start with the first element's parent
  let container = elements[0].parentElement;
  
  // Walk up until we find a container that contains all elements
  while (container) {
    const containsAll = elements.every(element => container!.contains(element));
    if (containsAll) {
      return container;
    }
    container = container.parentElement;
  }
  
  return document.body; // Fallback to body
}

function inferCollectionFields(items: Element[]): string[] {
  const fields = new Set<string>();
  
  for (const item of items) {
    // Look for links
    const links = item.querySelectorAll('a[href]');
    if (links.length > 0) fields.add('link');
    
    // Look for images
    const images = item.querySelectorAll('img');
    if (images.length > 0) fields.add('image');
    
    // Look for headings/titles
    const headings = item.querySelectorAll('h1, h2, h3, h4, h5, h6');
    if (headings.length > 0) fields.add('title');
    
    // Look for paragraphs/descriptions
    const paragraphs = item.querySelectorAll('p');
    if (paragraphs.length > 0) fields.add('description');
    
    // Look for date patterns in text
    const itemText = item.textContent || '';
    if (/\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}|\b\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(itemText)) {
      fields.add('date');
    }
    
    // Look for price patterns
    if (/\$[\d,]+(\.\d{2})?|€[\d,]+(\.\d{2})?|£[\d,]+(\.\d{2})?/i.test(itemText)) {
      fields.add('price');
    }
    
    // Generic text content (always useful for extraction)
    if (itemText.trim().length > 0) {
      fields.add('text');
    }
  }
  
  return Array.from(fields).slice(0, 8); // Limit to 8 fields for better performance
}

function calculateRelevanceScore(label: string, kind: string | undefined, searchText: string): number {
  if (!searchText) return 1.0;
  
  const lowerLabel = label.toLowerCase();
  const lowerSearch = searchText.toLowerCase();
  
  // Exact match
  if (lowerLabel === lowerSearch) return 1.0;
  
  // Starts with
  if (lowerLabel.startsWith(lowerSearch)) return 0.8;
  
  // Contains
  if (lowerLabel.includes(lowerSearch)) return 0.6;
  
  // Kind match
  if (kind && kind.toLowerCase().includes(lowerSearch)) return 0.4;
  
  // Fuzzy match (simple)
  const words = lowerSearch.split(' ');
  const matchingWords = words.filter(word => lowerLabel.includes(word));
  if (matchingWords.length > 0) {
    return 0.3 * (matchingWords.length / words.length);
  }
  
  return 0;
}

function generateCSSSelector(element: HTMLElement): string {
  // Simple CSS selector generation
  if (element.id) {
    return `#${CSS.escape(element.id)}`;
  }
  
  if (element.className) {
    const classes = element.className.split(' ').filter(c => c.trim());
    if (classes.length > 0) {
      return `.${classes.map(c => CSS.escape(c)).join('.')}`;
    }
  }
  
  // Generate path-based selector
  const path: string[] = [];
  let current: Element | null = element;
  
  while (current && current.tagName) {
    let selector = current.tagName.toLowerCase();
    
    if (current.id) {
      selector = `#${CSS.escape(current.id)}`;
      path.unshift(selector);
      break;
    }
    
    const siblings = Array.from(current.parentElement?.children || []);
    const sameTagSiblings = siblings.filter(s => s.tagName === current!.tagName);
    
    if (sameTagSiblings.length > 1) {
      const index = sameTagSiblings.indexOf(current) + 1;
      selector += `:nth-of-type(${index})`;
    }
    
    path.unshift(selector);
    current = current.parentElement;
    
    // Limit depth
    if (path.length >= 5) break;
  }
  
  return path.join(' > ');
}

function getFramePath(element: HTMLElement): string[] | undefined {
  // For now, assume single frame - could be extended for iframe support
  return undefined;
}

function calculateMetrics(): { ariaCoverage?: number; viewportH?: number; viewportW?: number } {
  const totalInteractive = document.querySelectorAll(
    'button, a, input, select, textarea, [role="button"], [role="link"]'
  ).length;
  
  const withAria = document.querySelectorAll(
    '[aria-label], [aria-labelledby], [role]'
  ).length;
  
  const ariaCoverage = totalInteractive > 0 ? withAria / totalInteractive : 0;
  
  return {
    ariaCoverage,
    viewportH: window.innerHeight,
    viewportW: window.innerWidth
  };
}

/**
 * Cleanup observers
 */
export function cleanup(): void {
  if (mutationObserver) {
    mutationObserver.disconnect();
    mutationObserver = null;
  }
  
  if (intersectionObserver) {
    intersectionObserver.disconnect();
    intersectionObserver = null;
  }
  
  detailsCache.clear();
  currentMiniPCD = null;
  
  console.log('✅ MiniPCD system cleaned up');
}
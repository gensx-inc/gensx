/**
 * Role-based Selector DSL Resolution
 * Converts semantic role selectors to live DOM elements
 */

import { RoleSelector, Landmark } from '../shared/types';
import { ROLE_TO_CSS_MAP, LANDMARK_SELECTORS } from '../shared/constants';

/**
 * Resolve a RoleSelector to matching DOM elements
 */
export function resolveRoleSelector(selector: RoleSelector): HTMLElement[] {
  try {
    switch (selector.kind) {
      case 'role':
        return resolveRoleBasedSelector(selector);
      case 'text':
        return resolveTextBasedSelector(selector);
      case 'css':
        return resolveCSSSelector(selector);
      default:
        console.warn('Unknown selector kind:', (selector as any).kind);
        return [];
    }
  } catch (error) {
    console.error('Error resolving selector:', selector, error);
    return [];
  }
}

/**
 * Resolve role-based selector
 */
function resolveRoleBasedSelector(selector: {
  kind: 'role';
  role: string;
  name?: string;
  nameMode?: 'exact' | 'includes' | 'regex';
  pressed?: boolean;
  disabled?: boolean;
  withinLandmark?: Landmark;
  nth?: number;
  framePath?: string[];
}): HTMLElement[] {
  
  // Get base CSS selector for role
  const baseCSSSelector = ROLE_TO_CSS_MAP[selector.role as keyof typeof ROLE_TO_CSS_MAP];
  if (!baseCSSSelector) {
    console.warn(`Unknown role: ${selector.role}`);
    return [];
  }
  
  // Start with role-based elements
  let candidates = Array.from(document.querySelectorAll(baseCSSSelector)) as HTMLElement[];
  
  // Filter by landmark if specified
  if (selector.withinLandmark) {
    candidates = filterByLandmark(candidates, selector.withinLandmark);
  }
  
  // Filter by name if specified
  if (selector.name) {
    candidates = filterByAccessibleName(candidates, selector.name, selector.nameMode || 'exact');
  }
  
  // Filter by state attributes
  if (selector.pressed !== undefined) {
    candidates = candidates.filter(el => {
      const pressed = el.getAttribute('aria-pressed') === 'true' ||
                     el.getAttribute('aria-expanded') === 'true' ||
                     (el as any).pressed === true;
      return pressed === selector.pressed;
    });
  }
  
  if (selector.disabled !== undefined) {
    candidates = candidates.filter(el => {
      const disabled = el.hasAttribute('disabled') ||
                      el.getAttribute('aria-disabled') === 'true' ||
                      (el as any).disabled === true;
      return disabled === selector.disabled;
    });
  }
  
  // Apply nth selection
  if (selector.nth !== undefined && selector.nth < candidates.length) {
    return [candidates[selector.nth]];
  }
  
  return candidates;
}

/**
 * Resolve text-based selector
 */
function resolveTextBasedSelector(selector: {
  kind: 'text';
  text: string;
  withinLandmark?: Landmark;
  nth?: number;
  framePath?: string[];
}): HTMLElement[] {
  
  // Search for elements containing the text
  let candidates: HTMLElement[] = [];
  
  // Use TreeWalker for efficient text searching
  const walker = document.createTreeWalker(
    selector.withinLandmark ? getLandmarkElement(selector.withinLandmark) || document.body : document.body,
    NodeFilter.SHOW_ELEMENT,
    {
      acceptNode: (node) => {
        const element = node as HTMLElement;
        
        // Skip hidden elements
        if (isElementHidden(element)) {
          return NodeFilter.FILTER_REJECT;
        }
        
        // Check if element contains the text
        const textContent = element.textContent?.trim() || '';
        const accessibleName = getAccessibleName(element);
        
        if (textContent.includes(selector.text) || accessibleName.includes(selector.text)) {
          return NodeFilter.FILTER_ACCEPT;
        }
        
        return NodeFilter.FILTER_SKIP;
      }
    }
  );
  
  let node;
  while (node = walker.nextNode()) {
    candidates.push(node as HTMLElement);
  }
  
  // Sort by text relevance (exact matches first, then by proximity)
  candidates.sort((a, b) => {
    const aText = getAccessibleName(a) || a.textContent?.trim() || '';
    const bText = getAccessibleName(b) || b.textContent?.trim() || '';
    
    const aExact = aText === selector.text ? 1 : 0;
    const bExact = bText === selector.text ? 1 : 0;
    
    if (aExact !== bExact) return bExact - aExact;
    
    // Sort by text length (shorter is more specific)
    return aText.length - bText.length;
  });
  
  // Apply nth selection
  if (selector.nth !== undefined && selector.nth < candidates.length) {
    return [candidates[selector.nth]];
  }
  
  return candidates;
}

/**
 * Resolve CSS selector (fallback)
 */
function resolveCSSSelector(selector: {
  kind: 'css';
  css: string;
  framePath?: string[];
}): HTMLElement[] {
  
  try {
    return Array.from(document.querySelectorAll(selector.css)) as HTMLElement[];
  } catch (error) {
    console.error('Invalid CSS selector:', selector.css, error);
    return [];
  }
}

/**
 * Filter elements by landmark
 */
function filterByLandmark(elements: HTMLElement[], landmark: Landmark): HTMLElement[] {
  const landmarkElement = getLandmarkElement(landmark);
  if (!landmarkElement) return elements;
  
  return elements.filter(el => landmarkElement.contains(el));
}

/**
 * Get landmark element
 */
function getLandmarkElement(landmark: Landmark): HTMLElement | null {
  const selector = LANDMARK_SELECTORS[landmark];
  return document.querySelector(selector) as HTMLElement | null;
}

/**
 * Filter elements by accessible name
 */
function filterByAccessibleName(
  elements: HTMLElement[], 
  name: string, 
  mode: 'exact' | 'includes' | 'regex'
): HTMLElement[] {
  
  return elements.filter(el => {
    const accessibleName = getAccessibleName(el);
    
    switch (mode) {
      case 'exact':
        return accessibleName === name;
      case 'includes':
        return accessibleName.toLowerCase().includes(name.toLowerCase());
      case 'regex':
        try {
          const regex = new RegExp(name, 'i');
          return regex.test(accessibleName);
        } catch (error) {
          console.error('Invalid regex pattern:', name, error);
          return false;
        }
      default:
        return false;
    }
  });
}

/**
 * Get accessible name for an element (following ARIA spec)
 */
export function getAccessibleName(element: HTMLElement): string {
  // 1. aria-labelledby (highest priority)
  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const labelIds = labelledBy.split(/\s+/);
    const labelTexts = labelIds
      .map(id => document.getElementById(id)?.textContent?.trim())
      .filter(Boolean);
    if (labelTexts.length > 0) {
      return labelTexts.join(' ');
    }
  }
  
  // 2. aria-label
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel?.trim()) {
    return ariaLabel.trim();
  }
  
  // 3. Associated label element (for form controls)
  if (element.id) {
    const label = document.querySelector(`label[for="${element.id}"]`);
    if (label?.textContent?.trim()) {
      return label.textContent.trim();
    }
  }
  
  // 4. Enclosing label element
  const enclosingLabel = element.closest('label');
  if (enclosingLabel?.textContent?.trim()) {
    // Remove the input's own text content from the label
    const labelText = enclosingLabel.textContent.trim();
    const inputText = element.textContent?.trim() || '';
    if (inputText && labelText.includes(inputText)) {
      return labelText.replace(inputText, '').trim();
    }
    return labelText;
  }
  
  // 5. title attribute
  const title = element.getAttribute('title');
  if (title?.trim()) {
    return title.trim();
  }
  
  // 6. alt attribute (for images)
  const alt = element.getAttribute('alt');
  if (alt?.trim()) {
    return alt.trim();
  }
  
  // 7. placeholder attribute (for form controls)
  const placeholder = element.getAttribute('placeholder');
  if (placeholder?.trim()) {
    return placeholder.trim();
  }
  
  // 8. Text content (for buttons, links, etc.)
  const textContent = element.textContent?.trim();
  if (textContent && textContent.length < 200) { // Reasonable limit
    return textContent;
  }
  
  // 9. value attribute (for inputs)
  const value = element.getAttribute('value');
  if (value?.trim()) {
    return value.trim();
  }
  
  return '';
}

/**
 * Check if element is hidden
 */
function isElementHidden(element: HTMLElement): boolean {
  // Check CSS display and visibility
  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden') {
    return true;
  }
  
  // Check hidden attribute
  if (element.hasAttribute('hidden')) {
    return true;
  }
  
  // Check aria-hidden
  if (element.getAttribute('aria-hidden') === 'true') {
    return true;
  }
  
  // Check if element has zero dimensions
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) {
    return true;
  }
  
  return false;
}

/**
 * Find best matching element from candidates
 */
export function findBestMatch(
  selector: RoleSelector, 
  candidates: HTMLElement[]
): HTMLElement | null {
  
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];
  
  // Score candidates based on various factors
  const scoredCandidates = candidates.map(element => ({
    element,
    score: scoreElement(element, selector)
  }));
  
  // Sort by score (highest first)
  scoredCandidates.sort((a, b) => b.score - a.score);
  
  return scoredCandidates[0].element;
}

/**
 * Score an element for relevance to the selector
 */
function scoreElement(element: HTMLElement, selector: RoleSelector): number {
  let score = 0;
  
  // Above-fold bonus
  const rect = element.getBoundingClientRect();
  if (rect.top >= 0 && rect.top < window.innerHeight) {
    score += 0.2;
  }
  
  // Visible and interactive bonus
  if (!isElementHidden(element) && isInteractive(element)) {
    score += 0.3;
  }
  
  // Accessibility attributes bonus
  if (element.hasAttribute('aria-label') || 
      element.hasAttribute('aria-labelledby') ||
      element.hasAttribute('role')) {
    score += 0.1;
  }
  
  // Specific role match bonus
  if (selector.kind === 'role') {
    const elementRole = element.getAttribute('role') || 
                       getImplicitRole(element);
    if (elementRole === selector.role) {
      score += 0.4;
    }
  }
  
  // Name exactness bonus
  if (selector.kind === 'role' && selector.name) {
    const accessibleName = getAccessibleName(element);
    if (accessibleName === selector.name) {
      score += 0.5;
    } else if (accessibleName.toLowerCase().includes(selector.name.toLowerCase())) {
      score += 0.2;
    }
  }
  
  return score;
}

/**
 * Check if element is interactive
 */
function isInteractive(element: HTMLElement): boolean {
  const tagName = element.tagName.toLowerCase();
  const interactiveTags = ['button', 'a', 'input', 'select', 'textarea'];
  
  if (interactiveTags.includes(tagName)) return true;
  
  // Check for interactive roles
  const role = element.getAttribute('role');
  const interactiveRoles = ['button', 'link', 'menuitem', 'tab', 'checkbox', 'radio'];
  if (role && interactiveRoles.includes(role)) return true;
  
  // Check for click handlers
  if (element.onclick || element.hasAttribute('onclick')) return true;
  
  // Check cursor style
  const style = window.getComputedStyle(element);
  if (style.cursor === 'pointer') return true;
  
  return false;
}

/**
 * Get implicit ARIA role for element
 */
function getImplicitRole(element: HTMLElement): string {
  const tagName = element.tagName.toLowerCase();
  
  switch (tagName) {
    case 'button':
      return 'button';
    case 'a':
      return element.hasAttribute('href') ? 'link' : '';
    case 'input':
      const type = (element as HTMLInputElement).type;
      switch (type) {
        case 'button':
        case 'submit':
        case 'reset':
          return 'button';
        case 'checkbox':
          return 'checkbox';
        case 'radio':
          return 'radio';
        case 'text':
        case 'email':
        case 'password':
        case 'search':
        case 'tel':
        case 'url':
          return 'textbox';
        default:
          return '';
      }
    case 'textarea':
      return 'textbox';
    case 'select':
      return 'combobox';
    case 'main':
      return 'main';
    case 'header':
      return 'banner';
    case 'nav':
      return 'navigation';
    case 'footer':
      return 'contentinfo';
    case 'aside':
      return 'complementary';
    default:
      return '';
  }
}

/**
 * Validate selector before attempting resolution
 */
export function validateSelector(selector: RoleSelector): { valid: boolean; error?: string } {
  switch (selector.kind) {
    case 'role':
      if (!selector.role) {
        return { valid: false, error: 'Role selector requires role property' };
      }
      if (selector.nameMode === 'regex' && selector.name) {
        try {
          new RegExp(selector.name);
        } catch (error) {
          return { valid: false, error: `Invalid regex pattern: ${selector.name}` };
        }
      }
      break;
    case 'text':
      if (!selector.text) {
        return { valid: false, error: 'Text selector requires text property' };
      }
      break;
    case 'css':
      if (!selector.css) {
        return { valid: false, error: 'CSS selector requires css property' };
      }
      try {
        document.querySelector(selector.css);
      } catch (error) {
        return { valid: false, error: `Invalid CSS selector: ${selector.css}` };
      }
      break;
    default:
      return { valid: false, error: `Unknown selector kind: ${(selector as any).kind}` };
  }
  
  return { valid: true };
}

/**
 * Debug selector resolution (for development)
 */
export function debugSelector(selector: RoleSelector): void {
  console.group(`🔍 Debug Selector:`, selector);
  
  const validation = validateSelector(selector);
  if (!validation.valid) {
    console.error('❌ Invalid selector:', validation.error);
    console.groupEnd();
    return;
  }
  
  const elements = resolveRoleSelector(selector);
  console.log(`✅ Found ${elements.length} matching elements:`, elements);
  
  if (elements.length > 0) {
    elements.forEach((el, index) => {
      console.log(`  ${index + 1}. ${el.tagName}`, {
        accessibleName: getAccessibleName(el),
        role: el.getAttribute('role') || getImplicitRole(el),
        visible: !isElementHidden(el),
        interactive: isInteractive(el),
        element: el
      });
    });
  }
  
  console.groupEnd();
}
/**
 * Shared constants for the Browser Copilot Chrome Extension
 */

// MiniPCD Construction Limits
export const MINI_PCD_LIMITS = {
  MAX_ACTIONS: 30,
  MAX_FORMS: 20,
  MAX_COLLECTIONS: 20,
  MAX_LABEL_LENGTH: 100,
  MAX_FORM_FIELDS: 20,
} as const;

// Performance Constraints
export const PERFORMANCE_LIMITS = {
  MAX_CANDIDATES_PER_CYCLE: 200,
  MAX_SLICE_TIME_MS: 8,
  LONG_TASK_THRESHOLD_MS: 10,
  IDLE_CALLBACK_TIMEOUT_MS: 5000,
  VIEWPORT_BUFFER_FACTOR: 1.2, // for above-fold detection
} as const;

// Selector Resolution
export const ROLE_TO_CSS_MAP = {
  'button': 'button, input[type="button"], input[type="submit"], [role="button"]',
  'link': 'a[href], [role="link"]',
  'textbox': 'input[type="text"], input[type="email"], input[type="password"], input[type="search"], input[type="url"], input[type="tel"], textarea, [role="textbox"]',
  'combobox': 'select, [role="combobox"]',
  'checkbox': 'input[type="checkbox"], [role="checkbox"]',
  'radio': 'input[type="radio"], [role="radio"]',
  'menuitem': '[role="menuitem"]',
  'tab': '[role="tab"]',
  'listbox': '[role="listbox"]',
  'option': 'option, [role="option"]',
  'searchbox': 'input[type="search"], [role="searchbox"]',
} as const;

// Landmark Selectors
export const LANDMARK_SELECTORS = {
  'main': 'main, [role="main"]',
  'header': 'header, [role="banner"]',
  'nav': 'nav, [role="navigation"]',
  'footer': 'footer, [role="contentinfo"]',
  'aside': 'aside, [role="complementary"]',
} as const;

// Semantic Kind Detection Patterns
export const SEMANTIC_PATTERNS = {
  search: /search|find|look|query/i,
  login: /sign\s*in|log\s*in|login|authenticate/i,
  signup: /sign\s*up|register|create\s*account|join/i,
  logout: /sign\s*out|log\s*out|logout/i,
  submit: /submit|send|post|save|confirm/i,
  cancel: /cancel|close|abort|dismiss/i,
  delete: /delete|remove|trash|destroy/i,
  edit: /edit|modify|change|update/i,
  create: /create|new|add|plus/i,
  download: /download|export|save\s*as/i,
  upload: /upload|import|attach/i,
  next: /next|continue|proceed/i,
  previous: /previous|prev|back/i,
  filter: /filter|sort|order/i,
  cart: /cart|basket|bag/i,
  checkout: /checkout|buy|purchase|order/i,
  payment: /pay|payment|billing|card/i,
  profile: /profile|account|settings/i,
  help: /help|support|faq|documentation/i,
} as const;

// Form Purpose Detection Patterns
export const FORM_PURPOSE_PATTERNS = {
  login: /login|sign\s*in|auth/i,
  signup: /signup|register|sign\s*up/i,
  search: /search|query|find/i,
  contact: /contact|message|feedback/i,
  payment: /payment|billing|checkout|card/i,
  profile: /profile|account|settings/i,
  filter: /filter|search|sort/i,
  newsletter: /newsletter|subscribe|email/i,
} as const;

// Collection Name Patterns
export const COLLECTION_PATTERNS = {
  results: /results?|items?|listings?|products?/i,
  grid: /grid|cards?|tiles?/i,
  list: /list|table|rows?/i,
  menu: /menu|navigation|nav/i,
  tabs: /tabs?|panels?/i,
  carousel: /carousel|slider|gallery/i,
} as const;

// Timeouts and Delays
export const TIMEOUTS = {
  DEFAULT_WAIT_FOR_MS: 5000,
  NETWORK_IDLE_MS: 1000,
  ACTION_WAIT_MS: 500,
  NAVIGATION_TIMEOUT_MS: 10000,
  SCREENSHOT_TIMEOUT_MS: 3000,
} as const;

// Exploration Parameters
export const EXPLORATION_CONFIG = {
  BEAM_WIDTH: 4,
  MAX_DEPTH: 3,
  GOAL_SCORE_THRESHOLD: 0.8,
  MIN_CONFIDENCE_THRESHOLD: 0.6,
} as const;

// Scoring Weights
export const SCORING_WEIGHTS = {
  EXACT_MATCH: 1.0,
  PARTIAL_MATCH: 0.7,
  FUZZY_MATCH: 0.4,
  ABOVE_FOLD_BONUS: 0.2,
  LANDMARK_BONUS: 0.1,
  RECENT_ACTION_PENALTY: -0.1,
} as const;

// Safety and Privacy
export const SAFETY_CONFIG = {
  REQUIRE_CONFIRMATION_FOR: ['delete', 'remove', 'destroy', 'cancel', 'abort'],
  SENSITIVE_FIELD_TYPES: ['password', 'credit-card', 'ssn', 'phone'],
  MAX_SCREENSHOT_SIZE_MB: 5,
  MAX_EXTRACTION_ITEMS: 100,
} as const;

// Communication Ports
export const PORTS = {
  CONTENT_TO_BACKGROUND: 'copilot-content',
  BACKGROUND_TO_SERVER: 'copilot-server',
} as const;
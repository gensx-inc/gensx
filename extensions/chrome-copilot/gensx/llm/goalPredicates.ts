/**
 * Goal Predicates - Detect goal pages from MiniPCD
 * Identifies when specific goals have been achieved based on page content
 */

import { MiniPCD, MiniAction, MiniForm, MiniCollection } from '../../src/shared/types';

/**
 * Goal Predicate Interface
 */
export interface GoalPredicate {
  name: string;
  description: string;
  check(goal: string, miniPCD: MiniPCD): Promise<{ satisfied: boolean; confidence: number; message?: string }>;
}

/**
 * Billing/Payment Goal Predicate
 */
export const BillingGoalPredicate: GoalPredicate = {
  name: 'billing',
  description: 'Detects billing, payment, and invoice-related pages',
  
  async check(goal: string, miniPCD: MiniPCD) {
    const goalLower = goal.toLowerCase();
    const isBillingGoal = goalLower.includes('billing') || 
                         goalLower.includes('payment') || 
                         goalLower.includes('invoice') ||
                         goalLower.includes('subscription');
    
    if (!isBillingGoal) {
      return { satisfied: false, confidence: 0 };
    }
    
    let confidence = 0;
    const indicators: string[] = [];
    
    // Check URL for billing patterns
    const urlLower = miniPCD.url.toLowerCase();
    if (urlLower.includes('billing') || urlLower.includes('payment') || urlLower.includes('invoice')) {
      confidence += 0.4;
      indicators.push('billing URL');
    }
    
    // Check title
    const titleLower = miniPCD.title.toLowerCase();
    if (titleLower.includes('billing') || titleLower.includes('payment') || titleLower.includes('invoice')) {
      confidence += 0.3;
      indicators.push('billing title');
    }
    
    // Check for billing-related forms
    for (const form of miniPCD.forms) {
      if (form.purpose && ['billing', 'payment', 'payment_method', 'checkout'].includes(form.purpose)) {
        confidence += 0.5;
        indicators.push('payment form');
        break;
      }
      
      // Check field types
      const hasPaymentFields = form.fieldSummaries.some(field => 
        field.type.includes('card') || 
        field.label.toLowerCase().includes('card') ||
        field.label.toLowerCase().includes('payment')
      );
      
      if (hasPaymentFields) {
        confidence += 0.3;
        indicators.push('payment fields');
      }
    }
    
    // Check for billing-related actions
    for (const action of miniPCD.actions) {
      if (action.kind && ['billing', 'payment', 'checkout'].includes(action.kind)) {
        confidence += 0.2;
        indicators.push('billing action');
      }
      
      const labelLower = action.label.toLowerCase();
      if (labelLower.includes('pay') || labelLower.includes('billing') || labelLower.includes('invoice')) {
        confidence += 0.1;
        indicators.push('billing button');
      }
    }
    
    // Check for invoice/billing collections
    for (const collection of miniPCD.collections) {
      const hasInvoiceFields = collection.itemFields.some(field =>
        ['date', 'amount', 'invoice', 'download', 'payment'].some(billingField =>
          field.toLowerCase().includes(billingField)
        )
      );
      
      if (hasInvoiceFields) {
        confidence += 0.3;
        indicators.push('invoice list');
      }
    }
    
    const satisfied = confidence >= 0.6;
    const message = satisfied ? 
      `Billing page detected: ${indicators.join(', ')}` : 
      undefined;
    
    return { satisfied, confidence, message };
  }
};

/**
 * Download Goal Predicate
 */
export const DownloadGoalPredicate: GoalPredicate = {
  name: 'download',
  description: 'Detects when download actions are available',
  
  async check(goal: string, miniPCD: MiniPCD) {
    const goalLower = goal.toLowerCase();
    const isDownloadGoal = goalLower.includes('download') || 
                          goalLower.includes('export') ||
                          goalLower.includes('save');
    
    if (!isDownloadGoal) {
      return { satisfied: false, confidence: 0 };
    }
    
    let confidence = 0;
    const indicators: string[] = [];
    
    // Check for download-related actions
    for (const action of miniPCD.actions) {
      if (action.kind === 'download') {
        confidence += 0.6;
        indicators.push('download button');
      }
      
      const labelLower = action.label.toLowerCase();
      if (labelLower.includes('download') || labelLower.includes('export') || labelLower.includes('save')) {
        confidence += 0.4;
        indicators.push('download action');
      }
    }
    
    // Check for downloadable collections
    for (const collection of miniPCD.collections) {
      const hasDownloadField = collection.itemFields.some(field =>
        field.toLowerCase().includes('download') || 
        field.toLowerCase().includes('link')
      );
      
      if (hasDownloadField && goalLower.includes(collection.name.toLowerCase())) {
        confidence += 0.5;
        indicators.push('downloadable collection');
      }
    }
    
    const satisfied = confidence >= 0.5;
    const message = satisfied ? 
      `Download available: ${indicators.join(', ')}` : 
      undefined;
    
    return { satisfied, confidence, message };
  }
};

/**
 * Search Results Goal Predicate
 */
export const SearchResultsGoalPredicate: GoalPredicate = {
  name: 'search_results',
  description: 'Detects when search results are displayed',
  
  async check(goal: string, miniPCD: MiniPCD) {
    const goalLower = goal.toLowerCase();
    const isSearchGoal = goalLower.includes('search') || 
                        goalLower.includes('find') ||
                        goalLower.includes('look for');
    
    if (!isSearchGoal) {
      return { satisfied: false, confidence: 0 };
    }
    
    let confidence = 0;
    const indicators: string[] = [];
    
    // Check URL for search patterns
    const urlLower = miniPCD.url.toLowerCase();
    if (urlLower.includes('search') || urlLower.includes('query') || urlLower.includes('results')) {
      confidence += 0.3;
      indicators.push('search URL');
    }
    
    // Check for search results collections
    for (const collection of miniPCD.collections) {
      const isResultsCollection = collection.name.toLowerCase().includes('result') ||
                                  collection.name.toLowerCase().includes('search') ||
                                  collection.approxCount !== undefined && collection.approxCount > 0;
      
      if (isResultsCollection) {
        confidence += 0.6;
        indicators.push(`${collection.name} (${collection.approxCount || 'multiple'} items)`);
      }
    }
    
    // Check for pagination or filtering actions
    for (const action of miniPCD.actions) {
      const labelLower = action.label.toLowerCase();
      if (labelLower.includes('next') || labelLower.includes('filter') || labelLower.includes('sort')) {
        confidence += 0.2;
        indicators.push('result navigation');
        break;
      }
    }
    
    const satisfied = confidence >= 0.6;
    const message = satisfied ? 
      `Search results found: ${indicators.join(', ')}` : 
      undefined;
    
    return { satisfied, confidence, message };
  }
};

/**
 * Login Success Goal Predicate
 */
export const LoginSuccessGoalPredicate: GoalPredicate = {
  name: 'login_success',
  description: 'Detects successful login/authentication',
  
  async check(goal: string, miniPCD: MiniPCD) {
    const goalLower = goal.toLowerCase();
    const isLoginGoal = goalLower.includes('login') || 
                       goalLower.includes('sign in') ||
                       goalLower.includes('authenticate');
    
    if (!isLoginGoal) {
      return { satisfied: false, confidence: 0 };
    }
    
    let confidence = 0;
    const indicators: string[] = [];
    
    // Check login state
    if (miniPCD.loginState === 'in') {
      confidence += 0.7;
      indicators.push('logged in');
    }
    
    // Check for logout/account actions (indicates logged in state)
    for (const action of miniPCD.actions) {
      const labelLower = action.label.toLowerCase();
      if (labelLower.includes('logout') || labelLower.includes('sign out') || labelLower.includes('account')) {
        confidence += 0.5;
        indicators.push('account actions available');
        break;
      }
    }
    
    // Check URL for dashboard/account patterns
    const urlLower = miniPCD.url.toLowerCase();
    if (urlLower.includes('dashboard') || urlLower.includes('account') || urlLower.includes('profile')) {
      confidence += 0.4;
      indicators.push('account page');
    }
    
    // Check title
    const titleLower = miniPCD.title.toLowerCase();
    if (titleLower.includes('dashboard') || titleLower.includes('welcome') || titleLower.includes('account')) {
      confidence += 0.3;
      indicators.push('account title');
    }
    
    const satisfied = confidence >= 0.7;
    const message = satisfied ? 
      `Login successful: ${indicators.join(', ')}` : 
      undefined;
    
    return { satisfied, confidence, message };
  }
};

/**
 * Form Submission Goal Predicate
 */
export const FormSubmissionGoalPredicate: GoalPredicate = {
  name: 'form_submission',
  description: 'Detects successful form submissions',
  
  async check(goal: string, miniPCD: MiniPCD) {
    const goalLower = goal.toLowerCase();
    const isFormGoal = goalLower.includes('submit') || 
                      goalLower.includes('send') ||
                      goalLower.includes('contact') ||
                      goalLower.includes('apply');
    
    if (!isFormGoal) {
      return { satisfied: false, confidence: 0 };
    }
    
    let confidence = 0;
    const indicators: string[] = [];
    
    // Check for success messages in page content
    const titleLower = miniPCD.title.toLowerCase();
    if (titleLower.includes('thank') || titleLower.includes('success') || titleLower.includes('submitted')) {
      confidence += 0.6;
      indicators.push('success message');
    }
    
    // Check URL for success/thank you patterns
    const urlLower = miniPCD.url.toLowerCase();
    if (urlLower.includes('thank') || urlLower.includes('success') || urlLower.includes('submitted')) {
      confidence += 0.5;
      indicators.push('success URL');
    }
    
    // Check for confirmation actions
    for (const action of miniPCD.actions) {
      const labelLower = action.label.toLowerCase();
      if (labelLower.includes('continue') || labelLower.includes('ok') || labelLower.includes('done')) {
        confidence += 0.3;
        indicators.push('confirmation action');
        break;
      }
    }
    
    const satisfied = confidence >= 0.6;
    const message = satisfied ? 
      `Form submitted successfully: ${indicators.join(', ')}` : 
      undefined;
    
    return { satisfied, confidence, message };
  }
};

/**
 * Checkout Goal Predicate
 */
export const CheckoutGoalPredicate: GoalPredicate = {
  name: 'checkout',
  description: 'Detects checkout and purchase completion',
  
  async check(goal: string, miniPCD: MiniPCD) {
    const goalLower = goal.toLowerCase();
    const isCheckoutGoal = goalLower.includes('checkout') || 
                          goalLower.includes('purchase') ||
                          goalLower.includes('buy') ||
                          goalLower.includes('order');
    
    if (!isCheckoutGoal) {
      return { satisfied: false, confidence: 0 };
    }
    
    let confidence = 0;
    const indicators: string[] = [];
    
    // Check URL patterns
    const urlLower = miniPCD.url.toLowerCase();
    if (urlLower.includes('checkout') || urlLower.includes('order') || urlLower.includes('purchase')) {
      confidence += 0.4;
      indicators.push('checkout URL');
    }
    
    // Check for checkout forms
    for (const form of miniPCD.forms) {
      if (form.purpose && ['checkout', 'payment', 'billing'].includes(form.purpose)) {
        confidence += 0.5;
        indicators.push('checkout form');
        break;
      }
    }
    
    // Check for purchase/order actions
    for (const action of miniPCD.actions) {
      if (action.kind && ['checkout', 'purchase'].includes(action.kind)) {
        confidence += 0.4;
        indicators.push('purchase button');
      }
      
      const labelLower = action.label.toLowerCase();
      if (labelLower.includes('buy') || labelLower.includes('purchase') || labelLower.includes('order')) {
        confidence += 0.3;
        indicators.push('purchase action');
      }
    }
    
    // Check for order confirmation
    const titleLower = miniPCD.title.toLowerCase();
    if (titleLower.includes('order') || titleLower.includes('purchase') || titleLower.includes('confirmation')) {
      confidence += 0.6;
      indicators.push('order confirmation');
    }
    
    const satisfied = confidence >= 0.6;
    const message = satisfied ? 
      `Checkout page reached: ${indicators.join(', ')}` : 
      undefined;
    
    return { satisfied, confidence, message };
  }
};

/**
 * Navigation Goal Predicate
 */
export const NavigationGoalPredicate: GoalPredicate = {
  name: 'navigation',
  description: 'Detects successful navigation to target pages',
  
  async check(goal: string, miniPCD: MiniPCD) {
    const goalLower = goal.toLowerCase();
    const isNavigationGoal = goalLower.includes('go to') || 
                            goalLower.includes('navigate') ||
                            goalLower.includes('visit');
    
    if (!isNavigationGoal) {
      return { satisfied: false, confidence: 0 };
    }
    
    // Extract target from goal
    const words = goal.toLowerCase().split(/\s+/);
    const toIndex = words.findIndex(w => w === 'to');
    let target = '';
    
    if (toIndex >= 0 && toIndex < words.length - 1) {
      target = words.slice(toIndex + 1).join(' ');
    } else {
      target = words[words.length - 1];
    }
    
    if (!target) {
      return { satisfied: false, confidence: 0 };
    }
    
    let confidence = 0;
    const indicators: string[] = [];
    
    // Check URL contains target
    const urlLower = miniPCD.url.toLowerCase();
    if (urlLower.includes(target)) {
      confidence += 0.6;
      indicators.push('URL matches target');
    }
    
    // Check title contains target
    const titleLower = miniPCD.title.toLowerCase();
    if (titleLower.includes(target)) {
      confidence += 0.5;
      indicators.push('title matches target');
    }
    
    // Check for expected page elements
    const hasRelevantActions = miniPCD.actions.some(action =>
      action.label.toLowerCase().includes(target)
    );
    
    if (hasRelevantActions) {
      confidence += 0.3;
      indicators.push('relevant page content');
    }
    
    const satisfied = confidence >= 0.6;
    const message = satisfied ? 
      `Successfully navigated to ${target}: ${indicators.join(', ')}` : 
      undefined;
    
    return { satisfied, confidence, message };
  }
};

/**
 * Goal Predicates Registry
 */
export const goalPredicates: GoalPredicate[] = [
  BillingGoalPredicate,
  DownloadGoalPredicate,
  SearchResultsGoalPredicate,
  LoginSuccessGoalPredicate,
  FormSubmissionGoalPredicate,
  CheckoutGoalPredicate,
  NavigationGoalPredicate
];

/**
 * Check all goal predicates against a goal and MiniPCD
 */
export async function checkAllGoalPredicates(
  goal: string,
  miniPCD: MiniPCD
): Promise<Array<{ predicate: GoalPredicate; result: { satisfied: boolean; confidence: number; message?: string } }>> {
  
  const results = [];
  
  for (const predicate of goalPredicates) {
    try {
      const result = await predicate.check(goal, miniPCD);
      results.push({ predicate, result });
    } catch (error) {
      console.warn(`Goal predicate ${predicate.name} failed:`, error);
      results.push({
        predicate,
        result: { satisfied: false, confidence: 0, message: 'Predicate error' }
      });
    }
  }
  
  return results;
}

/**
 * Get the best matching goal predicate
 */
export async function getBestGoalMatch(
  goal: string,
  miniPCD: MiniPCD
): Promise<{ predicate: GoalPredicate; result: { satisfied: boolean; confidence: number; message?: string } } | null> {
  
  const results = await checkAllGoalPredicates(goal, miniPCD);
  
  // Sort by confidence and find best satisfied predicate
  const satisfiedResults = results.filter(r => r.result.satisfied);
  
  if (satisfiedResults.length > 0) {
    satisfiedResults.sort((a, b) => b.result.confidence - a.result.confidence);
    return satisfiedResults[0];
  }
  
  return null;
}
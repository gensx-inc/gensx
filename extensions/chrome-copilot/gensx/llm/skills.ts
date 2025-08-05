/**
 * Reusable Skills System
 * Implements common task patterns with match/bind/plan/effects
 */

import { z } from "zod";
import { 
  MiniPCD, 
  MiniAction, 
  MiniForm, 
  PCDActionDetail, 
  PlannedStep, 
  Skill,
  Observation,
  RoleSelector
} from '../../src/shared/types';

/**
 * Login Skill - Handle authentication forms
 */
export const LoginSkill: Skill<{ username?: string; password?: string }> = {
  name: 'LoginSkill',
  params: z.object({
    username: z.string().optional(),
    password: z.string().optional()
  }),
  
  match(miniPCD: MiniPCD, params: any) {
    const matches: Array<{ requestedIds: string[]; confidence: number }> = [];
    
    // Look for login-related forms
    for (const form of miniPCD.forms) {
      if (form.purpose?.includes('login') || 
          form.fieldSummaries.some(f => f.type === 'password')) {
        
        // Collect all form field IDs
        const requestedIds = [form.id];
        
        // High confidence for explicit login forms
        const confidence = form.purpose?.includes('login') ? 0.9 : 0.7;
        
        matches.push({ requestedIds, confidence });
      }
    }
    
    // Look for login buttons/links
    for (const action of miniPCD.actions) {
      if (action.kind === 'login' || 
          action.label.toLowerCase().includes('sign in') ||
          action.label.toLowerCase().includes('log in')) {
        
        matches.push({ 
          requestedIds: [action.id], 
          confidence: 0.8 
        });
      }
    }
    
    return matches;
  },
  
  bind(details: PCDActionDetail[], params: any) {
    const binding: Record<string, PCDActionDetail> = {};
    
    // Find form and its fields
    for (const detail of details) {
      // This would be enhanced to properly identify form fields
      if (detail.selector.kind === 'role' && detail.selector.role === 'form') {
        binding.loginForm = detail;
      } else if (detail.selector.kind === 'role' && detail.selector.role === 'textbox') {
        if (!binding.usernameField) {
          binding.usernameField = detail;
        } else {
          binding.passwordField = detail;
        }
      } else if (detail.selector.kind === 'role' && detail.selector.role === 'button') {
        binding.submitButton = detail;
      }
    }
    
    // Require at least username field
    if (binding.usernameField) {
      return { binding, confidence: 0.8 };
    }
    
    return null;
  },
  
  plan(binding: Record<string, PCDActionDetail>, params: any) {
    const steps: PlannedStep[] = [];
    
    if (binding.usernameField && params.username) {
      steps.push({
        kind: 'tool',
        call: {
          name: 'dom_type',
          args: {
            tabId: 0, // Will be filled by controller
            selector: binding.usernameField.selector,
            text: params.username,
            replace: true
          }
        },
        description: 'Enter username',
        risk: 'low'
      });
    }
    
    if (binding.passwordField && params.password) {
      steps.push({
        kind: 'tool',
        call: {
          name: 'dom_type',
          args: {
            tabId: 0, // Will be filled by controller
            selector: binding.passwordField.selector,
            text: params.password,
            replace: true
          }
        },
        description: 'Enter password',
        risk: 'medium'
      });
    }
    
    if (binding.submitButton) {
      steps.push({
        kind: 'tool',
        call: {
          name: 'dom_click',
          args: {
            tabId: 0, // Will be filled by controller
            selector: binding.submitButton.selector
          }
        },
        description: 'Submit login form',
        risk: 'medium'
      });
    }
    
    return steps;
  },
  
  effects: [
    (obs: Observation) => obs.urlChanged === true,
    (obs: Observation) => obs.focusedRole !== 'textbox'
  ]
};

/**
 * Search Skill - Handle search forms and queries
 */
export const SearchSkill: Skill<{ query: string }> = {
  name: 'SearchSkill',
  params: z.object({
    query: z.string()
  }),
  
  match(miniPCD: MiniPCD, params: any) {
    const matches: Array<{ requestedIds: string[]; confidence: number }> = [];
    
    // Look for search forms
    for (const form of miniPCD.forms) {
      if (form.purpose?.includes('search') || 
          form.fieldSummaries.some(f => f.label.toLowerCase().includes('search'))) {
        
        matches.push({ 
          requestedIds: [form.id], 
          confidence: 0.9 
        });
      }
    }
    
    // Look for search actions
    for (const action of miniPCD.actions) {
      if (action.kind === 'search' ||
          action.label.toLowerCase().includes('search') ||
          action.label.toLowerCase().includes('find')) {
        
        matches.push({ 
          requestedIds: [action.id], 
          confidence: 0.8 
        });
      }
    }
    
    return matches;
  },
  
  bind(details: PCDActionDetail[], params: any) {
    const binding: Record<string, PCDActionDetail> = {};
    
    for (const detail of details) {
      if (detail.selector.kind === 'role') {
        if (detail.selector.role === 'textbox' || detail.selector.role === 'searchbox') {
          binding.searchInput = detail;
        } else if (detail.selector.role === 'button' && 
                   detail.selector.name?.toLowerCase().includes('search')) {
          binding.searchButton = detail;
        }
      }
    }
    
    if (binding.searchInput) {
      return { binding, confidence: 0.9 };
    }
    
    return null;
  },
  
  plan(binding: Record<string, PCDActionDetail>, params: any) {
    const steps: PlannedStep[] = [];
    
    if (binding.searchInput) {
      steps.push({
        kind: 'tool',
        call: {
          name: 'dom_type',
          args: {
            tabId: 0, // Will be filled by controller
            selector: binding.searchInput.selector,
            text: params.query,
            replace: true
          }
        },
        description: `Search for "${params.query}"`,
        risk: 'low'
      });
      
      if (binding.searchButton) {
        steps.push({
          kind: 'tool',
          call: {
            name: 'dom_click',
            args: {
              tabId: 0, // Will be filled by controller
              selector: binding.searchButton.selector
            }
          },
          description: 'Click search button',
          risk: 'low'
        });
      } else {
        // Submit by pressing Enter (simulate form submission)
        steps.push({
          kind: 'tool',
          call: {
            name: 'dom_submit',
            args: {
              tabId: 0, // Will be filled by controller
              selector: binding.searchInput.selector
            }
          },
          description: 'Submit search',
          risk: 'low'
        });
      }
    }
    
    return steps;
  },
  
  effects: [
    (obs: Observation) => obs.urlChanged === true,
    (obs: Observation) => obs.collectionSummary !== undefined
  ]
};

/**
 * Navigation Skill - Handle menu and link navigation
 */
export const NavigationSkill: Skill<{ target: string }> = {
  name: 'NavigationSkill',
  params: z.object({
    target: z.string()
  }),
  
  match(miniPCD: MiniPCD, params: any) {
    const matches: Array<{ requestedIds: string[]; confidence: number }> = [];
    const targetLower = params.target.toLowerCase();
    
    // Look for navigation actions
    for (const action of miniPCD.actions) {
      const labelLower = action.label.toLowerCase();
      
      // Exact match
      if (labelLower === targetLower) {
        matches.push({ 
          requestedIds: [action.id], 
          confidence: 0.95 
        });
      }
      // Partial match
      else if (labelLower.includes(targetLower) || targetLower.includes(labelLower)) {
        matches.push({ 
          requestedIds: [action.id], 
          confidence: 0.7 
        });
      }
      // Navigation-specific elements
      else if (action.role === 'link' && action.landmark === 'nav') {
        if (labelLower.includes(targetLower.split(' ')[0])) {
          matches.push({ 
            requestedIds: [action.id], 
            confidence: 0.6 
          });
        }
      }
    }
    
    return matches;
  },
  
  bind(details: PCDActionDetail[], params: any) {
    const binding: Record<string, PCDActionDetail> = {};
    
    // Take the first (best) match
    if (details.length > 0) {
      binding.targetElement = details[0];
      return { binding, confidence: 0.8 };
    }
    
    return null;
  },
  
  plan(binding: Record<string, PCDActionDetail>, params: any) {
    const steps: PlannedStep[] = [];
    
    if (binding.targetElement) {
      steps.push({
        kind: 'tool',
        call: {
          name: 'dom_click',
          args: {
            tabId: 0, // Will be filled by controller
            selector: binding.targetElement.selector
          }
        },
        description: `Navigate to ${params.target}`,
        risk: 'low'
      });
      
      // Wait for navigation to complete
      steps.push({
        kind: 'tool',
        call: {
          name: 'dom_waitFor',
          args: {
            tabId: 0, // Will be filled by controller
            event: 'urlChange',
            timeoutMs: 5000
          }
        },
        description: 'Wait for navigation',
        risk: 'low'
      });
    }
    
    return steps;
  },
  
  effects: [
    (obs: Observation) => obs.urlChanged === true
  ]
};

/**
 * Form Fill Skill - Handle generic form filling
 */
export const FormFillSkill: Skill<{ fields: Record<string, string> }> = {
  name: 'FormFillSkill',
  params: z.object({
    fields: z.record(z.string(), z.string())
  }),
  
  match(miniPCD: MiniPCD, params: any) {
    const matches: Array<{ requestedIds: string[]; confidence: number }> = [];
    
    // Look for forms that have fields matching our parameters
    for (const form of miniPCD.forms) {
      const matchingFields = form.fieldSummaries.filter(field => 
        Object.keys(params.fields).some(key => 
          field.label.toLowerCase().includes(key.toLowerCase()) ||
          field.name?.toLowerCase().includes(key.toLowerCase())
        )
      );
      
      if (matchingFields.length > 0) {
        const confidence = Math.min(0.9, 0.5 + (matchingFields.length / form.fieldSummaries.length) * 0.4);
        matches.push({ 
          requestedIds: [form.id], 
          confidence 
        });
      }
    }
    
    return matches;
  },
  
  bind(details: PCDActionDetail[], params: any) {
    const binding: Record<string, PCDActionDetail> = {};
    
    // This would need to be enhanced to properly map form fields
    // For now, assume we get the form detail
    if (details.length > 0) {
      binding.targetForm = details[0];
      return { binding, confidence: 0.7 };
    }
    
    return null;
  },
  
  plan(binding: Record<string, PCDActionDetail>, params: any) {
    const steps: PlannedStep[] = [];
    
    // This would need to be enhanced to generate steps for each field
    // For now, create a placeholder
    steps.push({
      kind: 'tool',
      call: {
        name: 'dom_click',
        args: {
          tabId: 0, // Will be filled by controller
          selector: binding.targetForm.selector
        }
      },
      description: 'Focus on form',
      risk: 'low'
    });
    
    return steps;
  }
};

/**
 * Data Extract Skill - Extract data from collections
 */
export const DataExtractSkill: Skill<{ fields: string[] }> = {
  name: 'DataExtractSkill',
  params: z.object({
    fields: z.array(z.string())
  }),
  
  match(miniPCD: MiniPCD, params: any) {
    const matches: Array<{ requestedIds: string[]; confidence: number }> = [];
    
    // Look for collections that might contain the requested fields
    for (const collection of miniPCD.collections) {
      const matchingFields = collection.itemFields.filter(field =>
        params.fields.some((requestedField: string) =>
          field.toLowerCase().includes(requestedField.toLowerCase())
        )
      );
      
      if (matchingFields.length > 0) {
        const confidence = matchingFields.length / params.fields.length;
        matches.push({ 
          requestedIds: [collection.id], 
          confidence 
        });
      }
    }
    
    return matches;
  },
  
  bind(details: PCDActionDetail[], params: any) {
    const binding: Record<string, PCDActionDetail> = {};
    
    if (details.length > 0) {
      binding.targetCollection = details[0];
      return { binding, confidence: 0.8 };
    }
    
    return null;
  },
  
  plan(binding: Record<string, PCDActionDetail>, params: any) {
    const steps: PlannedStep[] = [];
    
    if (binding.targetCollection) {
      steps.push({
        kind: 'tool',
        call: {
          name: 'dom_extract',
          args: {
            tabId: 0, // Will be filled by controller
            collectionId: binding.targetCollection.id,
            fields: params.fields
          }
        },
        description: `Extract ${params.fields.join(', ')} from collection`,
        risk: 'low'
      });
    }
    
    return steps;
  }
};

/**
 * Skill Registry - Map of all available skills
 */
export const skillRegistry = {
  login: LoginSkill,
  search: SearchSkill,
  navigation: NavigationSkill,
  formFill: FormFillSkill,
  dataExtract: DataExtractSkill
};

/**
 * Get skill by name
 */
export function getSkill(name: string): Skill | null {
  return skillRegistry[name as keyof typeof skillRegistry] || null;
}

/**
 * List all available skills
 */
export function listSkills(): string[] {
  return Object.keys(skillRegistry);
}

/**
 * Skill matching utility
 */
export async function matchSkillsToGoal(
  goal: string,
  miniPCD: MiniPCD
): Promise<Array<{ skillName: string; skill: Skill; confidence: number; params: any }>> {
  
  const results: Array<{ skillName: string; skill: Skill; confidence: number; params: any }> = [];
  const goalLower = goal.toLowerCase();
  
  // Simple heuristic-based skill selection
  for (const [skillName, skill] of Object.entries(skillRegistry)) {
    let params: any = {};
    let shouldTry = false;
    
    switch (skillName) {
      case 'login':
        if (goalLower.includes('login') || goalLower.includes('sign in')) {
          shouldTry = true;
          // Would extract username/password from context
        }
        break;
        
      case 'search':
        if (goalLower.includes('search') || goalLower.includes('find')) {
          shouldTry = true;
          params = { query: goal };
        }
        break;
        
      case 'navigation':
        if (goalLower.includes('go to') || goalLower.includes('navigate')) {
          shouldTry = true;
          // Extract target from goal
          const words = goal.split(' ');
          const targetIndex = words.findIndex(w => w.toLowerCase() === 'to');
          if (targetIndex >= 0 && targetIndex < words.length - 1) {
            params = { target: words.slice(targetIndex + 1).join(' ') };
          } else {
            params = { target: words[words.length - 1] };
          }
        }
        break;
        
      case 'dataExtract':
        if (goalLower.includes('extract') || goalLower.includes('download') || goalLower.includes('export')) {
          shouldTry = true;
          // Simple field extraction
          params = { fields: ['title', 'link', 'date'] };
        }
        break;
    }
    
    if (shouldTry) {
      try {
        const matches = await skill.match(miniPCD, params);
        for (const match of matches) {
          results.push({
            skillName,
            skill,
            confidence: match.confidence,
            params
          });
        }
      } catch (error) {
        console.warn(`Skill ${skillName} matching failed:`, error);
      }
    }
  }
  
  // Sort by confidence
  results.sort((a, b) => b.confidence - a.confidence);
  
  return results.filter(r => r.confidence > 0.5);
}
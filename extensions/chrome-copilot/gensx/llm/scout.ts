/**
 * PCD Scout - Read-only Helper for Deep Binding
 * Optional LLM helper for ambiguous element binding on complex pages
 */

import * as gensx from "@gensx/core";
import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "@gensx/vercel-ai";
import { z } from "zod";
import { 
  MiniPCD, 
  PCDActionDetail, 
  ActionBundle, 
  RoleSelector,
  ToolCall,
  ToolResult
} from '../../src/shared/types';

/**
 * PCD Scout parameters
 */
const ScoutInputSchema = z.object({
  query: z.string().describe("Natural language query for what to find"),
  miniPCD: z.object({
    url: z.string(),
    title: z.string(),
    actions: z.array(z.object({
      id: z.string(),
      label: z.string(),
      role: z.string(),
      kind: z.string().optional(),
      landmark: z.string().optional(),
      aboveFold: z.boolean().optional()
    })),
    forms: z.array(z.object({
      id: z.string(),
      purpose: z.string().optional(),
      fieldSummaries: z.array(z.object({
        label: z.string(),
        type: z.string(),
        required: z.boolean().optional()
      }))
    })),
    collections: z.array(z.object({
      id: z.string(),
      name: z.string(),
      itemFields: z.array(z.string())
    }))
  }),
  maxCandidates: z.number().optional().default(5),
  toolExecutor: z.function().args(z.any()).returns(z.promise(z.any()))
});

/**
 * Action Bundle output schema
 */
const ActionBundleSchema = z.object({
  selector: z.object({
    kind: z.enum(['role', 'text', 'css']),
    role: z.string().optional(),
    name: z.string().optional(),
    nameMode: z.enum(['exact', 'includes', 'regex']).optional(),
    text: z.string().optional(),
    css: z.string().optional(),
    withinLandmark: z.enum(['main', 'header', 'nav', 'footer', 'aside']).optional()
  }),
  altSelectors: z.array(z.object({
    kind: z.enum(['role', 'text', 'css']),
    role: z.string().optional(),
    name: z.string().optional(),
    text: z.string().optional(),
    css: z.string().optional()
  })).optional(),
  label: z.string(),
  kind: z.string().optional(),
  confidence: z.number().min(0).max(1),
  risk: z.enum(['low', 'medium', 'high']),
  why: z.string()
});

/**
 * PCD Scout Component
 */
export const PCDScout = gensx.Component(
  "PCDScout",
  async ({
    query,
    miniPCD,
    maxCandidates = 5,
    toolExecutor
  }: {
    query: string;
    miniPCD: MiniPCD;
    maxCandidates?: number;
    toolExecutor: (call: ToolCall) => Promise<ToolResult>;
  }): Promise<ActionBundle[]> => {
    
    console.log(`🕵️ PCD Scout analyzing query: "${query}"`);
    
    try {
      // First, get initial candidates using query
      const queryResult = await toolExecutor({
        name: 'pcd.query',
        args: { 
          tabId: 0, // Will be filled by caller
          text: query,
          topK: Math.min(maxCandidates * 2, 10)
        }
      });
      
      if (!queryResult.ok || !queryResult.data || !Array.isArray(queryResult.data) || queryResult.data.length === 0) {
        console.log('🕵️ No query results, returning empty action bundle');
        return [];
      }
      
      const candidates = queryResult.data.slice(0, maxCandidates);
      
      // Get details for candidates
      const detailsResult = await toolExecutor({
        name: 'getDetails',
        args: { tabId: 0, ids: candidates.map((c: any) => c.id) }
      });
      
      if (!detailsResult.ok || !detailsResult.data) {
        console.log('🕵️ Failed to get candidate details');
        return [];
      }
      
      const candidateDetails = detailsResult.data as PCDActionDetail[];
      
      // Use LLM to analyze and rank candidates
      const actionBundles = await analyzeWithLLM(
        query,
        miniPCD,
        candidates,
        candidateDetails
      );
      
      console.log(`🕵️ PCD Scout found ${actionBundles.length} action bundles`);
      
      return actionBundles;
      
    } catch (error) {
      console.error('🕵️ PCD Scout failed:', error);
      return [];
    }
  }
);

/**
 * Analyze candidates with LLM reasoning
 */
async function analyzeWithLLM(
  query: string,
  miniPCD: MiniPCD,
  candidates: any[],
  details: PCDActionDetail[]
): Promise<ActionBundle[]> {
  
  const model = anthropic("claude-3-5-sonnet-20241022");
  
  // Build context for LLM analysis
  const context = `
Page Context:
- URL: ${miniPCD.url}
- Title: ${miniPCD.title}
- Login State: ${miniPCD.loginState}

Available Actions (${miniPCD.actions.length}):
${miniPCD.actions.slice(0, 20).map(a => 
  `- ${a.role}: "${a.label}"${a.kind ? ` (${a.kind})` : ''}${a.landmark ? ` in ${a.landmark}` : ''}`
).join('\n')}

Available Forms (${miniPCD.forms.length}):
${miniPCD.forms.map(f => 
  `- ${f.purpose || 'Form'}: ${f.fieldSummaries.length} fields (${f.fieldSummaries.map(field => field.label).join(', ')})`
).join('\n')}

Query Candidates:
${candidates.map((c, i) => 
  `${i + 1}. ${c.label} (score: ${c.score.toFixed(2)})${c.kind ? ` - ${c.kind}` : ''}`
).join('\n')}
`;

  try {
    const result = await generateObject({
      model,
      schema: z.object({
        actionBundles: z.array(ActionBundleSchema).max(5)
      }),
      prompt: `You are analyzing a web page to help find the best elements for the user's query.

Query: "${query}"

${context}

Analyze the candidates and create action bundles for the most relevant ones. Consider:

1. **Relevance**: How well does the element match the query intent?
2. **Accessibility**: Does the element have good accessible names and roles?
3. **Context**: Is the element in an appropriate page section?
4. **Risk**: What's the risk of interacting with this element?
   - Low: Navigation, search, read-only actions
   - Medium: Form submissions, account changes
   - High: Destructive actions, payments, deletions

For each action bundle, provide:
- Primary selector (prefer role-based with accessible names)
- Alternative selectors as fallbacks
- Confidence score (0.0 to 1.0)
- Risk assessment
- Clear explanation of why this element matches

Focus on elements that are most likely to help achieve the user's goal. If multiple similar elements exist, choose the most accessible and reliable ones.`
    });

    return result.object.actionBundles.map(bundle => ({
      ...bundle,
      selector: bundle.selector as RoleSelector,
      altSelectors: (bundle.altSelectors || []) as RoleSelector[]
    }));

  } catch (error) {
    console.error('LLM analysis failed:', error);
    
    // Fallback: create simple action bundles from candidates
    return candidates.slice(0, 3).map((candidate, index) => {
      const detail = details.find(d => d.id === candidate.id);
      
      return {
        selector: detail?.selector || { kind: 'css' as const, css: `[data-pcd-id="${candidate.id}"]` },
        altSelectors: detail?.altSelectors || [],
        label: candidate.label,
        kind: candidate.kind,
        confidence: Math.max(0.3, candidate.score * 0.8),
        risk: inferRisk(candidate.label, candidate.kind),
        why: `Matched query with score ${candidate.score.toFixed(2)}`
      };
    });
  }
}

/**
 * Infer risk level from element properties
 */
function inferRisk(label: string, kind?: string): 'low' | 'medium' | 'high' {
  const labelLower = label.toLowerCase();
  
  // High risk patterns
  if (labelLower.includes('delete') || 
      labelLower.includes('remove') || 
      labelLower.includes('destroy') ||
      labelLower.includes('cancel') ||
      kind === 'checkout' ||
      kind === 'billing') {
    return 'high';
  }
  
  // Medium risk patterns
  if (labelLower.includes('submit') ||
      labelLower.includes('send') ||
      labelLower.includes('save') ||
      labelLower.includes('update') ||
      kind === 'login' ||
      kind === 'upload') {
    return 'medium';
  }
  
  // Low risk by default (navigation, search, read-only)
  return 'low';
}

/**
 * Simple PCD Scout for lightweight binding
 */
export async function simplePCDScout(
  query: string,
  miniPCD: MiniPCD,
  toolExecutor: (call: ToolCall) => Promise<ToolResult>,
  maxResults: number = 3
): Promise<ActionBundle[]> {
  
  console.log(`🕵️ Simple PCD Scout for: "${query}"`);
  
  try {
    // Score actions by relevance to query
    const scoredActions = miniPCD.actions
      .map(action => ({
        action,
        score: scoreActionRelevance(action, query)
      }))
      .filter(item => item.score > 0.3)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);
    
    // Score forms by relevance
    const scoredForms = miniPCD.forms
      .map(form => ({
        form,
        score: scoreFormRelevance(form, query)
      }))
      .filter(item => item.score > 0.3)
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(1, maxResults - scoredActions.length));
    
    const actionBundles: ActionBundle[] = [];
    
    // Convert actions to action bundles
    for (const { action, score } of scoredActions) {
      actionBundles.push({
        selector: {
          kind: 'role',
          role: action.role,
          name: action.label,
          nameMode: 'exact',
          withinLandmark: action.landmark
        },
        altSelectors: [
          { kind: 'text', text: action.label },
          { kind: 'css', css: `[data-pcd-id="${action.id}"]` }
        ],
        label: action.label,
        kind: action.kind,
        confidence: score,
        risk: inferRisk(action.label, action.kind),
        why: `Matched "${action.label}" with confidence ${score.toFixed(2)}`
      });
    }
    
    // Convert forms to action bundles
    for (const { form, score } of scoredForms) {
      actionBundles.push({
        selector: {
          kind: 'css',
          css: `[data-pcd-id="${form.id}"]`
        },
        altSelectors: [],
        label: form.purpose || `Form with ${form.fieldSummaries.length} fields`,
        kind: form.purpose,
        confidence: score,
        risk: inferRisk(form.purpose || 'form', form.purpose),
        why: `Form matches query with confidence ${score.toFixed(2)}`
      });
    }
    
    return actionBundles;
    
  } catch (error) {
    console.error('Simple PCD Scout failed:', error);
    return [];
  }
}

/**
 * Score action relevance to query
 */
function scoreActionRelevance(action: any, query: string): number {
  const queryLower = query.toLowerCase();
  const labelLower = action.label.toLowerCase();
  
  // Exact match
  if (labelLower === queryLower) return 0.95;
  
  // Contains query
  if (labelLower.includes(queryLower)) return 0.8;
  
  // Query contains label
  if (queryLower.includes(labelLower)) return 0.7;
  
  // Kind match
  if (action.kind && queryLower.includes(action.kind.toLowerCase())) return 0.6;
  
  // Word overlap
  const queryWords = queryLower.split(/\s+/);
  const labelWords = labelLower.split(/\s+/);
  const overlap = queryWords.filter(word => labelWords.includes(word));
  
  if (overlap.length > 0) {
    return 0.4 + (overlap.length / queryWords.length) * 0.2;
  }
  
  return 0;
}

/**
 * Score form relevance to query
 */
function scoreFormRelevance(form: any, query: string): number {
  const queryLower = query.toLowerCase();
  
  // Purpose match
  if (form.purpose && queryLower.includes(form.purpose.toLowerCase())) {
    return 0.8;
  }
  
  // Field label matches
  const fieldMatches = form.fieldSummaries.filter((field: any) =>
    queryLower.includes(field.label.toLowerCase()) ||
    field.label.toLowerCase().includes(queryLower)
  );
  
  if (fieldMatches.length > 0) {
    return 0.5 + (fieldMatches.length / form.fieldSummaries.length) * 0.2;
  }
  
  return 0;
}
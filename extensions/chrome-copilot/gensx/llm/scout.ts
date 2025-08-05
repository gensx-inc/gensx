/**
 * PCD Scout - Read-only Helper for Deep Binding
 * Optional LLM helper for ambiguous element binding on complex pages
 */

import * as gensx from "@gensx/core";
import { generateObject } from "@gensx/vercel-ai";
import { z } from "zod";
import {
  MiniPCD, ActionBundle,
  RoleSelector,
  ToolCall,
  ToolResult
} from '../../src/shared/types';
import { createOpenAI } from "@ai-sdk/openai";

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

    console.log(`🕵️ Flexible Scout analyzing query: "${query}"`);

    try {
      // Get page content using simple, reliable extraction
      const pageContentResult = await toolExecutor({
        name: 'dom_getPageContent',
        args: {
          tabId: 0, // Will be filled by caller
          includeLinks: true,
          includeClickables: true
        }
      });

      if (!pageContentResult.ok || !pageContentResult.data) {
        console.log(`🕵️ Page content extraction failed:`, pageContentResult);
        return [];
      }

      const pageContent = pageContentResult.data as {
        pageTitle: string;
        url: string;
        mainContent: string;
        clickableElements: Array<{
          text: string;
          tag: string;
          href?: string;
          isButton: boolean;
        }>;
        allText: string;
      };

      console.log(`🕵️ Page content extracted:`, {
        title: pageContent.pageTitle,
        mainContentLength: pageContent.mainContent.length,
        allTextLength: pageContent.allText.length,
        clickablesCount: pageContent.clickableElements.length
      });

      // Perform intelligent query analysis to find relevant content
      const relevantContent = await analyzeQueryAndExtractRelevantContent(
        query,
        pageContent,
        toolExecutor
      );

      // Use goal-oriented LLM analysis
      const actionBundles = await analyzeContentWithGoalOrientedLLM(
        query,
        pageContent,
        relevantContent,
        maxCandidates
      );

      console.log(`🕵️ Flexible Scout found ${actionBundles.length} action bundles:`);
      actionBundles.forEach((bundle, i) => {
        console.log(`🕵️ Bundle ${i + 1}:`, {
          label: bundle.label,
          selector: bundle.selector,
          confidence: bundle.confidence,
          risk: bundle.risk,
          why: bundle.why
        });
      });

      return actionBundles;

    } catch (error) {
      console.error('🕵️ Flexible Scout failed:', error);
      return [];
    }
  }
);

/**
 * Intelligently analyze query and extract relevant content
 */
async function analyzeQueryAndExtractRelevantContent(
  query: string,
  pageContent: {
    pageTitle: string;
    url: string;
    mainContent: string;
    clickableElements: Array<{
      text: string;
      tag: string;
      href?: string;
      isButton: boolean;
    }>;
    allText: string;
  },
  toolExecutor: (call: ToolCall) => Promise<ToolResult>
): Promise<{
  searchResults: any[];
  patterns: { type: string; matches: string[] }[];
  queryAnalysis: { intent: string; keywords: string[]; searchStrategy: string };
}> {

  console.log(`🔍 Analyzing query intent: "${query}"`);

  // Extract key terms from query
  const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 2);
  const queryAnalysis = {
    intent: inferQueryIntent(query),
    keywords: queryWords,
    searchStrategy: inferSearchStrategy(query)
  };

  console.log(`🔍 Query analysis:`, queryAnalysis);

  let searchResults: any[] = [];
  const patterns: { type: string; matches: string[] }[] = [];

  // Adaptive pattern detection based on query intent
  if (queryAnalysis.intent.includes('contact') || queryAnalysis.intent.includes('people') || queryAnalysis.intent.includes('team')) {
    // Look for contact patterns
    const emailMatches = pageContent.allText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    const phoneMatches = pageContent.allText.match(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g) || [];

    if (emailMatches.length > 0) patterns.push({ type: 'email', matches: [...new Set(emailMatches)] });
    if (phoneMatches.length > 0) patterns.push({ type: 'phone', matches: [...new Set(phoneMatches)] });
  }

  if (queryAnalysis.intent.includes('date') || queryAnalysis.intent.includes('schedule') || queryAnalysis.intent.includes('time')) {
    // Look for date/time patterns
    const dateMatches = pageContent.allText.match(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/g) || [];
    const timeMatches = pageContent.allText.match(/\b\d{1,2}:\d{2}\s?(AM|PM)?\b/gi) || [];

    if (dateMatches.length > 0) patterns.push({ type: 'date', matches: [...new Set(dateMatches)] });
    if (timeMatches.length > 0) patterns.push({ type: 'time', matches: [...new Set(timeMatches)] });
  }

  // Perform targeted searches based on query analysis
  const searchTargets = [
    ...queryAnalysis.keywords.slice(0, 4), // Primary keywords
    ...patterns.flatMap(p => p.matches.slice(0, 3)) // Pattern matches
  ];

  for (const target of searchTargets.slice(0, 10)) {
    try {
      const searchResult = await toolExecutor({
        name: 'dom_findByText',
        args: {
          tabId: 0,
          searchText: target,
          elementType: 'any',
          exactMatch: patterns.some(p => p.matches.includes(target)) // Exact match for detected patterns
        }
      });

      if (searchResult.ok && searchResult.data && Array.isArray(searchResult.data) && searchResult.data.length > 0) {
        console.log(`🔍 Found ${searchResult.data.length} elements for "${target}"`);
        searchResults.push(...searchResult.data.slice(0, 3)); // Limit per search
      }
    } catch (error) {
      console.log(`🔍 Search for "${target}" failed:`, error);
    }
  }

  // Remove duplicates
  const uniqueSearchResults = searchResults.filter((result, index) =>
    !searchResults.slice(0, index).some(prev =>
      prev.text === result.text &&
      Math.abs(prev.position.x - result.position.x) < 10 &&
      Math.abs(prev.position.y - result.position.y) < 10
    )
  );

  console.log(`🔍 Found ${uniqueSearchResults.length} unique search results and ${patterns.length} pattern types`);

  return {
    searchResults: uniqueSearchResults,
    patterns,
    queryAnalysis
  };
}

/**
 * Goal-oriented LLM analysis
 */
async function analyzeContentWithGoalOrientedLLM(
  query: string,
  pageContent: {
    pageTitle: string;
    url: string;
    mainContent: string;
    clickableElements: Array<{
      text: string;
      tag: string;
      href?: string;
      isButton: boolean;
    }>;
    allText: string;
  },
  relevantContent: {
    searchResults: any[];
    patterns: { type: string; matches: string[] }[];
    queryAnalysis: { intent: string; keywords: string[]; searchStrategy: string };
  },
  maxCandidates: number = 5
): Promise<ActionBundle[]> {

  const groqClient = createOpenAI({
    apiKey: process.env.GROQ_API_KEY!,
    baseURL: "https://api.groq.com/openai/v1",
  });

  // const model = anthropic("claude-3-7-sonnet-latest");

  const model = groqClient("moonshotai/kimi-k2-instruct");

  // Build goal-oriented context
  const context = `
QUERY ANALYSIS:
Intent: ${relevantContent.queryAnalysis.intent}
Keywords: ${relevantContent.queryAnalysis.keywords.join(', ')}
Strategy: ${relevantContent.queryAnalysis.searchStrategy}

PAGE INFORMATION:
Title: ${pageContent.pageTitle}
URL: ${pageContent.url}

DETECTED PATTERNS:
${relevantContent.patterns.map(pattern =>
  `${pattern.type.toUpperCase()}: ${pattern.matches.slice(0, 10).join(', ')}`
).join('\n')}

MAIN CONTENT:
${pageContent.mainContent}

CLICKABLE ELEMENTS:
${pageContent.clickableElements.slice(0, 15).map((el, i) =>
  `${i + 1}. [${el.tag}] "${el.text}"${el.href ? ` -> ${el.href}` : ''}${el.isButton ? ' (button)' : ''}`
).join('\n')}

SEARCH RESULTS (elements found by targeted search):
${relevantContent.searchResults.slice(0, 12).map((result, i) =>
  `${i + 1}. [${result.tagName}] "${result.text}"${result.clickable ? ' (clickable)' : ''}${result.href ? ` -> ${result.href}` : ''} @(${result.position.x},${result.position.y})`
).join('\n')}
`;

  console.log(`🕵️ Goal-oriented context:`, context.substring(0, 800) + '...');

  try {
    const result = await generateObject({
      model,
      schema: z.object({
        actionBundles: z.array(ActionBundleSchema).max(Math.min(maxCandidates * 2, 15))
      }),
      prompt: `You are a flexible web page analyzer that adapts to different query types and goals.

USER QUERY: "${query}"

ANALYSIS CONTEXT:
${context}

Your goal is to identify the most relevant elements/content based on the user's query intent and the detected patterns on the page.

ADAPTIVE ANALYSIS APPROACH:
1. **Query Intent**: ${relevantContent.queryAnalysis.intent}
2. **Search Strategy**: ${relevantContent.queryAnalysis.searchStrategy}
3. **Detected Patterns**: ${relevantContent.patterns.map(p => p.type).join(', ')}

INSTRUCTIONS:
- Analyze the SEARCH RESULTS first - these are elements that contain relevant terms from the query
- Consider the DETECTED PATTERNS that match the query intent
- Look at CLICKABLE ELEMENTS for interactive opportunities
- Use MAIN CONTENT for context and additional relevant information

CREATE ACTION BUNDLES that match the query goal:
- For information queries: Create bundles for relevant content/data found
- For action queries: Create bundles for clickable elements that enable the action
- For navigation queries: Create bundles for links and navigation elements
- For form/input queries: Create bundles for input fields and forms

SELECTOR STRATEGY:
- Use text selectors for visible content that matches the query
- Use role selectors for interactive elements (buttons, links)
- Prefer exact matches from SEARCH RESULTS and DETECTED PATTERNS
- Include alternative selectors when possible

QUALITY GUIDELINES:
- **Confidence**: High (0.8+) for exact matches, Medium (0.5-0.8) for partial matches, Low (0.3-0.5) for inferred
- **Risk**: Low for viewing/reading, Medium for form submission/actions, High for destructive operations
- **Completeness**: Create individual bundles for each distinct relevant item found
- **Relevance**: Only include elements that directly serve the user's query goal

Focus on helping the user achieve their specific goal rather than just finding generic page elements.`
    });

    return result.object.actionBundles.map(bundle => ({
      ...bundle,
      selector: bundle.selector as RoleSelector,
      altSelectors: (bundle.altSelectors || []) as RoleSelector[]
    }));

  } catch (error) {
    console.error('Goal-oriented LLM analysis failed:', error);

    // Intelligent fallback based on query analysis
    return createFallbackActionBundles(query, pageContent, relevantContent);
  }
}

/**
 * Infer query intent from natural language
 */
function inferQueryIntent(query: string): string {
  const queryLower = query.toLowerCase();

  // Contact/People patterns
  if (queryLower.includes('team') || queryLower.includes('member') || queryLower.includes('people') ||
      queryLower.includes('contact') || queryLower.includes('email') || queryLower.includes('staff')) {
    return 'contact/people information';
  }

  // Navigation patterns
  if (queryLower.includes('go to') || queryLower.includes('navigate') || queryLower.includes('find page') ||
      queryLower.includes('open') || queryLower.includes('visit')) {
    return 'navigation/routing';
  }

  // Action patterns
  if (queryLower.includes('click') || queryLower.includes('submit') || queryLower.includes('send') ||
      queryLower.includes('create') || queryLower.includes('add') || queryLower.includes('delete')) {
    return 'action/interaction';
  }

  // Form/Input patterns
  if (queryLower.includes('fill') || queryLower.includes('enter') || queryLower.includes('type') ||
      queryLower.includes('select') || queryLower.includes('choose')) {
    return 'form/input';
  }

  // Information/Reading patterns
  if (queryLower.includes('what') || queryLower.includes('who') || queryLower.includes('when') ||
      queryLower.includes('where') || queryLower.includes('how') || queryLower.includes('show') ||
      queryLower.includes('list') || queryLower.includes('display')) {
    return 'information/reading';
  }

  // Date/Time patterns
  if (queryLower.includes('date') || queryLower.includes('time') || queryLower.includes('schedule') ||
      queryLower.includes('calendar') || queryLower.includes('event')) {
    return 'date/time information';
  }

  return 'general information';
}

/**
 * Infer search strategy based on query
 */
function inferSearchStrategy(query: string): string {
  const queryLower = query.toLowerCase();

  if (queryLower.includes('all') || queryLower.includes('every') || queryLower.includes('list')) {
    return 'comprehensive search';
  }

  if (queryLower.includes('first') || queryLower.includes('main') || queryLower.includes('primary')) {
    return 'primary match';
  }

  if (queryLower.includes('specific') || queryLower.includes('exact') || queryLower.includes('particular')) {
    return 'exact match';
  }

  return 'relevant matches';
}

/**
 * Create intelligent fallback action bundles
 */
function createFallbackActionBundles(
  query: string,
  pageContent: any,
  relevantContent: any
): ActionBundle[] {
  const bundles: ActionBundle[] = [];

  // Use detected patterns as primary fallback
  for (const pattern of relevantContent.patterns) {
    for (const match of pattern.matches.slice(0, 3)) {
      bundles.push({
        selector: { kind: 'text', text: match },
        altSelectors: [],
        label: `${pattern.type}: ${match}`,
        kind: pattern.type,
        confidence: 0.7,
        risk: 'low' as const,
        why: `Detected ${pattern.type} pattern matching query intent`
      });
    }
  }

  // Add search results as secondary fallback
  for (const result of relevantContent.searchResults.slice(0, Math.max(3, 5 - bundles.length))) {
    bundles.push({
      selector: { kind: 'text', text: result.text },
      altSelectors: result.clickable ? [{ kind: 'role', role: 'button', name: result.text }] : [],
      label: result.text,
      kind: undefined,
      confidence: 0.6,
      risk: result.clickable ? 'medium' as const : 'low' as const,
      why: `Search result containing query terms`
    });
  }

  // Final fallback to clickable elements
  if (bundles.length === 0) {
    const queryWords = query.toLowerCase().split(/\s+/);
    const matchingClickables = pageContent.clickableElements.filter((el: any) =>
      queryWords.some(word => el.text.toLowerCase().includes(word))
    );

    for (const clickable of matchingClickables.slice(0, 3)) {
      bundles.push({
        selector: { kind: 'text', text: clickable.text },
        altSelectors: [{ kind: 'role', role: clickable.isButton ? 'button' : 'link', name: clickable.text }],
        label: clickable.text,
        kind: undefined,
        confidence: 0.5,
        risk: inferRisk(clickable.text, undefined),
        why: `Clickable element matching query terms`
      });
    }
  }

  return bundles.slice(0, 5);
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

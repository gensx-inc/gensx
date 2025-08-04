/**
 * Beam Search Exploration Policy
 * Implements systematic multi-tab exploration with goal-directed search
 */

import { MiniPCD, SiteGraph, SiteGraphNode, SiteGraphEdge, Task } from '../../src/shared/types';
import { EXPLORATION_CONFIG } from '../../src/shared/constants';
import { getBestGoalMatch } from './goalPredicates';

/**
 * Exploration Result
 */
export interface ExplorationResult {
  success: boolean;
  bestTabId?: number;
  bestScore?: number;
  exploredUrls: string[];
  message?: string;
}

/**
 * Exploration Candidate
 */
interface ExplorationCandidate {
  tabId: number;
  url: string;
  title: string;
  miniPCD?: MiniPCD;
  goalScore: number;
  depth: number;
  parentUrl?: string;
  actionTaken?: string;
}

/**
 * Beam Search Explorer
 */
export class BeamSearchExplorer {
  private goal: string;
  private siteGraph: SiteGraph;
  private candidates: ExplorationCandidate[] = [];
  private visited: Set<string> = new Set();
  private maxDepth: number;
  private beamWidth: number;
  
  constructor(
    goal: string,
    siteGraph: SiteGraph,
    options: {
      maxDepth?: number;
      beamWidth?: number;
    } = {}
  ) {
    this.goal = goal;
    this.siteGraph = siteGraph;
    this.maxDepth = options.maxDepth || EXPLORATION_CONFIG.MAX_DEPTH;
    this.beamWidth = options.beamWidth || EXPLORATION_CONFIG.BEAM_WIDTH;
  }
  
  /**
   * Execute beam search exploration
   */
  async explore(
    startingTabId: number,
    toolExecutor: (call: any) => Promise<any>
  ): Promise<ExplorationResult> {
    
    console.log(`🔍 Starting beam search exploration for goal: "${this.goal}"`);
    
    try {
      // Initialize with starting tab
      const startCandidate = await this.initializeCandidate(startingTabId, toolExecutor);
      if (!startCandidate) {
        return {
          success: false,
          exploredUrls: [],
          message: 'Failed to initialize starting candidate'
        };
      }
      
      this.candidates = [startCandidate];
      this.visited.add(startCandidate.url);
      
      // Beam search iterations
      for (let depth = 0; depth < this.maxDepth; depth++) {
        console.log(`🔍 Exploration depth ${depth + 1}/${this.maxDepth}, beam size: ${this.candidates.length}`);
        
        // Check if any current candidate satisfies the goal
        const goalCandidate = await this.checkGoalSatisfaction();
        if (goalCandidate) {
          await this.cleanup(goalCandidate.tabId);
          return {
            success: true,
            bestTabId: goalCandidate.tabId,
            bestScore: goalCandidate.goalScore,
            exploredUrls: Array.from(this.visited),
            message: `Goal achieved at depth ${depth}`
          };
        }
        
        // Expand candidates
        const newCandidates = await this.expandCandidates(toolExecutor, depth + 1);
        
        if (newCandidates.length === 0) {
          console.log('🔍 No new candidates to explore');
          break;
        }
        
        // Select best candidates for next iteration
        this.candidates = this.selectBestCandidates([...this.candidates, ...newCandidates]);
        
        // Close tabs for candidates not selected
        await this.pruneUnselectedTabs(newCandidates);
      }
      
      // Return best candidate if no goal satisfaction
      const bestCandidate = this.candidates.reduce((best, current) => 
        current.goalScore > best.goalScore ? current : best
      );
      
      await this.cleanup(bestCandidate.tabId);
      
      return {
        success: bestCandidate.goalScore >= EXPLORATION_CONFIG.GOAL_SCORE_THRESHOLD,
        bestTabId: bestCandidate.tabId,
        bestScore: bestCandidate.goalScore,
        exploredUrls: Array.from(this.visited),
        message: `Best candidate found with score ${bestCandidate.goalScore.toFixed(2)}`
      };
      
    } catch (error) {
      console.error('🔍 Exploration failed:', error);
      
      // Cleanup all tabs
      await this.cleanupAll();
      
      return {
        success: false,
        exploredUrls: Array.from(this.visited),
        message: error instanceof Error ? error.message : 'Exploration error'
      };
    }
  }
  
  /**
   * Initialize a candidate from a tab
   */
  private async initializeCandidate(
    tabId: number,
    toolExecutor: (call: any) => Promise<any>,
    depth: number = 0,
    parentUrl?: string,
    actionTaken?: string
  ): Promise<ExplorationCandidate | null> {
    
    try {
      // Get MiniPCD for the tab
      const pcdResult = await toolExecutor({
        name: 'getMiniPCD',
        args: { tabId }
      });
      
      if (!pcdResult.ok || !pcdResult.data) {
        console.warn(`Failed to get MiniPCD for tab ${tabId}`);
        return null;
      }
      
      const miniPCD = pcdResult.data as MiniPCD;
      
      // Calculate goal score
      const goalScore = await this.calculateGoalScore(miniPCD);
      
      const candidate: ExplorationCandidate = {
        tabId,
        url: miniPCD.url,
        title: miniPCD.title,
        miniPCD,
        goalScore,
        depth,
        parentUrl,
        actionTaken
      };
      
      // Update site graph
      this.updateSiteGraph(candidate);
      
      return candidate;
      
    } catch (error) {
      console.warn(`Failed to initialize candidate for tab ${tabId}:`, error);
      return null;
    }
  }
  
  /**
   * Check if any candidate satisfies the goal
   */
  private async checkGoalSatisfaction(): Promise<ExplorationCandidate | null> {
    for (const candidate of this.candidates) {
      if (candidate.miniPCD) {
        const goalMatch = await getBestGoalMatch(this.goal, candidate.miniPCD);
        
        if (goalMatch && goalMatch.result.satisfied && 
            goalMatch.result.confidence >= EXPLORATION_CONFIG.GOAL_SCORE_THRESHOLD) {
          
          console.log(`🎯 Goal satisfied by candidate: ${candidate.url} (${goalMatch.result.confidence.toFixed(2)})`);
          return candidate;
        }
      }
    }
    
    return null;
  }
  
  /**
   * Expand candidates by exploring navigation options
   */
  private async expandCandidates(
    toolExecutor: (call: any) => Promise<any>,
    nextDepth: number
  ): Promise<ExplorationCandidate[]> {
    
    const newCandidates: ExplorationCandidate[] = [];
    
    for (const candidate of this.candidates) {
      if (!candidate.miniPCD || candidate.depth >= this.maxDepth - 1) {
        continue;
      }
      
      // Find navigation actions for this candidate
      const navActions = this.findNavigationActions(candidate.miniPCD);
      
      // Limit exploration per candidate
      const limitedActions = navActions.slice(0, 2);
      
      for (const action of limitedActions) {
        try {
          // Get details for the action
          const detailsResult = await toolExecutor({
            name: 'getDetails',
            args: { tabId: candidate.tabId, ids: [action.id] }
          });
          
          if (!detailsResult.ok || !detailsResult.data || detailsResult.data.length === 0) {
            continue;
          }
          
          const actionDetail = detailsResult.data[0];
          
          // Open new tab with the action
          const newTabResult = await this.executeNavigationAction(
            candidate.tabId,
            actionDetail,
            toolExecutor
          );
          
          if (newTabResult) {
            const newCandidate = await this.initializeCandidate(
              newTabResult.tabId,
              toolExecutor,
              nextDepth,
              candidate.url,
              action.label
            );
            
            if (newCandidate && !this.visited.has(newCandidate.url)) {
              newCandidates.push(newCandidate);
              this.visited.add(newCandidate.url);
            } else if (newCandidate) {
              // Close duplicate tab
              await this.closeTab(newCandidate.tabId);
            }
          }
          
        } catch (error) {
          console.warn(`Failed to expand candidate ${candidate.url} with action ${action.label}:`, error);
        }
      }
    }
    
    console.log(`🔍 Expanded to ${newCandidates.length} new candidates`);
    return newCandidates;
  }
  
  /**
   * Execute navigation action to create new tab
   */
  private async executeNavigationAction(
    sourceTabId: number,
    actionDetail: any,
    toolExecutor: (call: any) => Promise<any>
  ): Promise<{ tabId: number } | null> {
    
    try {
      // For links, we can extract href and open directly
      if (actionDetail.selector.kind === 'role' && actionDetail.selector.role === 'link') {
        // Try to get href from the element
        const hrefResult = await toolExecutor({
          name: 'dom.extract',
          args: { 
            tabId: sourceTabId, 
            collectionId: actionDetail.id,
            fields: ['href'] 
          }
        });
        
        if (hrefResult.ok && hrefResult.data && hrefResult.data[0]?.href) {
          const href = hrefResult.data[0].href;
          const fullUrl = new URL(href, actionDetail.url || '').toString();
          
          const newTabResult = await toolExecutor({
            name: 'tabs.open',
            args: { url: fullUrl }
          });
          
          if (newTabResult.ok) {
            return { tabId: newTabResult.data.tabId };
          }
        }
      }
      
      // Fallback: click action in current tab, then duplicate tab
      const clickResult = await toolExecutor({
        name: 'dom.click',
        args: { tabId: sourceTabId, selector: actionDetail.selector }
      });
      
      if (clickResult.ok) {
        // Wait for navigation
        await toolExecutor({
          name: 'dom.waitFor',
          args: { 
            tabId: sourceTabId, 
            event: 'urlChange', 
            timeoutMs: 3000 
          }
        });
        
        // Duplicate the tab
        const tab = await chrome.tabs.get(sourceTabId);
        const newTab = await chrome.tabs.create({ 
          url: tab.url,
          active: false 
        });
        
        return { tabId: newTab.id! };
      }
      
      return null;
      
    } catch (error) {
      console.warn('Failed to execute navigation action:', error);
      return null;
    }
  }
  
  /**
   * Find navigation actions in MiniPCD
   */
  private findNavigationActions(miniPCD: MiniPCD) {
    const navActions = [];
    
    // Look for links and buttons that might lead to relevant pages
    for (const action of miniPCD.actions) {
      const score = this.scoreNavigationAction(action);
      
      if (score > 0.3) {
        navActions.push({ ...action, navScore: score });
      }
    }
    
    // Sort by navigation score
    navActions.sort((a, b) => b.navScore - a.navScore);
    
    return navActions;
  }
  
  /**
   * Score navigation action for relevance to goal
   */
  private scoreNavigationAction(action: any): number {
    let score = 0;
    const goalLower = this.goal.toLowerCase();
    const labelLower = action.label.toLowerCase();
    
    // Exact match
    if (labelLower.includes(goalLower)) {
      score += 0.8;
    }
    
    // Keyword overlap
    const goalWords = goalLower.split(/\s+/);
    const labelWords = labelLower.split(/\s+/);
    const overlap = goalWords.filter(word => labelWords.includes(word));
    score += (overlap.length / goalWords.length) * 0.6;
    
    // Role-based scoring
    if (action.role === 'link') {
      score += 0.3; // Links are good for navigation
    } else if (action.role === 'button' && action.kind === 'navigation') {
      score += 0.4;
    }
    
    // Landmark-based scoring
    if (action.landmark === 'nav') {
      score += 0.2; // Navigation area links
    } else if (action.landmark === 'main') {
      score += 0.1; // Main content links
    }
    
    // Above fold bonus
    if (action.aboveFold) {
      score += 0.1;
    }
    
    return Math.min(score, 1.0);
  }
  
  /**
   * Select best candidates for next iteration
   */
  private selectBestCandidates(allCandidates: ExplorationCandidate[]): ExplorationCandidate[] {
    // Sort by goal score
    allCandidates.sort((a, b) => b.goalScore - a.goalScore);
    
    // Take top candidates within beam width
    return allCandidates.slice(0, this.beamWidth);
  }
  
  /**
   * Prune unselected tabs to free resources
   */
  private async pruneUnselectedTabs(newCandidates: ExplorationCandidate[]): Promise<void> {
    const selectedTabIds = new Set(this.candidates.map(c => c.tabId));
    
    for (const candidate of newCandidates) {
      if (!selectedTabIds.has(candidate.tabId)) {
        await this.closeTab(candidate.tabId);
      }
    }
  }
  
  /**
   * Calculate goal score for a MiniPCD
   */
  private async calculateGoalScore(miniPCD: MiniPCD): Promise<number> {
    try {
      // Use goal predicates for scoring
      const goalMatch = await getBestGoalMatch(this.goal, miniPCD);
      
      if (goalMatch && goalMatch.result.satisfied) {
        return goalMatch.result.confidence;
      }
      
      // Fallback to simple heuristic scoring
      return this.heuristicGoalScore(miniPCD);
      
    } catch (error) {
      console.warn('Goal scoring failed, using heuristic:', error);
      return this.heuristicGoalScore(miniPCD);
    }
  }
  
  /**
   * Heuristic goal scoring
   */
  private heuristicGoalScore(miniPCD: MiniPCD): number {
    let score = 0;
    const goalLower = this.goal.toLowerCase();
    
    // URL scoring
    if (miniPCD.url.toLowerCase().includes(goalLower.split(' ')[0])) {
      score += 0.3;
    }
    
    // Title scoring
    if (miniPCD.title.toLowerCase().includes(goalLower.split(' ')[0])) {
      score += 0.2;
    }
    
    // Action relevance
    const relevantActions = miniPCD.actions.filter(action =>
      action.label.toLowerCase().includes(goalLower) ||
      (action.kind && goalLower.includes(action.kind))
    );
    
    score += Math.min(relevantActions.length * 0.1, 0.3);
    
    // Form relevance
    const relevantForms = miniPCD.forms.filter(form =>
      form.purpose && goalLower.includes(form.purpose)
    );
    
    score += Math.min(relevantForms.length * 0.2, 0.4);
    
    return Math.min(score, 1.0);
  }
  
  /**
   * Update site graph with candidate information
   */
  private updateSiteGraph(candidate: ExplorationCandidate): void {
    const node: SiteGraphNode = {
      url: candidate.url,
      title: candidate.title,
      visitedAt: Date.now(),
      goalScore: candidate.goalScore,
      miniPCD: candidate.miniPCD
    };
    
    this.siteGraph.nodes.set(candidate.url, node);
    
    // Add edge if there's a parent
    if (candidate.parentUrl) {
      const edges = this.siteGraph.edges.get(candidate.parentUrl) || [];
      
      const edge: SiteGraphEdge = {
        from: candidate.parentUrl,
        to: candidate.url,
        action: {
          id: 'exploration',
          label: candidate.actionTaken || 'navigate',
          role: 'link'
        } as any,
        confidence: candidate.goalScore
      };
      
      edges.push(edge);
      this.siteGraph.edges.set(candidate.parentUrl, edges);
    }
  }
  
  /**
   * Close a tab
   */
  private async closeTab(tabId: number): Promise<void> {
    try {
      await chrome.tabs.remove(tabId);
    } catch (error) {
      console.warn(`Failed to close tab ${tabId}:`, error);
    }
  }
  
  /**
   * Cleanup all tabs except the best one
   */
  private async cleanup(keepTabId: number): Promise<void> {
    const tabsToClose = this.candidates
      .map(c => c.tabId)
      .filter(id => id !== keepTabId);
    
    for (const tabId of tabsToClose) {
      await this.closeTab(tabId);
    }
  }
  
  /**
   * Cleanup all exploration tabs
   */
  private async cleanupAll(): Promise<void> {
    for (const candidate of this.candidates) {
      await this.closeTab(candidate.tabId);
    }
  }
}

/**
 * Main exploration function
 */
export async function performBeamSearchExploration(
  goal: string,
  startingTabId: number,
  siteGraph: SiteGraph,
  toolExecutor: (call: any) => Promise<any>,
  options: {
    maxDepth?: number;
    beamWidth?: number;
  } = {}
): Promise<ExplorationResult> {
  
  const explorer = new BeamSearchExplorer(goal, siteGraph, options);
  return await explorer.explore(startingTabId, toolExecutor);
}

/**
 * Simple exploration for testing
 */
export async function simpleExploration(
  goal: string,
  startingTabId: number,
  toolExecutor: (call: any) => Promise<any>
): Promise<ExplorationResult> {
  
  try {
    // Get current page state
    const pcdResult = await toolExecutor({
      name: 'getMiniPCD',
      args: { tabId: startingTabId }
    });
    
    if (!pcdResult.ok) {
      return {
        success: false,
        exploredUrls: [],
        message: 'Failed to get current page state'
      };
    }
    
    const miniPCD = pcdResult.data as MiniPCD;
    
    // Query for relevant actions
    const queryResult = await toolExecutor({
      name: 'pcd.query',
      args: { 
        tabId: startingTabId, 
        text: goal, 
        topK: 3 
      }
    });
    
    if (!queryResult.ok || !queryResult.data || queryResult.data.length === 0) {
      return {
        success: false,
        exploredUrls: [miniPCD.url],
        message: 'No relevant actions found'
      };
    }
    
    // Try the most relevant action
    const bestAction = queryResult.data[0];
    
    const detailsResult = await toolExecutor({
      name: 'getDetails',
      args: { tabId: startingTabId, ids: [bestAction.id] }
    });
    
    if (!detailsResult.ok || !detailsResult.data || detailsResult.data.length === 0) {
      return {
        success: false,
        exploredUrls: [miniPCD.url],
        message: 'Failed to get action details'
      };
    }
    
    const actionDetail = detailsResult.data[0];
    
    // Execute the action
    const clickResult = await toolExecutor({
      name: 'dom.click',
      args: { tabId: startingTabId, selector: actionDetail.selector }
    });
    
    if (clickResult.ok) {
      // Wait for any navigation
      await toolExecutor({
        name: 'dom.waitFor',
        args: { 
          tabId: startingTabId, 
          event: 'urlChange', 
          timeoutMs: 3000 
        }
      });
      
      // Get updated page state
      const updatedPcdResult = await toolExecutor({
        name: 'getMiniPCD',
        args: { tabId: startingTabId }
      });
      
      const updatedMiniPCD = updatedPcdResult.ok ? updatedPcdResult.data : miniPCD;
      
      return {
        success: true,
        bestTabId: startingTabId,
        bestScore: 0.7,
        exploredUrls: [miniPCD.url, updatedMiniPCD.url].filter((url, index, arr) => arr.indexOf(url) === index),
        message: `Executed action: ${bestAction.label}`
      };
    }
    
    return {
      success: false,
      exploredUrls: [miniPCD.url],
      message: `Failed to execute action: ${bestAction.label}`
    };
    
  } catch (error) {
    return {
      success: false,
      exploredUrls: [],
      message: error instanceof Error ? error.message : 'Exploration error'
    };
  }
}
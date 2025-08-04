/**
 * Web Worker for Relevancy Scoring
 * Runs deterministic scoring (BM25/substring/fuzzy) in background
 * Event-driven: only on subgoal change, navigation, or after actions
 */

import { PERFORMANCE_LIMITS, SCORING_WEIGHTS } from '../shared/constants';

// Worker context types
interface ScoringRequest {
  type: 'score';
  subgoal: string;
  candidates: Array<{
    id: string;
    label: string;
    kind?: string;
    landmark?: string;
    aboveFold?: boolean;
    context: string; // Additional context for scoring
  }>;
  requestId: string;
}

interface ScoringResponse {
  type: 'score_result';
  requestId: string;
  scores: Array<{
    id: string;
    score: number;
    reasons: string[];
  }>;
  processingTime: number;
}

// BM25 scoring implementation
class BM25Scorer {
  private k1 = 1.2;
  private b = 0.75;
  private documents: Array<{ id: string; tokens: string[]; length: number }> = [];
  private avgDocLength = 0;
  private idf: Map<string, number> = new Map();

  constructor(documents: Array<{ id: string; text: string }>) {
    this.buildIndex(documents);
  }

  private buildIndex(documents: Array<{ id: string; text: string }>) {
    // Tokenize documents
    this.documents = documents.map(doc => {
      const tokens = this.tokenize(doc.text);
      return {
        id: doc.id,
        tokens,
        length: tokens.length
      };
    });

    // Calculate average document length
    this.avgDocLength = this.documents.reduce((sum, doc) => sum + doc.length, 0) / this.documents.length;

    // Calculate IDF for each term
    const termDocCount = new Map<string, number>();
    
    for (const doc of this.documents) {
      const uniqueTerms = new Set(doc.tokens);
      for (const term of uniqueTerms) {
        termDocCount.set(term, (termDocCount.get(term) || 0) + 1);
      }
    }

    for (const [term, docCount] of termDocCount) {
      this.idf.set(term, Math.log((this.documents.length - docCount + 0.5) / (docCount + 0.5)));
    }
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 0);
  }

  score(query: string, documentId: string): number {
    const queryTerms = this.tokenize(query);
    const doc = this.documents.find(d => d.id === documentId);
    
    if (!doc) return 0;

    let score = 0;
    
    for (const term of queryTerms) {
      const termFreq = doc.tokens.filter(t => t === term).length;
      const idf = this.idf.get(term) || 0;
      
      const numerator = termFreq * (this.k1 + 1);
      const denominator = termFreq + this.k1 * (1 - this.b + this.b * (doc.length / this.avgDocLength));
      
      score += idf * (numerator / denominator);
    }
    
    return score;
  }
}

// Fuzzy string matching using Levenshtein distance
function levenshteinDistance(a: string, b: string): number {
  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));

  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,     // deletion
        matrix[j - 1][i] + 1,     // insertion
        matrix[j - 1][i - 1] + indicator  // substitution
      );
    }
  }

  return matrix[b.length][a.length];
}

function fuzzyScore(query: string, text: string): number {
  if (!query || !text) return 0;
  
  const distance = levenshteinDistance(query.toLowerCase(), text.toLowerCase());
  const maxLength = Math.max(query.length, text.length);
  
  return 1 - (distance / maxLength);
}

// Main scoring function
function scoreCandidate(
  subgoal: string,
  candidate: ScoringRequest['candidates'][0],
  bm25Scorer: BM25Scorer
): { score: number; reasons: string[] } {
  
  const reasons: string[] = [];
  let totalScore = 0;

  const lowerSubgoal = subgoal.toLowerCase();
  const lowerLabel = candidate.label.toLowerCase();
  const lowerContext = candidate.context.toLowerCase();

  // Exact match bonus
  if (lowerLabel === lowerSubgoal) {
    totalScore += SCORING_WEIGHTS.EXACT_MATCH;
    reasons.push('Exact label match');
  }

  // Partial match
  if (lowerLabel.includes(lowerSubgoal)) {
    totalScore += SCORING_WEIGHTS.PARTIAL_MATCH;
    reasons.push('Partial label match');
  }

  // Context match
  if (lowerContext.includes(lowerSubgoal)) {
    totalScore += SCORING_WEIGHTS.PARTIAL_MATCH * 0.5;
    reasons.push('Context match');
  }

  // Kind match
  if (candidate.kind && lowerSubgoal.includes(candidate.kind.toLowerCase())) {
    totalScore += SCORING_WEIGHTS.PARTIAL_MATCH * 0.3;
    reasons.push('Kind match');
  }

  // BM25 score
  const bm25Score = bm25Scorer.score(subgoal, candidate.id);
  if (bm25Score > 0) {
    totalScore += Math.min(bm25Score / 10, 0.5); // Normalize BM25 score
    reasons.push(`BM25 relevance: ${bm25Score.toFixed(2)}`);
  }

  // Fuzzy matching
  const fuzzyLabelScore = fuzzyScore(subgoal, candidate.label);
  if (fuzzyLabelScore > 0.7) {
    totalScore += SCORING_WEIGHTS.FUZZY_MATCH * fuzzyLabelScore;
    reasons.push(`Fuzzy match: ${(fuzzyLabelScore * 100).toFixed(0)}%`);
  }

  // Above fold bonus
  if (candidate.aboveFold) {
    totalScore += SCORING_WEIGHTS.ABOVE_FOLD_BONUS;
    reasons.push('Above fold');
  }

  // Landmark bonus
  if (candidate.landmark === 'main') {
    totalScore += SCORING_WEIGHTS.LANDMARK_BONUS;
    reasons.push('In main content');
  }

  return { score: Math.max(0, totalScore), reasons };
}

// Time-sliced processing
async function processWithTimeSlicing<T>(
  items: T[],
  processor: (item: T, index: number) => any,
  maxSliceTime: number = PERFORMANCE_LIMITS.MAX_SLICE_TIME_MS
): Promise<any[]> {
  
  const results: any[] = [];
  let currentIndex = 0;
  
  while (currentIndex < items.length) {
    const sliceStart = performance.now();
    
    // Process items until time slice is exhausted
    while (currentIndex < items.length && 
           (performance.now() - sliceStart) < maxSliceTime) {
      
      const result = processor(items[currentIndex], currentIndex);
      results.push(result);
      currentIndex++;
    }
    
    // Yield control if there are more items to process
    if (currentIndex < items.length) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
  
  return results;
}

// Main message handler
self.onmessage = async (event: MessageEvent<ScoringRequest>) => {
  const { type, subgoal, candidates, requestId } = event.data;
  
  if (type !== 'score') {
    return;
  }

  const startTime = performance.now();
  
  try {
    // Limit candidates to prevent overload
    const limitedCandidates = candidates.slice(0, PERFORMANCE_LIMITS.MAX_CANDIDATES_PER_CYCLE);
    
    // Prepare documents for BM25
    const documents = limitedCandidates.map(candidate => ({
      id: candidate.id,
      text: `${candidate.label} ${candidate.context} ${candidate.kind || ''}`
    }));
    
    const bm25Scorer = new BM25Scorer(documents);
    
    // Process candidates with time slicing
    const scoredCandidates = await processWithTimeSlicing(
      limitedCandidates,
      (candidate) => {
        const { score, reasons } = scoreCandidate(subgoal, candidate, bm25Scorer);
        return {
          id: candidate.id,
          score,
          reasons
        };
      }
    );
    
    // Sort by score (highest first)
    scoredCandidates.sort((a, b) => b.score - a.score);
    
    const processingTime = performance.now() - startTime;
    
    const response: ScoringResponse = {
      type: 'score_result',
      requestId,
      scores: scoredCandidates,
      processingTime
    };
    
    self.postMessage(response);
    
  } catch (error) {
    // Send error response
    const errorResponse = {
      type: 'score_error',
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: performance.now() - startTime
    };
    
    self.postMessage(errorResponse);
  }
};

// Handle worker initialization
self.postMessage({
  type: 'worker_ready',
  timestamp: Date.now()
});

export {}; // Make this a module
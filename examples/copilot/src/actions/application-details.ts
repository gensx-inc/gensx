"use server";

import { SearchClient } from "@gensx/storage";

export interface ApplicationDetail {
  id: string;
  path: string;
  content: string;
  important?: boolean;
  timestamp: number;
}

export interface PaginatedApplicationDetails {
  details: ApplicationDetail[];
  totalCount: number;
  hasMore: boolean;
  nextCursor?: string;
}

export async function getApplicationDetails(
  userId: string,
  options: {
    page?: number;
    pageSize?: number;
    sortBy?: "path" | "timestamp";
    sortOrder?: "asc" | "desc";
    pathFilter?: string;
    importantOnly?: boolean;
  } = {}
): Promise<PaginatedApplicationDetails> {
  const {
    page = 1,
    pageSize = 50,
    sortBy = "path",
    sortOrder = "asc",
    pathFilter,
    importantOnly = false,
  } = options;

  try {
    const searchClient = new SearchClient();

    const domain = "localhost"; // Default domain for local development
    const searchIndex = await searchClient.getNamespace(`application-memory/${userId}/${domain}`);

    // Build filters
    let filters: Parameters<typeof searchIndex.query>[0]['filters'] = undefined;
    if (pathFilter && importantOnly) {
      filters = ['And', [['Or' , [['path', 'Contains', pathFilter], ['path', 'Glob', pathFilter]]], ['important', 'Eq', true]]];
    } else if (pathFilter) {
      filters = ['path', 'Contains', pathFilter];
    } else if (importantOnly) {
      filters = ['important', 'Eq', true];
    }

    // Query the search index
    const result = await searchIndex.query({
      filters,
      topK: pageSize + 1, // Get more results to handle pagination
      includeAttributes: ["content", "path", "important"],
    });

    if (!result.rows) {
      return {
        details: [],
        totalCount: 0,
        hasMore: false,
      };
    }

    // Convert results to ApplicationDetail format
    const allDetails: ApplicationDetail[] = result.rows.map((row, index) => ({
      id: row.id as string || `${index}`,
      path: row.path as string,
      content: row.content as string,
      important: row.important as boolean,
      timestamp: Date.now() - index, // Approximate timestamp for sorting
    }));

    // Sort the results
    allDetails.sort((a, b) => {
      if (sortBy === "path") {
        const comparison = a.path.localeCompare(b.path);
        return sortOrder === "asc" ? comparison : -comparison;
      } else {
        const comparison = a.timestamp - b.timestamp;
        return sortOrder === "asc" ? comparison : -comparison;
      }
    });

    // Apply pagination
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedDetails = allDetails.slice(startIndex, endIndex);

    return {
      details: paginatedDetails,
      totalCount: allDetails.length,
      hasMore: endIndex < allDetails.length,
      nextCursor: endIndex < allDetails.length ? `${page + 1}` : undefined,
    };
  } catch (error) {
    console.error("Error fetching application details:", error);
    return {
      details: [],
      totalCount: 0,
      hasMore: false,
    };
  }
}

export async function searchApplicationDetails(
  userId: string,
  query: string,
  options: {
    pathFilter?: string;
    importantOnly?: boolean;
    limit?: number;
  } = {}
): Promise<ApplicationDetail[]> {
  const { pathFilter, importantOnly = false, limit = 20 } = options;

  try {
    const searchClient = new SearchClient();

    const domain = "localhost";
    const searchIndex = await searchClient.getNamespace(`application-memory/${userId}/${domain}`);

    let filters: Parameters<typeof searchIndex.query>[0]['filters'] = undefined;
    if (pathFilter && importantOnly) {
      filters = ['And', [['Or' , [['path', 'Contains', pathFilter], ['path', 'Glob', pathFilter]]], ['important', 'Eq', true]]];
    } else if (pathFilter) {
      filters = ['path', 'Contains', pathFilter];
    } else if (importantOnly) {
      filters = ['important', 'Eq', true];
    }

    const result = await searchIndex.query({
      filters,
      rankBy: ['content', 'BM25', query],
      topK: limit,
      includeAttributes: ["content", "path", "important"],
    });

    if (!result.rows) {
      return [];
    }

    return result.rows.map((row, index) => ({
      id: row.id as string || `${index}`,
      path: row.path as string,
      content: row.content as string,
      important: row.important as boolean,
      timestamp: Date.now() - index,
    }));

  } catch (error) {
    console.error("Error searching application details:", error);
    return [];
  }
}

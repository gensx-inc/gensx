"use client";

import React, { useState, useEffect } from "react";
import { getApplicationDetails, searchApplicationDetails, type ApplicationDetail } from "@/actions/application-details";

interface ApplicationDetailsTabProps {
  userId: string;
}

export default function ApplicationDetailsTab({ userId }: ApplicationDetailsTabProps) {
  const [details, setDetails] = useState<ApplicationDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<"path" | "timestamp">("path");
  const [showImportantOnly, setShowImportantOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const loadDetails = async (reset = false) => {
    if (reset) {
      setPage(1);
      setDetails([]);
    }

    setLoading(true);
    try {
      const result = await getApplicationDetails(userId, {
        page: reset ? 1 : page,
        pageSize: 20,
        sortBy,
        sortOrder: "asc",
        importantOnly: showImportantOnly,
      });

      if (reset) {
        setDetails(result.details);
      } else {
        setDetails(prev => [...prev, ...result.details]);
      }
      
      setHasMore(result.hasMore);
    } catch (error) {
      console.error("Error loading application details:", error);
    }
    setLoading(false);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadDetails(true);
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchApplicationDetails(userId, searchQuery, {
        importantOnly: showImportantOnly,
        limit: 50,
      });
      setDetails(results);
      setHasMore(false);
    } catch (error) {
      console.error("Error searching application details:", error);
    }
    setIsSearching(false);
  };

  const toggleExpanded = (id: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const loadMore = () => {
    if (!hasMore || loading) return;
    setPage(prev => prev + 1);
  };

  useEffect(() => {
    loadDetails(true);
  }, [userId, sortBy, showImportantOnly]);

  useEffect(() => {
    if (page > 1) {
      loadDetails();
    }
  }, [page]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Search and filters */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Search application details..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 text-sm"
          >
            {isSearching ? "..." : "Search"}
          </button>
        </div>
        
        <div className="flex gap-2 text-sm">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "path" | "timestamp")}
            className="px-2 py-1 border border-gray-300 rounded text-sm"
          >
            <option value="path">Sort by Path</option>
            <option value="timestamp">Sort by Time</option>
          </select>
          
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={showImportantOnly}
              onChange={(e) => setShowImportantOnly(e.target.checked)}
              className="rounded"
            />
            <span>Important only</span>
          </label>
        </div>
      </div>

      {/* Details list */}
      <div className="flex-1 overflow-y-auto">
        {loading && details.length === 0 ? (
          <div className="p-4 text-center text-gray-500">Loading...</div>
        ) : details.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            No application details found
          </div>
        ) : (
          <div className="space-y-2 p-4">
            {details.map((detail) => {
              const isExpanded = expandedItems.has(detail.id);
              return (
                <div
                  key={detail.id}
                  className="border border-gray-200 rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() => toggleExpanded(detail.id)}
                    className="w-full p-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-gray-900 truncate">
                          {detail.path}
                        </span>
                        {detail.important && (
                          <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs">
                            Important
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 truncate mt-1">
                        {detail.content.substring(0, 100)}...
                      </p>
                    </div>
                    <svg
                      className={`w-4 h-4 text-gray-500 transition-transform ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                  {isExpanded && (
                    <div className="p-3 bg-white border-t border-gray-200">
                      <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">
                        {detail.content}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
            
            {hasMore && (
              <button
                onClick={loadMore}
                disabled={loading}
                className="w-full p-3 text-center text-blue-600 hover:bg-blue-50 border border-gray-200 rounded-lg disabled:opacity-50"
              >
                {loading ? "Loading..." : "Load More"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
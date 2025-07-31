"use client";

import React, { useState, useEffect, createContext, useContext } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface TabsContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const TabsContext = createContext<TabsContextType | null>(null);

interface TabInfo {
  id: string;
  name: string;
  description?: string;
}

interface TabsProps {
  children: React.ReactNode;
  defaultTab?: string;
  tabs: TabInfo[];
}

interface TabSectionProps {
  tab: string;
  children: React.ReactNode;
}

export function Tabs({ children, defaultTab, tabs }: TabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const firstTab = tabs[0]?.id || "";
  const defaultTabName = defaultTab || firstTab;

  const [activeTab, setActiveTabState] = useState(defaultTabName);

  // Initialize from URL on mount
  useEffect(() => {
    const urlTab = searchParams.get("tab");
    if (urlTab && tabs.some((t) => t.id === urlTab)) {
      setActiveTabState(urlTab);
    }
  }, [searchParams, tabs]);

  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);

    // Update URL without causing navigation
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    if (tab === defaultTabName) {
      current.delete("tab");
    } else {
      current.set("tab", tab);
    }

    const search = current.toString();
    const query = search ? `?${search}` : "";

    router.replace(`${window.location.pathname}${query}`, { scroll: false });
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className="tabs">
        {/* Tab Navigation - Clean Minimal Style */}
        <div className="my-4">
          <nav
            className="flex flex-col sm:grid sm:grid-cols-2 lg:flex lg:flex-row gap-2"
            aria-label="Tab selection"
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  group relative w-full px-6 py-2 text-left transition-all duration-200 ease-in-out
                  border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring
                  hover:shadow-md hover:-translate-y-0.5 hover:scale-[1.02] cursor-pointer
                  ${
                    activeTab === tab.id
                      ? "bg-primary/15 border-primary border-2 shadow-lg ring-2 ring-primary/20"
                      : "bg-card hover:bg-accent/50 hover:border-primary/20"
                  }
                `}
                aria-selected={activeTab === tab.id}
                role="tab"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span
                      className={`font-medium text-base leading-snug transition-colors duration-200 ${
                        activeTab === tab.id
                          ? "text-primary"
                          : "text-foreground group-hover:text-primary/80"
                      }`}
                    >
                      {tab.name}
                    </span>
                    {activeTab === tab.id && (
                      <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 ml-3 transition-transform duration-200 group-hover:scale-125"></div>
                    )}
                  </div>
                  {tab.description && (
                    <p
                      className={`text-sm leading-relaxed transition-colors duration-200 ${
                        activeTab === tab.id
                          ? "text-primary/70"
                          : "text-muted-foreground group-hover:text-foreground/80"
                      }`}
                    >
                      {tab.description}
                    </p>
                  )}
                </div>

                {/* Bottom border indicator for active tab */}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-primary rounded-full transition-all duration-200 group-hover:h-1 group-hover:bg-primary/90"></div>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="tab-content">{children}</div>
      </div>
    </TabsContext.Provider>
  );
}

export function TabSection({ tab, children }: TabSectionProps) {
  const context = useContext(TabsContext);

  if (!context) {
    // If not inside Tabs, render all content (for SEO/crawlers)
    return <div data-tab={tab}>{children}</div>;
  }

  const { activeTab } = context;
  const isActive = activeTab === tab;

  return (
    <div
      data-tab={tab}
      className={`tab-section transition-opacity duration-200 ease-in-out ${
        isActive ? "opacity-100" : "opacity-0 absolute invisible"
      }`}
      aria-hidden={!isActive}
    >
      {children}
    </div>
  );
}

// Hook for components that need to know the active tab
export function useActiveTab() {
  const context = useContext(TabsContext);
  return context?.activeTab || "";
}

"use client";

import React, { useState, useEffect, createContext, useContext } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

// Hook to get the current theme
function useTheme() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };

    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return { isDark };
}

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

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        "inline-flex min-h-15 py-2 px-1.5 space-x-1 items-center justify-center rounded-md text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "border border-neutral-600/40 inline-flex rounded-md px-3 py-3 text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:font-semibold dark:data-[state=active]:bg-neutral-600/15 data-[state=active]:text-foreground data-[state=active]:shadow-sm dark:data-[state=active]:shadow-neutral-500/20 data-[state=active]:scale-[0.98] dark:hover:bg-neutral-600/10 hover:cursor-pointer hover:shadow-sm hover:shadow-neutral-400/30 dark:hover:shadow-neutral-600/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.96] shadow-xs shadow-neutral-700/20 dark:shadow-neutral-700/10",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={cn(
        "mt-6 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
      {...props}
    />
  );
}

export function Tabs({ children, defaultTab, tabs }: TabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isDark } = useTheme();

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
      <TabsPrimitive.Root
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList
          className="grid w-full grid-cols-2 lg:grid-cols-4 gap-y-2 tabs-list-light"
          style={{
            backgroundColor: isDark ? "rgba(82, 82, 91, 0.1)" : "white",
          }}
        >
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="flex flex-col items-start text-left h-[100px] py-2 px-4"
            >
              <div className="font-semibold text-base mb-2">{tab.name}</div>
              {tab.description && (
                <div className="text-xs text-muted-foreground font-normal leading-tight line-clamp-3 overflow-hidden">
                  {tab.description}
                </div>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
        {children}
      </TabsPrimitive.Root>
    </TabsContext.Provider>
  );
}

export function TabSection({ tab, children }: TabSectionProps) {
  const context = useContext(TabsContext);

  if (!context) {
    // If not inside Tabs, render all content (for SEO/crawlers)
    return <div data-tab={tab}>{children}</div>;
  }

  return (
    <TabsContent value={tab} data-tab={tab}>
      {children}
    </TabsContent>
  );
}

// Hook for components that need to know the active tab
export function useActiveTab() {
  const context = useContext(TabsContext);
  return context?.activeTab || "";
}

"use client";

import { ProviderIcon } from "@/components/ui/provider-icon";
import { type ModelConfig } from "@/gensx/workflows";
import { Brain, ChevronDown, ToggleLeft, ToggleRight } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

interface ModelDropdownProps {
  direction?: "up" | "down";
  selectedModelsForRun: ModelConfig[];
  sortedAvailableModels: ModelConfig[];
  isMultiSelectMode: boolean;
  isDropdownOpen: boolean;
  onMultiSelectModeChange: (value: boolean) => void;
  onModelsChange: (models: ModelConfig[]) => void;
  onDropdownOpenChange: (open: boolean) => void;
  onClose: () => void;
}

export function ModelDropdown({
  direction = "up",
  selectedModelsForRun,
  sortedAvailableModels,
  isMultiSelectMode,
  isDropdownOpen,
  onMultiSelectModeChange,
  onModelsChange,
  onDropdownOpenChange,
  onClose,
}: ModelDropdownProps) {
  const [dropdownSearch, setDropdownSearch] = useState("");
  const listContainerRef = useRef<HTMLDivElement | null>(null);
  const lastScrollTopRef = useRef(0);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [actualDirection, setActualDirection] = useState<"up" | "down">(
    direction,
  );

  // Calculate dropdown position based on available space
  useEffect(() => {
    if (isDropdownOpen && buttonRef.current && dropdownRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const dropdownHeight = 500; // Approximate max height of dropdown
      const spaceAbove = buttonRect.top;
      const spaceBelow = window.innerHeight - buttonRect.bottom;

      // If preferred direction is up but not enough space, flip to down
      if (
        direction === "up" &&
        spaceAbove < dropdownHeight &&
        spaceBelow > spaceAbove
      ) {
        setActualDirection("down");
      }
      // If preferred direction is down but not enough space, flip to up
      else if (
        direction === "down" &&
        spaceBelow < dropdownHeight &&
        spaceAbove > spaceBelow
      ) {
        setActualDirection("up");
      }
      // Otherwise use the preferred direction
      else {
        setActualDirection(direction);
      }
    }
  }, [isDropdownOpen, direction]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      const dropdown = target.closest(".model-dropdown-container");
      if (!dropdown && isDropdownOpen) {
        onDropdownOpenChange(false);
        setDropdownSearch("");
        onClose();
      }
    }

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isDropdownOpen, onClose, onDropdownOpenChange]);

  // Disable smooth scrolling when dropdown is open
  useEffect(() => {
    if (isDropdownOpen) {
      const originalStyle = document.documentElement.style.scrollBehavior;
      document.documentElement.style.scrollBehavior = "auto";
      return () => {
        document.documentElement.style.scrollBehavior = originalStyle;
      };
    }
  }, [isDropdownOpen]);

  // Restore list scroll after selection updates
  useLayoutEffect(() => {
    if (isDropdownOpen && listContainerRef.current) {
      listContainerRef.current.scrollTop = lastScrollTopRef.current;
    }
  }, [selectedModelsForRun.length, isDropdownOpen]);

  const filteredModels = useMemo(() => {
    if (!dropdownSearch) return sortedAvailableModels;
    const search = dropdownSearch.toLowerCase();
    return sortedAvailableModels.filter(
      (model) =>
        (model.displayName?.toLowerCase().includes(search) ?? false) ||
        model.model.toLowerCase().includes(search) ||
        model.provider.toLowerCase().includes(search),
    );
  }, [dropdownSearch, sortedAvailableModels]);

  return (
    <div
      className="relative model-dropdown-container"
      data-state={isDropdownOpen ? "open" : "closed"}
      key="model-dropdown"
    >
      {/* Dropdown trigger */}
      <button
        ref={buttonRef}
        onClick={() => {
          const wasOpen = isDropdownOpen;
          onDropdownOpenChange(!isDropdownOpen);
          if (wasOpen) {
            onClose();
          }
        }}
        onMouseDown={(e) => {
          e.preventDefault();
        }}
        onFocus={(e) => {
          e.preventDefault();
          e.currentTarget.blur();
        }}
        type="button"
        className="flex items-center justify-between gap-2 px-3 py-0.5 rounded-xl bg-transparent hover:bg-white/10 transition-colors"
      >
        <div className="min-w-0 ">
          {selectedModelsForRun.length === 0 ? (
            <span className="text-sm text-[#333333]/50">
              {isMultiSelectMode ? "Select models..." : "Select a model..."}
            </span>
          ) : isMultiSelectMode ? (
            <div className="flex items-center gap-1.5 flex-1 overflow-hidden">
              {selectedModelsForRun.slice(0, 2).map((model) => (
                <span
                  key={model.id}
                  className="px-2 py-0.5 rounded-full bg-black/10 text-xs text-[#333333] whitespace-nowrap flex items-center gap-1 flex-shrink-0"
                >
                  <ProviderIcon
                    provider={model.provider}
                    className="w-3 h-3 flex-shrink-0"
                  />
                  {model.displayName?.split(" (")[0] ?? model.model}
                  {model.reasoning && <Brain className="w-3 h-3" />}
                </span>
              ))}
              {selectedModelsForRun.length > 2 && (
                <span className="px-2 py-0.5 rounded-full bg-black/10 text-xs text-[#333333] whitespace-nowrap flex-shrink-0">
                  +{selectedModelsForRun.length - 2} models
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <ProviderIcon
                provider={selectedModelsForRun[0].provider}
                className="w-4 h-4 flex-shrink-0"
              />
              <span className="text-sm text-[#333333] truncate">
                {selectedModelsForRun[0].displayName?.split(" (")[0] ??
                  selectedModelsForRun[0].model}
              </span>
              {selectedModelsForRun[0].reasoning && (
                <Brain className="w-4 h-4" />
              )}
            </div>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-[#333333]/50 transition-transform flex-shrink-0 ml-2 ${
            isDropdownOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown menu */}
      {isDropdownOpen && (
        <div
          ref={dropdownRef}
          className={`absolute left-0 z-[9999] ${actualDirection === "up" ? "bottom-full mb-2" : "top-full mt-2"} rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.12),0_0_48px_rgba(0,0,0,0.08)] min-w-[300px] max-w-[90vw] w-auto flex flex-col`}
          style={{
            maxHeight:
              actualDirection === "up"
                ? `min(400px, ${buttonRef.current?.getBoundingClientRect().top ?? 400}px - 40px)`
                : `min(400px, ${window.innerHeight - (buttonRef.current?.getBoundingClientRect().bottom ?? 0) - 40}px)`,
          }}
        >
          {/* Glass background with strong blur */}
          <div className="absolute inset-0 rounded-2xl bg-white/20 backdrop-blur-xl" />

          {/* Glass effect border */}
          <div className="absolute inset-0 z-[1] overflow-hidden rounded-2xl shadow-[inset_1px_1px_1px_0_rgba(255,255,255,0.4),inset_-1px_-1px_1px_1px_rgba(255,255,255,0.4)]" />

          <div className="relative z-[2] flex flex-col h-full">
            {/* Header with selected count */}
            <div className="p-3 border-b border-white/20 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const newMode = !isMultiSelectMode;
                      onMultiSelectModeChange(newMode);
                      // When switching to single-select mode, keep only the first model
                      if (!newMode && selectedModelsForRun.length > 1) {
                        onModelsChange([selectedModelsForRun[0]]);
                      }
                    }}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/10 hover:bg-black/20 transition-colors"
                  >
                    {isMultiSelectMode ? (
                      <ToggleRight className="w-4 h-4 text-[#333333]" />
                    ) : (
                      <ToggleLeft className="w-4 h-4 text-[#333333]/50" />
                    )}
                    <span className="text-xs font-medium text-[#333333]">
                      Multi-select
                    </span>
                  </button>
                </div>
                <span className="text-sm font-medium text-[#333333]">
                  {isMultiSelectMode
                    ? `${selectedModelsForRun.length}/9 models selected`
                    : selectedModelsForRun.length === 0
                      ? "Select a model"
                      : "1 model selected"}
                </span>
              </div>
            </div>

            {/* Model list */}
            <div
              ref={listContainerRef}
              className="flex-1 overflow-y-auto min-h-0 max-h-[250px] scrollbar-thin scrollbar-thumb-black/20 scrollbar-track-transparent"
              onScroll={(e) => {
                e.stopPropagation();
              }}
            >
              {filteredModels.length > 0 ? (
                <div className="p-2 pb-1">
                  {filteredModels.map((model) => {
                    const isSelected = selectedModelsForRun.some(
                      (m) => m.id === model.id,
                    );
                    const isDisabled = isMultiSelectMode
                      ? !isSelected && selectedModelsForRun.length >= 9
                      : false;

                    return (
                      <button
                        key={model.id}
                        type="button"
                        tabIndex={-1}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (!model.available) return;

                          // capture scroll position before state updates
                          if (listContainerRef.current) {
                            lastScrollTopRef.current =
                              listContainerRef.current.scrollTop;
                          }

                          if (isMultiSelectMode) {
                            // Multi-select mode: add/remove models
                            if (isSelected) {
                              onModelsChange(
                                selectedModelsForRun.filter(
                                  (m) => m.id !== model.id,
                                ),
                              );
                            } else if (selectedModelsForRun.length < 9) {
                              onModelsChange([...selectedModelsForRun, model]);
                            }
                          } else {
                            // Single-select mode: replace current selection
                            onModelsChange([model]);
                            onDropdownOpenChange(false);
                            setDropdownSearch("");
                            onClose();
                          }
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                        }}
                        onFocus={(e) => {
                          e.preventDefault();
                          e.currentTarget.blur();
                        }}
                        disabled={isDisabled || !model.available}
                        className={`w-full flex items-center px-3 py-2 rounded-lg transition-colors ${
                          isDisabled || !model.available
                            ? "opacity-50 cursor-not-allowed"
                            : "cursor-pointer hover:bg-black/10"
                        } ${isSelected ? "bg-black/10" : ""}`}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          {/* Provider icon */}
                          <ProviderIcon
                            provider={model.provider}
                            className="w-5 h-5 flex-shrink-0"
                          />

                          {/* Model info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-sm font-medium truncate ${model.available ? "text-[#333333]" : "text-[#333333]/50"}`}
                              >
                                {model.displayName?.split(" (")[0] ??
                                  model.model}
                              </span>
                              {/* Reasoning model indicator */}
                              {model.reasoning && (
                                <Brain className="w-3.5 h-3.5 text-[#333333] flex-shrink-0" />
                              )}
                            </div>
                          </div>

                          {/* Data badges */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {/* Input cost badge */}
                            <span
                              className="px-2 py-0.5 rounded-full bg-black/10 text-xs text-[#333333]/70"
                              title="Cost per million input tokens"
                            >
                              ${model.cost?.input.toFixed(2) ?? "0.00"}/M in
                            </span>

                            {/* Output cost badge */}
                            <span
                              className="px-2 py-0.5 rounded-full bg-black/10 text-xs text-[#333333]/70"
                              title="Cost per million output tokens"
                            >
                              ${model.cost?.output.toFixed(2) ?? "0.00"}/M out
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 text-center text-sm text-[#333333]/70">
                  No models found
                </div>
              )}
            </div>

            {/* Search bar at bottom */}
            <div className="p-3 pb-2 border-t border-white/20 flex-shrink-0 bg-white/10 backdrop-blur-sm rounded-b-2xl">
              <input
                type="text"
                value={dropdownSearch}
                onChange={(e) => {
                  setDropdownSearch(e.target.value);
                }}
                placeholder="Search models..."
                className="w-full px-3 py-2 bg-white/20 backdrop-blur-sm rounded-md outline-none focus:ring-2 focus:ring-white/30 text-sm placeholder-black/50 text-[#333333]"
                onClick={(e) => {
                  e.stopPropagation();
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

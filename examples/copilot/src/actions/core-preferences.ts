"use server";

import { SearchClient } from "@gensx/storage";
import { searchUserPreferences } from "./user-preferences";

export interface CorePreferences {
  name?: string;
  communicationStyle?: string;
  accessibilityNeeds?: string;
  generalConstraints?: string;
  interactionStyle?: string;
}

// List of preference categories that should always be included in context
const CORE_PREFERENCE_CATEGORIES = [
  "name",
  "communication_style", 
  "accessibility_needs",
  "general_constraints",
  "interaction_style",
  "preferred_assistant_behavior",
  "technical_skill_level"
];

export async function getCoreUserPreferences(userId: string): Promise<CorePreferences> {
  try {
    const searchClient = new SearchClient();
    const searchIndex = await searchClient.getNamespace(`user-preferences/${userId}`);

    // Query for core preferences
    const result = await searchIndex.query({
      filters: ['Or', CORE_PREFERENCE_CATEGORIES.map(category => ['preference', 'Contains', category])],
      topK: 20,
      includeAttributes: ["content", "preference"],
    });

    if (!result.rows) {
      return {};
    }

    // Organize preferences by category
    const corePrefs: CorePreferences = {};
    
    for (const row of result.rows) {
      const preference = row.preference as string;
      const content = row.content as string;
      
      // Map preference categories to our core structure
      if (preference.includes('name')) {
        corePrefs.name = content;
      } else if (preference.includes('communication') || preference.includes('style')) {
        corePrefs.communicationStyle = content;
      } else if (preference.includes('accessibility')) {
        corePrefs.accessibilityNeeds = content;
      } else if (preference.includes('constraint')) {
        corePrefs.generalConstraints = content;
      } else if (preference.includes('interaction')) {
        corePrefs.interactionStyle = content;
      }
    }

    return corePrefs;
  } catch (error) {
    console.error("Error fetching core user preferences:", error);
    return {};
  }
}

export async function getContextualPreferences(
  userId: string, 
  userPrompt: string,
  limit: number = 5
): Promise<Array<{preference: string; content: string}>> {
  try {
    // Use semantic search to find preferences relevant to the user's request
    const relevantPreferences = await searchUserPreferences(userId, userPrompt, {
      limit
    });

    // Filter out core preferences to avoid duplication
    return relevantPreferences
      .filter(pref => !CORE_PREFERENCE_CATEGORIES.some(core => 
        pref.preference.toLowerCase().includes(core.toLowerCase())
      ))
      .map(pref => ({
        preference: pref.preference,
        content: pref.content
      }));
  } catch (error) {
    console.error("Error fetching contextual preferences:", error);
    return [];
  }
}

export function formatCorePreferencesForPrompt(corePrefs: CorePreferences): string {
  const sections: string[] = [];
  
  if (corePrefs.name) {
    sections.push(`Name: ${corePrefs.name}`);
  }
  
  if (corePrefs.communicationStyle) {
    sections.push(`Communication Style: ${corePrefs.communicationStyle}`);
  }
  
  if (corePrefs.accessibilityNeeds) {
    sections.push(`Accessibility Needs: ${corePrefs.accessibilityNeeds}`);
  }
  
  if (corePrefs.interactionStyle) {
    sections.push(`Interaction Preferences: ${corePrefs.interactionStyle}`);
  }
  
  if (corePrefs.generalConstraints) {
    sections.push(`General Constraints: ${corePrefs.generalConstraints}`);
  }
  
  if (sections.length === 0) {
    return "";
  }
  
  return `<userPreferences>
${sections.join('\n')}
</userPreferences>`;
}

export function formatContextualPreferencesForPrompt(
  contextualPrefs: Array<{preference: string; content: string}>
): string {
  if (contextualPrefs.length === 0) {
    return "";
  }
  
  const formatted = contextualPrefs
    .map(pref => `${pref.preference}: ${pref.content}`)
    .join('\n');
    
  return `<contextualPreferences>
${formatted}
</contextualPreferences>`;
}
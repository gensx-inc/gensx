"use client";

import React, { useState, useEffect } from "react";
import {
  getUserPreferencesWorkingMemory,
  updateUserPreferencesWorkingMemory,
} from "@/actions/user-preferences";

interface UserPreferencesTabProps {
  userId: string;
}

export default function UserPreferencesTab({
  userId,
}: UserPreferencesTabProps) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const loadContent = async () => {
    setLoading(true);
    try {
      const workingMemory = await getUserPreferencesWorkingMemory(userId);
      setContent(workingMemory);
      setEditContent(workingMemory);
    } catch (error) {
      console.error("Error loading user preferences working memory:", error);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await updateUserPreferencesWorkingMemory(
        userId,
        editContent,
      );
      if (result.success) {
        setContent(editContent);
        setIsEditing(false);
      } else {
        alert(result.error || "Failed to save user preferences working memory");
      }
    } catch (error) {
      console.error("Error saving user preferences working memory:", error);
      alert("Failed to save user preferences working memory");
    }
    setIsSaving(false);
  };

  const handleCancel = () => {
    setEditContent(content);
    setIsEditing(false);
  };

  useEffect(() => {
    loadContent();
  }, [userId]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b bg-gray-50">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              User Preferences Working Memory
            </h3>
            <p className="text-sm text-gray-600">
              The AI's persistent knowledge about your preferences and how you
              like to interact
            </p>
          </div>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleCancel}
                  className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Save"}
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Edit
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 p-4">
        {loading ? (
          <div className="text-center text-gray-500 py-8">Loading...</div>
        ) : isEditing ? (
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            placeholder="Enter your preferences here...

This is the AI's working memory scratchpad for your personal preferences. You can include:

- Your name and personal information
- How you prefer to communicate
- Your technical skill level
- Accessibility needs or constraints
- Preferred interaction style
- Any specific requirements or constraints

Write it as readable text that the AI can easily reference when helping you."
            className="w-full h-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono text-sm"
          />
        ) : (
          <div className="h-full">
            {content ? (
              <div className="h-full bg-gray-50 p-4 rounded-lg overflow-y-auto">
                <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800">
                  {content}
                </pre>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="max-w-md mx-auto text-center text-gray-500">
                  <p className="mb-4">No user preferences stored yet.</p>
                  <p className="text-sm">
                    This is where the AI stores information about your
                    preferences, communication style, and personal context. This
                    helps the AI provide more personalized assistance.
                  </p>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Add Preferences
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

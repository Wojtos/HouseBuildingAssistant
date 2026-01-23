/**
 * FactConfirmationDialog Component (UC-3)
 *
 * Modal dialog for confirming extracted facts before saving to project memory.
 * User can select which facts to save and which to reject.
 */

import { useState, useCallback } from 'react';
import type { ExtractedFact } from '../../types/api';

interface FactConfirmationDialogProps {
  /** Facts extracted from the conversation */
  facts: ExtractedFact[];
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Whether confirmation is in progress */
  isConfirming: boolean;
  /** Called when user confirms selected facts */
  onConfirm: (confirmedIds: string[], rejectedIds: string[]) => void;
  /** Called when user closes dialog without saving */
  onClose: () => void;
}

/**
 * Format domain name for display
 */
function formatDomain(domain: string): string {
  return domain.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

/**
 * Get badge color for domain
 */
function getDomainColor(domain: string): string {
  const colors: Record<string, string> = {
    LAND_FEASIBILITY: 'bg-green-100 text-green-700',
    REGULATORY_PERMITTING: 'bg-blue-100 text-blue-700',
    ARCHITECTURAL_DESIGN: 'bg-purple-100 text-purple-700',
    FINANCE_LEGAL: 'bg-yellow-100 text-yellow-700',
    SITE_PREP_FOUNDATION: 'bg-orange-100 text-orange-700',
    SHELL_SYSTEMS: 'bg-red-100 text-red-700',
    PROCUREMENT_QUALITY: 'bg-teal-100 text-teal-700',
    FINISHES_FURNISHING: 'bg-pink-100 text-pink-700',
    GENERAL: 'bg-gray-100 text-gray-700',
  };
  return colors[domain] || 'bg-gray-100 text-gray-700';
}

export function FactConfirmationDialog({
  facts,
  isOpen,
  isConfirming,
  onConfirm,
  onClose,
}: FactConfirmationDialogProps) {
  // Default all facts to selected
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(facts.map((f) => f.id))
  );

  const handleToggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedIds(new Set(facts.map((f) => f.id)));
  }, [facts]);

  const handleDeselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleConfirm = useCallback(() => {
    const confirmedIds = Array.from(selectedIds);
    const rejectedIds = facts.filter((f) => !selectedIds.has(f.id)).map((f) => f.id);
    onConfirm(confirmedIds, rejectedIds);
  }, [facts, selectedIds, onConfirm]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-lg transform overflow-hidden rounded-lg bg-white shadow-xl transition-all">
          {/* Header */}
          <div className="border-b px-6 py-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Save Project Facts?
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              I found some information that might be useful to remember. Select
              which facts to save to your project.
            </p>
          </div>

          {/* Facts list */}
          <div className="max-h-[400px] overflow-y-auto px-6 py-4">
            <div className="flex justify-between mb-3">
              <button
                type="button"
                className="text-sm text-blue-600 hover:text-blue-800"
                onClick={handleSelectAll}
              >
                Select all
              </button>
              <button
                type="button"
                className="text-sm text-gray-500 hover:text-gray-700"
                onClick={handleDeselectAll}
              >
                Deselect all
              </button>
            </div>

            <div className="space-y-3">
              {facts.map((fact) => (
                <label
                  key={fact.id}
                  className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedIds.has(fact.id)
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(fact.id)}
                    onChange={() => handleToggle(fact.id)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${getDomainColor(
                          fact.domain
                        )}`}
                      >
                        {formatDomain(fact.domain)}
                      </span>
                      <span className="font-medium text-gray-900">{fact.key}</span>
                    </div>
                    <p className="text-sm text-gray-700">{fact.value}</p>
                    {fact.reasoning && (
                      <p className="text-xs text-gray-500 mt-1">{fact.reasoning}</p>
                    )}
                    <div className="mt-1 text-xs text-gray-400">
                      Confidence: {Math.round(fact.confidence * 100)}%
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t bg-gray-50 px-6 py-4 flex justify-end gap-3">
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              onClick={onClose}
              disabled={isConfirming}
            >
              Skip
            </button>
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleConfirm}
              disabled={isConfirming || selectedIds.size === 0}
            >
              {isConfirming ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Saving...
                </span>
              ) : (
                `Save ${selectedIds.size} Fact${selectedIds.size !== 1 ? 's' : ''}`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

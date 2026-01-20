/**
 * PhaseBadge Component
 *
 * Displays the current construction phase as a badge with optional
 * phase picker popover for quick updates.
 */

import { useState, useRef, useEffect } from 'react';
import { ConstructionPhase } from '../types/api';
import { getPhaseLabel } from './PhaseSelect';

interface PhaseBadgeProps {
  /** Current phase value */
  value: string;
  /** Callback when phase changes */
  onChange?: (phase: string) => void;
  /** Whether updates are allowed */
  editable?: boolean;
  /** Whether an update is in progress */
  isUpdating?: boolean;
  /** Whether the control is disabled */
  disabled?: boolean;
}

/**
 * Phase color mapping for visual distinction
 */
const PHASE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  [ConstructionPhase.LAND_SELECTION]: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  [ConstructionPhase.FEASIBILITY]: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  [ConstructionPhase.PERMITTING]: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  [ConstructionPhase.DESIGN]: { bg: 'bg-lime-50', text: 'text-lime-700', border: 'border-lime-200' },
  [ConstructionPhase.SITE_PREP]: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  [ConstructionPhase.FOUNDATION]: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
  [ConstructionPhase.SHELL_SYSTEMS]: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
  [ConstructionPhase.PROCUREMENT]: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
  [ConstructionPhase.FINISHES_FURNISHING]: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  [ConstructionPhase.COMPLETED]: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
};

/**
 * Get phase colors with fallback
 */
function getPhaseColors(phase: string) {
  return PHASE_COLORS[phase] || { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' };
}

/**
 * PhaseBadge component
 */
export function PhaseBadge({
  value,
  onChange,
  editable = false,
  isUpdating = false,
  disabled = false,
}: PhaseBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const colors = getPhaseColors(value);
  const label = getPhaseLabel(value);

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen]);

  const handleToggle = () => {
    if (!disabled && !isUpdating && editable) {
      setIsOpen(!isOpen);
    }
  };

  const handleSelectPhase = (phase: string) => {
    if (onChange && phase !== value) {
      onChange(phase);
    }
    setIsOpen(false);
  };

  // Non-editable badge
  if (!editable) {
    return (
      <span
        className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium ${colors.bg} ${colors.text} ${colors.border}`}
      >
        {label}
      </span>
    );
  }

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        disabled={disabled || isUpdating}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-all ${colors.bg} ${colors.text} ${colors.border} ${
          disabled || isUpdating
            ? 'cursor-not-allowed opacity-60'
            : 'cursor-pointer hover:shadow-sm'
        }`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={`Current phase: ${label}. Click to change.`}
      >
        {isUpdating ? (
          <svg
            className="h-3 w-3 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
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
        ) : null}
        {label}
        <svg
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Phase picker popover */}
      {isOpen && (
        <div
          ref={popoverRef}
          className="absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
          role="listbox"
          aria-label="Select phase"
        >
          <div className="py-1">
            <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Change Phase
            </div>
            {Object.values(ConstructionPhase).map((phase) => {
              const phaseColors = getPhaseColors(phase);
              const isSelected = phase === value;

              return (
                <button
                  key={phase}
                  type="button"
                  onClick={() => handleSelectPhase(phase)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                    isSelected
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  role="option"
                  aria-selected={isSelected}
                >
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${phaseColors.bg} ${phaseColors.border} border`}
                    aria-hidden="true"
                  />
                  {getPhaseLabel(phase)}
                  {isSelected && (
                    <svg
                      className="ml-auto h-4 w-4 text-blue-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

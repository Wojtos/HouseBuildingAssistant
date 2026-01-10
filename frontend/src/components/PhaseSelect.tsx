/**
 * PhaseSelect Component
 * 
 * Reusable select control for choosing a construction phase.
 * Used in Create Project, Project Settings, and Project Shell views.
 */

import { ConstructionPhase } from '../types/api';

interface PhaseSelectProps {
  /** Current selected phase value (empty string for no selection) */
  value: string; // ConstructionPhase | ''
  /** Callback when phase selection changes */
  onChange: (value: string) => void;
  /** Whether to allow empty/no selection (default: false) */
  allowEmpty?: boolean;
  /** Whether the select is disabled */
  disabled?: boolean;
  /** Optional error message to display */
  error?: string;
}

/**
 * Human-readable labels for construction phases
 */
const PHASE_LABELS: Record<string, string> = {
  [ConstructionPhase.LAND_SELECTION]: 'Land Selection',
  [ConstructionPhase.FEASIBILITY]: 'Feasibility Study',
  [ConstructionPhase.PERMITTING]: 'Permitting',
  [ConstructionPhase.DESIGN]: 'Design',
  [ConstructionPhase.SITE_PREP]: 'Site Preparation',
  [ConstructionPhase.FOUNDATION]: 'Foundation',
  [ConstructionPhase.SHELL_SYSTEMS]: 'Shell & Systems',
  [ConstructionPhase.PROCUREMENT]: 'Procurement',
  [ConstructionPhase.FINISHES_FURNISHING]: 'Finishes & Furnishing',
  [ConstructionPhase.COMPLETED]: 'Completed',
};

/**
 * PhaseSelect component for construction phase selection
 */
export function PhaseSelect({
  value,
  onChange,
  allowEmpty = false,
  disabled = false,
  error,
}: PhaseSelectProps) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value);
  };

  return (
    <div>
      <select
        value={value}
        onChange={handleChange}
        disabled={disabled}
        className={`block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-2 sm:text-sm ${
          error
            ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
            : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
        } ${
          disabled
            ? 'cursor-not-allowed bg-gray-100 text-gray-500'
            : 'bg-white'
        }`}
        aria-invalid={!!error}
        aria-describedby={error ? 'phase-error' : undefined}
      >
        {allowEmpty && <option value="">Select a phase...</option>}
        
        {Object.entries(PHASE_LABELS).map(([phaseValue, label]) => (
          <option key={phaseValue} value={phaseValue}>
            {label}
          </option>
        ))}
      </select>
      
      {error && (
        <p id="phase-error" className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Get human-readable label for a phase value
 */
export function getPhaseLabel(phase: string): string {
  return PHASE_LABELS[phase] || phase;
}

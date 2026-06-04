/**
 * Verification-gate and phase-advancement logic for the instant-navigation rollout.
 *
 * A rollout phase groups a bounded set of dashboard pages migrated together.
 * Each phase ends with a Verification_Gate: both `npm run check` and `npm run build`
 * must complete with zero errors before the phase is considered passed and the next
 * phase may begin.
 *
 * Requirements: 9.2, 9.3, 9.6
 */

export type GateStatus = "pending" | "passed" | "failed";

export type RolloutPhase = {
  id: string; // "pilot", "phase-2", ..., "auth"
  routes: string[]; // in-scope page files migrated together
  gate: { check: GateStatus; build: GateStatus };
};

/**
 * Returns true if and only if both `phase.gate.check` and `phase.gate.build`
 * are `"passed"` (zero-error).
 *
 * A gate is passed only when both verification commands (`npm run check` and
 * `npm run build`) complete successfully.
 */
export function isGatePassed(phase: RolloutPhase): boolean {
  return phase.gate.check === "passed" && phase.gate.build === "passed";
}

/**
 * Returns true if and only if the current phase's gate passed — i.e.,
 * `isGatePassed(phase)` is true. A phase whose gate did not pass never
 * permits advancement to the next phase.
 */
export function canAdvance(phase: RolloutPhase): boolean {
  return isGatePassed(phase);
}

/**
 * Returns true if and only if:
 * 1. The pilot phase (id: "pilot") precedes every other in-scope phase in the array.
 * 2. The auth phase (id: "auth") comes strictly after every other in-scope phase.
 *
 * If there is no pilot phase or no auth phase in the array, the ordering is invalid
 * (both are required for a valid rollout ordering).
 *
 * Requirements: 9.1, 9.5
 */
export function isValidPhaseOrdering(phases: RolloutPhase[]): boolean {
  const pilotIndex = phases.findIndex((p) => p.id === "pilot");
  const authIndex = phases.findIndex((p) => p.id === "auth");

  // Both pilot and auth must be present for a valid ordering.
  if (pilotIndex === -1 || authIndex === -1) {
    return false;
  }

  // Pilot must be the first phase (precedes every other).
  if (pilotIndex !== 0) {
    return false;
  }

  // Auth must be the last phase (strictly after every other).
  if (authIndex !== phases.length - 1) {
    return false;
  }

  return true;
}

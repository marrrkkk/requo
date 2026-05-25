"use client";

import {
  BaseEdge,
  getSmoothStepPath,
  type EdgeProps,
} from "@xyflow/react";

export function AutomationEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
}: EdgeProps) {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: 2,
          stroke: "var(--color-border)",
        }}
      />
      <BaseEdge
        id={`${id}-animated`}
        path={edgePath}
        style={{
          strokeWidth: 2,
          stroke: "var(--color-primary)",
          strokeDasharray: "5 5",
          strokeDashoffset: 0,
          animation: "automation-edge-flow 1s linear infinite",
        }}
      />
      <style>{`
        @keyframes automation-edge-flow {
          to {
            stroke-dashoffset: -10;
          }
        }
      `}</style>
    </>
  );
}

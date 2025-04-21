
import React from "react";

interface Props {
  fps: number;
  memory?: { usedJSHeapSize?: number; totalJSHeapSize?: number };
}

export function PerformanceMetrics({ fps, memory }: Props) {
  return (
    <>
      <div className="col-span-2 font-bold text-blue-300">Performance Metrics</div>
      <div>
        <span className="text-blue-200">FPS:</span> {fps}
      </div>
      <div>
        <span className="text-blue-200">Memory Usage:</span>{" "}
        {memory?.usedJSHeapSize
          ? Math.round(memory.usedJSHeapSize / (1024 * 1024)) + " MB"
          : "N/A"}
      </div>
    </>
  );
}

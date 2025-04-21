
import React from "react";

interface BrowserInfo {
  userAgent: string;
  platform: string;
  viewport: { width: number; height: number };
  devicePixelRatio: number;
  isIOSSafari: boolean;
}
export function BrowserInfoPanel({ browserInfo }: { browserInfo: BrowserInfo }) {
  return (
    <>
      <div className="col-span-2 font-bold text-green-300">Browser & Environment</div>
      <div className="col-span-2">
        <span className="text-green-200">Viewport:</span> {browserInfo.viewport.width}×{browserInfo.viewport.height}
      </div>
      <div className="col-span-2">
        <span className="text-green-200">Device Pixel Ratio:</span> {browserInfo.devicePixelRatio}
      </div>
      <div className="col-span-2">
        <span className="text-green-200">iOS Safari:</span> {browserInfo.isIOSSafari ? "Yes" : "No"}
      </div>
    </>
  );
}

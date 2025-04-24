
import React from "react";

interface BrowserInfo {
  userAgent: string;
  platform: string;
  viewport: { width: number; height: number };
  devicePixelRatio: number;
  isIOSSafari: boolean;
}

export function BrowserInfoPanel({ browserInfo }: { browserInfo: BrowserInfo }) {
  // Determine browser type
  const getBrowserType = () => {
    const ua = browserInfo.userAgent.toLowerCase();
    if (ua.includes('edge') || ua.includes('edg')) return 'Edge';
    if (ua.includes('chrome') && !ua.includes('edg')) return 'Chrome';
    if (ua.includes('firefox')) return 'Firefox';
    if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari';
    if (ua.includes('opr') || ua.includes('opera')) return 'Opera';
    return 'Unknown';
  };

  // Determine OS
  const getOS = () => {
    const platform = browserInfo.platform.toLowerCase();
    if (platform.includes('win')) return 'Windows';
    if (platform.includes('mac')) return 'macOS';
    if (platform.includes('linux')) return 'Linux';
    if (platform.includes('android')) return 'Android';
    if (/iPad|iPhone|iPod/.test(browserInfo.userAgent)) return 'iOS';
    return browserInfo.platform || 'Unknown';
  };

  const browserType = getBrowserType();
  const osType = getOS();

  return (
    <>
      <div className="col-span-2 font-bold text-green-300">Browser & Environment</div>
      <div className="col-span-2">
        <span className="text-green-200">Browser:</span> {browserType}
      </div>
      <div className="col-span-2">
        <span className="text-green-200">OS:</span> {osType}
      </div>
      <div className="col-span-2">
        <span className="text-green-200">Viewport:</span> {browserInfo.viewport.width}×{browserInfo.viewport.height}
      </div>
      <div className="col-span-2">
        <span className="text-green-200">Device Pixel Ratio:</span> {browserInfo.devicePixelRatio}
      </div>
    </>
  );
}

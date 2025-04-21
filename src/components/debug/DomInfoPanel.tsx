
import React from "react";

interface DomInfo {
  bodyChildren: number;
  totalElements: number;
  inputElements: number;
}
export function DomInfoPanel({ domInfo }: { domInfo: DomInfo }) {
  return (
    <>
      <div className="col-span-2 font-bold text-purple-300">DOM Information</div>
      <div>
        <span className="text-purple-200">Total Elements:</span> {domInfo.totalElements}
      </div>
      <div>
        <span className="text-purple-200">Input Elements:</span> {domInfo.inputElements}
      </div>
    </>
  );
}

import React, { useState } from "react";
import { useTheme } from "@/hooks/use-theme";
import { ThemeSettings } from "@/types/theme";

export default function ThemeSettingsPanel() {
  const { theme, setTheme, mode, setMode, resetTheme, importTheme, exportTheme, validateTheme } = useTheme();
  const [importValue, setImportValue] = useState("");
  const [importError, setImportError] = useState<string | null>(null);

  function handleImport() {
    if (importTheme(importValue)) {
      setImportError(null);
      setImportValue("");
    } else {
      setImportError("Invalid theme JSON.");
    }
  }

  function handleExport() {
    navigator.clipboard.writeText(exportTheme());
  }

  function handleModeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setMode(e.target.value as "light" | "dark");
  }

  return (
    <div>
      <h2>Theme Settings</h2>
      <div>
        <label>
          Mode:
          <select value={mode} onChange={handleModeChange}>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
      </div>
      <button onClick={resetTheme}>Reset to Default</button>
      <div>
        <h3>Import Theme</h3>
        <textarea
          value={importValue}
          onChange={e => setImportValue(e.target.value)}
          placeholder="Paste theme JSON here"
          rows={4}
          cols={40}
        />
        <button onClick={handleImport}>Import</button>
        {importError && <div style={{ color: "red" }}>{importError}</div>}
      </div>
      <div>
        <h3>Export Theme</h3>
        <button onClick={handleExport}>Copy Theme JSON</button>
      </div>
      <div>
        <h3>Current Theme</h3>
        <pre style={{ background: "#eee", padding: 8, borderRadius: 4 }}>
          {exportTheme()}
        </pre>
      </div>
    </div>
  );
}

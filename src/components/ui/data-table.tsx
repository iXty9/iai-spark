
// This is a mock/placeholder for the DataTable component
// The original_WebhookSettings.tsx file references this component but it's not in use
import React from 'react';

export interface DataTableProps {
  columns: any[];
  data: any[];
  isLoading?: boolean;
}

export function DataTable({ columns, data, isLoading }: DataTableProps) {
  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="mock-data-table">
      <p>DataTable Component (placeholder)</p>
    </div>
  );
}


import { TableRow, TableCell } from "@/components/ui/table";
import { User, Search, Filter } from 'lucide-react';

interface EmptyStateTableProps {
  searchQuery: string;
  roleFilter: string;
  onClearFilters: () => void;
}

export function EmptyStateTable({ searchQuery, roleFilter, onClearFilters }: EmptyStateTableProps) {
  const hasFilters = searchQuery || roleFilter !== 'all';

  return (
    <TableRow>
      <TableCell colSpan={6} className="text-center h-32">
        <div className="flex flex-col items-center justify-center py-8">
          {hasFilters ? (
            <>
              <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">No users found</h3>
              <p className="text-muted-foreground mb-4">
                No users match your current search or filters
              </p>
              <button
                onClick={onClearFilters}
                className="text-primary hover:underline text-sm font-medium"
              >
                Clear filters to see all users
              </button>
            </>
          ) : (
            <>
              <User className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">No users yet</h3>
              <p className="text-muted-foreground">
                Users will appear here once they sign up
              </p>
            </>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

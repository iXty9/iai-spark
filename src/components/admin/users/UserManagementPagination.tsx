
import React from 'react';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, 
  PaginationNext, PaginationPrevious } from '@/components/ui/pagination';

interface UserManagementPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function UserManagementPagination({
  currentPage,
  totalPages,
  onPageChange
}: UserManagementPaginationProps) {
  // Calculate which pages to display
  const pages = Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
    let page = Math.max(1, currentPage - 2) + i;
    if (page > totalPages) page = totalPages;
    return page;
  });

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
      {/* Page info */}
      <div className="text-sm text-muted-foreground order-2 sm:order-1">
        Page {currentPage} of {totalPages}
      </div>

      {/* Navigation */}
      <Pagination className="order-1 sm:order-2">
        <PaginationContent className="gap-1">
          <PaginationItem>
            <PaginationPrevious 
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              className={`h-8 ${currentPage === 1 ? "pointer-events-none opacity-50" : ""}`} 
            />
          </PaginationItem>
          
          {/* Hide page numbers on very small screens */}
          <div className="hidden xs:contents">
            {pages[0] > 1 && (
              <>
                <PaginationItem>
                  <PaginationLink onClick={() => onPageChange(1)} className="h-8 w-8">1</PaginationLink>
                </PaginationItem>
                {pages[0] > 2 && (
                  <PaginationItem>
                    <span className="px-2 text-muted-foreground">...</span>
                  </PaginationItem>
                )}
              </>
            )}
            
            {pages.map(page => (
              <PaginationItem key={page}>
                <PaginationLink
                  isActive={page === currentPage}
                  onClick={() => onPageChange(page)}
                  className="h-8 w-8"
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            ))}
            
            {pages[pages.length - 1] < totalPages && (
              <>
                {pages[pages.length - 1] < totalPages - 1 && (
                  <PaginationItem>
                    <span className="px-2 text-muted-foreground">...</span>
                  </PaginationItem>
                )}
                <PaginationItem>
                  <PaginationLink onClick={() => onPageChange(totalPages)} className="h-8 w-8">
                    {totalPages}
                  </PaginationLink>
                </PaginationItem>
              </>
            )}
          </div>

          {/* Mobile-only current page indicator */}
          <PaginationItem className="xs:hidden">
            <div className="px-3 py-1 text-sm bg-muted rounded-md border">
              {currentPage}/{totalPages}
            </div>
          </PaginationItem>
          
          <PaginationItem>
            <PaginationNext 
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              className={`h-8 ${currentPage === totalPages ? "pointer-events-none opacity-50" : ""}`} 
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}

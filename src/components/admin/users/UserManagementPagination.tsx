
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
    <Pagination className="mt-4">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious 
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            className={currentPage === 1 ? "pointer-events-none opacity-50" : ""} 
          />
        </PaginationItem>
        
        {pages[0] > 1 && (
          <>
            <PaginationItem>
              <PaginationLink onClick={() => onPageChange(1)}>1</PaginationLink>
            </PaginationItem>
            {pages[0] > 2 && (
              <PaginationItem>
                <span className="px-2">...</span>
              </PaginationItem>
            )}
          </>
        )}
        
        {pages.map(page => (
          <PaginationItem key={page}>
            <PaginationLink
              isActive={page === currentPage}
              onClick={() => onPageChange(page)}
            >
              {page}
            </PaginationLink>
          </PaginationItem>
        ))}
        
        {pages[pages.length - 1] < totalPages && (
          <>
            {pages[pages.length - 1] < totalPages - 1 && (
              <PaginationItem>
                <span className="px-2">...</span>
              </PaginationItem>
            )}
            <PaginationItem>
              <PaginationLink onClick={() => onPageChange(totalPages)}>
                {totalPages}
              </PaginationLink>
            </PaginationItem>
          </>
        )}
        
        <PaginationItem>
          <PaginationNext 
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""} 
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

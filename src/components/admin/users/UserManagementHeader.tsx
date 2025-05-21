
import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, RefreshCw, Loader, Info } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { UserRole } from '@/services/admin/types/userTypes';

interface UserManagementHeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  roleFilter: string;
  setRoleFilter: (role: string) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  onSearch: () => void;
  onRefresh: () => void;
  loading: boolean;
  connectionInfo: any;
  onOpenEnvironmentSettings: () => void;
}

export function UserManagementHeader({
  searchQuery,
  setSearchQuery,
  roleFilter,
  setRoleFilter,
  pageSize,
  setPageSize,
  onSearch,
  onRefresh,
  loading,
  connectionInfo,
  onOpenEnvironmentSettings
}: UserManagementHeaderProps) {
  return (
    <>
      {/* Environment indicator */}
      {connectionInfo && (
        <div className="flex justify-end mb-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-xs text-muted-foreground flex items-center gap-1"
                  onClick={onOpenEnvironmentSettings}
                >
                  <Info className="h-3 w-3" />
                  <span>Environment: {connectionInfo?.environmentId || 'unknown'}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Click for environment information and settings</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
    
      {/* Top controls */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:max-w-xs">
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && onSearch()}
              className="pl-9"
            />
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          </div>
          <Button variant="outline" size="sm" onClick={onSearch} disabled={loading}>
            {loading && <Loader className="h-4 w-4 animate-spin mr-1" />} Search
          </Button>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by role" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="user">User</SelectItem>
            </SelectContent>
          </Select>
          <Select value={pageSize.toString()} onValueChange={v => setPageSize(Number(v))}>
            <SelectTrigger className="w-[110px]"><SelectValue placeholder="Page size" /></SelectTrigger>
            <SelectContent>
              {[5,10,25,50].map(n => <SelectItem key={n} value={n.toString()}>{n} per page</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={onRefresh} disabled={loading} title="Refresh users">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>
    </>
  );
}

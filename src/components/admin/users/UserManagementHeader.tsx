
import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader, Info } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { SearchInput } from './SearchInput';

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
  connectionStatus: any;
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
  connectionStatus,
  onOpenEnvironmentSettings
}: UserManagementHeaderProps) {
  const clearFilters = () => {
    setSearchQuery('');
    setRoleFilter('all');
  };

  const getConnectionStatusColor = () => {
    if (!connectionStatus) return 'bg-gray-500';
    if (!connectionStatus.isConnected) return 'bg-red-500';
    if (!connectionStatus.isAuthenticated) return 'bg-yellow-500';
    if (!connectionStatus.isAdmin) return 'bg-orange-500';
    return 'bg-green-500';
  };

  const getConnectionStatusText = () => {
    if (!connectionStatus) return 'Unknown';
    if (!connectionStatus.isConnected) return 'Disconnected';
    if (!connectionStatus.isAuthenticated) return 'Unauthenticated';
    if (!connectionStatus.isAdmin) return 'No Admin Access';
    return 'Connected';
  };

  const hasActiveFilters = searchQuery || roleFilter !== 'all';

  return (
    <div className="space-y-4">
      {/* Environment indicator */}
      {connectionStatus && (
        <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg border">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${getConnectionStatusColor()}`} />
              <span className="text-sm font-medium">{getConnectionStatusText()}</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {connectionStatus?.environmentInfo?.environmentId || 'unknown'}
            </Badge>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-xs text-muted-foreground flex items-center gap-1 hover:bg-muted"
                  onClick={onOpenEnvironmentSettings}
                >
                  <Info className="h-3 w-3" />
                  <span>Environment Info</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Click for detailed environment information and settings</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
    
      {/* Main controls */}
      <div className="space-y-4">
        {/* Search and active filters */}
        <div className="space-y-3">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            onSearch={onSearch}
            placeholder="Search by username or email..."
            loading={loading}
            className="w-full"
          />
          
          {/* Active filters indicator */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2">
              {searchQuery && (
                <Badge variant="secondary" className="text-xs">
                  Search: "{searchQuery.length > 10 ? searchQuery.slice(0, 10) + '...' : searchQuery}"
                </Badge>
              )}
              {roleFilter !== 'all' && (
                <Badge variant="secondary" className="text-xs">
                  Role: {roleFilter}
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear all
              </Button>
            </div>
          )}
        </div>
        
        {/* Control row */}
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <Select value={roleFilter} onValueChange={setRoleFilter} disabled={loading}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="moderator">Moderator</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={pageSize.toString()} onValueChange={v => setPageSize(Number(v))} disabled={loading}>
              <SelectTrigger className="w-full sm:w-[110px]">
                <SelectValue placeholder="Page size" />
              </SelectTrigger>
              <SelectContent>
                {[5, 10, 25, 50, 100].map(n => (
                  <SelectItem key={n} value={n.toString()}>
                    <span className="sm:hidden">{n}</span>
                    <span className="hidden sm:inline">{n} per page</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={onRefresh} 
                  disabled={loading}
                  className="transition-all duration-200 hover:scale-105 self-end sm:self-auto"
                >
                  {loading ? (
                    <Loader className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Refresh user list</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}

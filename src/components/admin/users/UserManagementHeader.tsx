
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, RefreshCw, Loader, Info, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

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
  const [searchFocused, setSearchFocused] = useState(false);

  const clearSearch = () => {
    setSearchQuery('');
  };

  const getConnectionStatusColor = () => {
    if (!connectionInfo) return 'bg-gray-500';
    if (!connectionInfo.isConnected) return 'bg-red-500';
    if (!connectionInfo.isAuthenticated) return 'bg-yellow-500';
    if (!connectionInfo.isAdmin) return 'bg-orange-500';
    return 'bg-green-500';
  };

  const getConnectionStatusText = () => {
    if (!connectionInfo) return 'Unknown';
    if (!connectionInfo.isConnected) return 'Disconnected';
    if (!connectionInfo.isAuthenticated) return 'Unauthenticated';
    if (!connectionInfo.isAdmin) return 'No Admin Access';
    return 'Connected';
  };

  return (
    <>
      {/* Environment indicator */}
      {connectionInfo && (
        <div className="flex justify-between items-center mb-4 p-3 bg-muted/30 rounded-lg border">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${getConnectionStatusColor()}`} />
              <span className="text-sm font-medium">{getConnectionStatusText()}</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {connectionInfo?.environmentId || 'unknown'}
            </Badge>
          </div>
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
    
      {/* Top controls */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <div className={`relative flex-1 sm:max-w-xs transition-all duration-200 ${
            searchFocused ? 'ring-2 ring-primary/20 rounded-md' : ''
          }`}>
            <Input
              placeholder="Search by username or email..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  onSearch();
                }
                if (e.key === 'Escape') {
                  clearSearch();
                }
              }}
              className="pl-9 pr-9"
              disabled={loading}
            />
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1 h-6 w-6 p-0 hover:bg-muted"
                onClick={clearSearch}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          
          {/* Active filters indicator */}
          {(searchQuery || roleFilter !== 'all') && (
            <div className="flex items-center gap-1">
              {searchQuery && (
                <Badge variant="secondary" className="text-xs">
                  Search: {searchQuery}
                </Badge>
              )}
              {roleFilter !== 'all' && (
                <Badge variant="secondary" className="text-xs">
                  Role: {roleFilter}
                </Badge>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <Select value={roleFilter} onValueChange={setRoleFilter} disabled={loading}>
            <SelectTrigger className="w-[180px]">
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
            <SelectTrigger className="w-[110px]">
              <SelectValue placeholder="Page size" />
            </SelectTrigger>
            <SelectContent>
              {[5, 10, 25, 50, 100].map(n => (
                <SelectItem key={n} value={n.toString()}>
                  {n} per page
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={onRefresh} 
                  disabled={loading}
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
    </>
  );
}

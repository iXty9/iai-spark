
import { Input } from '@/components/ui/input';
import { Search, X, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  placeholder?: string;
  loading?: boolean;
  className?: string;
}

export function SearchInput({ 
  value, 
  onChange, 
  onSearch, 
  placeholder = "Search users...", 
  loading = false,
  className = ""
}: SearchInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const clearSearch = () => {
    onChange('');
    setHasInteracted(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearch();
      setHasInteracted(true);
    }
    if (e.key === 'Escape') {
      clearSearch();
    }
  };

  // Auto-search on value change after user has interacted
  useEffect(() => {
    if (hasInteracted) {
      const timeoutId = setTimeout(() => {
        onSearch();
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [value, hasInteracted, onSearch]);

  return (
    <div className={`relative transition-all duration-200 ${
      isFocused ? 'ring-2 ring-primary/20 rounded-md' : ''
    } ${className}`}>
      <Input
        placeholder={placeholder}
        value={value}
        onChange={e => {
          onChange(e.target.value);
          setHasInteracted(true);
        }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onKeyDown={handleKeyDown}
        className="pl-9 pr-9 transition-all duration-200"
        disabled={loading}
      />
      
      <div className="absolute left-2.5 top-2.5 flex items-center">
        {loading ? (
          <Loader className="h-4 w-4 text-muted-foreground animate-spin" />
        ) : (
          <Search className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
      
      {value && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1 h-6 w-6 p-0 hover:bg-muted transition-colors"
          onClick={clearSearch}
          disabled={loading}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

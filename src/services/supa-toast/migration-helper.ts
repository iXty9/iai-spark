/**
 * Migration Helper for SupaToast
 * 
 * This utility helps identify and migrate existing toast usage patterns
 * to the new unified supa-toast service.
 */

import { logger } from '@/utils/logging';

export interface ToastUsagePattern {
  file: string;
  line: number;
  type: 'shadcn' | 'sonner' | 'mixed';
  pattern: string;
  migrationSuggestion: string;
}

export interface MigrationReport {
  totalFiles: number;
  shadcnUsages: number;
  sonnerUsages: number;
  mixedUsages: number;
  patterns: ToastUsagePattern[];
}

/**
 * Common migration patterns and their replacements
 */
export const MIGRATION_PATTERNS = {
  // Shadcn useToast patterns
  'useToast import': {
    from: `import { useToast } from '@/hooks/use-toast';`,
    to: `import { supaToast } from '@/services/supa-toast';`,
    note: 'Replace useToast import with supaToast'
  },
  
  'useToast hook': {
    from: `const { toast } = useToast();`,
    to: `// Remove this line - use supaToast directly`,
    note: 'Remove useToast hook usage'
  },
  
  'basic toast call': {
    from: `toast({ title: "Title", description: "Message" })`,
    to: `supaToast.success("Message", { title: "Title" })`,
    note: 'Convert basic toast to supaToast with appropriate type'
  },
  
  'destructive toast': {
    from: `toast({ variant: "destructive", title: "Error", description: "Message" })`,
    to: `supaToast.error("Message", { title: "Error" })`,
    note: 'Convert destructive variant to error type'
  },
  
  // Sonner patterns
  'sonner import': {
    from: `import { toast } from 'sonner';`,
    to: `import { supaToast } from '@/services/supa-toast';`,
    note: 'Replace sonner import with supaToast'
  },
  
  'sonner wrapper import': {
    from: `import { toast } from '@/components/ui/sonner';`,
    to: `import { supaToast } from '@/services/supa-toast';`,
    note: 'Replace sonner wrapper import with supaToast'
  },
  
  'sonner success': {
    from: `toast.success("Message")`,
    to: `supaToast.success("Message")`,
    note: 'Direct mapping for success toasts'
  },
  
  'sonner error': {
    from: `toast.error("Message")`,
    to: `supaToast.error("Message")`,
    note: 'Direct mapping for error toasts'
  },
  
  'sonner info': {
    from: `toast.info("Message")`,
    to: `supaToast.info("Message")`,
    note: 'Direct mapping for info toasts'
  },
  
  'sonner warning': {
    from: `toast.warning("Message")`,
    to: `supaToast.warning("Message")`,
    note: 'Direct mapping for warning toasts'
  },
};

/**
 * Files that have been migrated to supa-toast
 */
export const MIGRATED_FILES = [
  'src/contexts/WebSocketContext.tsx',
  'src/components/admin/WebSocketSettings.tsx',
  'src/components/admin/webhooks/WebhookTester.tsx',
];

/**
 * Priority order for migration - migrate these first
 */
export const MIGRATION_PRIORITY = [
  // Core services and contexts
  'src/contexts/',
  'src/services/',
  
  // Admin components (high usage)
  'src/components/admin/',
  
  // Chat components (core functionality)
  'src/components/chat/',
  
  // Auth components (user-facing)
  'src/components/auth/',
  
  // Settings and other components
  'src/components/settings/',
  'src/components/supabase/',
  'src/components/notifications/',
  
  // Hooks and utilities
  'src/hooks/',
  'src/utils/',
];

/**
 * Log migration progress
 */
export function logMigrationProgress(report: MigrationReport): void {
  logger.info('SupaToast Migration Report', {
    totalFiles: report.totalFiles,
    shadcnUsages: report.shadcnUsages,
    sonnerUsages: report.sonnerUsages,
    mixedUsages: report.mixedUsages,
    migratedFiles: MIGRATED_FILES.length,
    remainingFiles: report.totalFiles - MIGRATED_FILES.length
  }, { module: 'supa-toast-migration' });
}

/**
 * Get migration instructions for a specific pattern
 */
export function getMigrationInstructions(pattern: string): string {
  const migration = Object.entries(MIGRATION_PATTERNS).find(([key]) => 
    pattern.toLowerCase().includes(key.toLowerCase())
  );
  
  if (migration) {
    const [, instructions] = migration;
    return `${instructions.note}\nFrom: ${instructions.from}\nTo: ${instructions.to}`;
  }
  
  return 'No specific migration pattern found. Refer to supa-toast documentation.';
}

/**
 * Check if a file has been migrated
 */
export function isFileMigrated(filePath: string): boolean {
  return MIGRATED_FILES.includes(filePath);
}

/**
 * Add a file to the migrated list
 */
export function markFileAsMigrated(filePath: string): void {
  if (!isFileMigrated(filePath)) {
    MIGRATED_FILES.push(filePath);
    logger.info(`File marked as migrated: ${filePath}`, null, { module: 'supa-toast-migration' });
  }
}

/**
 * Validation helper to ensure migration completeness
 */
export function validateMigration(filePath: string, content: string): {
  isValid: boolean;
  issues: string[];
  suggestions: string[];
} {
  const issues: string[] = [];
  const suggestions: string[] = [];
  
  // Check for remaining useToast imports
  if (content.includes("import { useToast }") || content.includes("from '@/hooks/use-toast'")) {
    issues.push("Still contains useToast import");
    suggestions.push("Replace with: import { supaToast } from '@/services/supa-toast';");
  }
  
  // Check for useToast hook usage
  if (content.includes("useToast()")) {
    issues.push("Still contains useToast hook usage");
    suggestions.push("Remove useToast hook and use supaToast directly");
  }
  
  // Check for sonner imports
  if (content.includes("from 'sonner'") || content.includes("from '@/components/ui/sonner'")) {
    issues.push("Still contains sonner imports");
    suggestions.push("Replace with supaToast import");
  }
  
  // Check for direct toast calls without supaToast
  if (content.includes("toast(") && !content.includes("supaToast.")) {
    issues.push("Contains direct toast calls");
    suggestions.push("Replace with appropriate supaToast method");
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    suggestions
  };
}
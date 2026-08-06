
import { z } from 'zod';
import { UserRole } from '@/services/admin/types/userTypes';

// User validation schemas
export const userEmailSchema = z
  .string()
  .email('Please enter a valid email address')
  .min(1, 'Email is required');

export const userUsernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must not exceed 30 characters')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens')
  .optional();

export const userRoleSchema = z.enum(['admin', 'moderator', 'user'], {
  message: 'Please select a valid role'
});

export const userFormSchema = z.object({
  email: userEmailSchema,
  username: userUsernameSchema,
  role: userRoleSchema,
});

// Search validation
export const searchQuerySchema = z
  .string()
  .max(100, 'Search query must not exceed 100 characters')
  .optional();

// Pagination validation
// NOTE: Max 500 supports client-side filtering approach in User Management
// See useUserManagementActions.ts for scalability notes
export const paginationSchema = z.object({
  page: z.number().min(1, 'Page must be at least 1').default(1),
  pageSize: z.number().min(5).max(500, 'Page size must be between 5 and 500').default(10),
});

// Role filter validation
export const roleFilterSchema = z.union([
  z.enum(['admin', 'moderator', 'user']),
  z.literal('all')
]).default('all');

// Utility functions for validation
export const validateUserInput = (data: unknown) => {
  try {
    return { success: true, data: userFormSchema.parse(data), errors: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        data: null,
        errors: error.issues.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      };
    }
    return {
      success: false,
      data: null,
      errors: [{ field: 'general', message: 'Validation failed' }]
    };
  }
};

export const validateSearchParams = (params: {
  searchQuery?: string;
  page?: number;
  pageSize?: number;
  roleFilter?: string;
}) => {
  try {
    const validatedParams = {
      searchQuery: searchQuerySchema.parse(params.searchQuery),
      ...paginationSchema.parse({
        page: params.page,
        pageSize: params.pageSize
      }),
      roleFilter: roleFilterSchema.parse(params.roleFilter)
    };
    return { success: true, data: validatedParams, errors: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        data: null,
        errors: error.issues.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      };
    }
    return {
      success: false,
      data: null,
      errors: [{ field: 'general', message: 'Parameter validation failed' }]
    };
  }
};

// Enhanced sanitization helpers
export const sanitizeSearchQuery = (query: string): string => {
  return query.trim().replace(/[<>]/g, '');
};

export const normalizeRole = (role: string): UserRole => {
  const normalizedRole = role.toLowerCase().trim();
  if (['admin', 'moderator', 'user'].includes(normalizedRole)) {
    return normalizedRole as UserRole;
  }
  return 'user';
};

/**
 * Enhanced input sanitization to prevent XSS and injection attacks
 */
export const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Enhanced sanitization - remove potentially dangerous characters and patterns
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/data:/gi, '') // Remove data: protocol
    .replace(/vbscript:/gi, '') // Remove vbscript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .replace(/eval\s*\(/gi, '') // Remove eval calls
    .replace(/expression\s*\(/gi, '') // Remove CSS expressions
    .replace(/script/gi, '') // Remove script tags
    .trim();
};

/**
 * Validate webhook URL with security restrictions
 */
export const validateWebhookUrl = (url: string): string | null => {
  if (!url || url.trim() === '') {
    return null; // Empty URLs are allowed
  }

  try {
    const parsedUrl = new URL(url);
    
    // Only allow HTTP and HTTPS protocols
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return 'Webhook URL must use HTTP or HTTPS protocol';
    }
    
    // Prevent localhost and internal IP addresses
    const hostname = parsedUrl.hostname.toLowerCase();
    if (hostname === 'localhost' || 
        hostname === '127.0.0.1' ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        /^172\.(1[6-9]|2[0-9]|3[01])\./.test(hostname)) {
      return 'Webhook URL cannot point to localhost or internal IP addresses';
    }
    
    return null; // Valid URL
  } catch (error) {
    return 'Invalid webhook URL format';
  }
};

/**
 * Validate app setting key for security
 */
export const validateAppSettingKey = (key: string): boolean => {
  if (!key || typeof key !== 'string') {
    return false;
  }
  
  const lowerKey = key.toLowerCase();
  
  // Check for dangerous keywords
  const dangerousKeywords = [
    'supabase', 'key', 'secret', 'password', 'token', 
    'credential', 'url', 'api', 'service_role_key', 
    'anon_key', 'database_url', 'jwt_secret'
  ];
  
  if (dangerousKeywords.some(keyword => lowerKey.includes(keyword))) {
    return false;
  }
  
  // Check format - only alphanumeric and underscores
  if (!/^[a-zA-Z0-9_]+$/.test(key)) {
    return false;
  }
  
  return key.length > 0;
};


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

export const userRoleSchema = z.enum(['admin', 'moderator', 'user'] as const, {
  errorMap: () => ({ message: 'Please select a valid role' })
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
export const paginationSchema = z.object({
  page: z.number().min(1, 'Page must be at least 1').default(1),
  pageSize: z.number().min(5).max(100, 'Page size must be between 5 and 100').default(10),
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
        errors: error.errors.map(err => ({
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
        errors: error.errors.map(err => ({
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

// Sanitization helpers
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

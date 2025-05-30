
import { useCallback } from 'react';
import { validateSearchParams, sanitizeSearchQuery, normalizeRole } from '@/utils/validation';
import { UserManagementAction } from './types';

export function useValidation(dispatch: React.Dispatch<UserManagementAction>) {
  const validateParams = useCallback((params: any) => {
    const validation = validateSearchParams(params);
    if (!validation.success) {
      dispatch({
        type: 'SET_VALIDATION_ERRORS',
        payload: validation.errors?.reduce((acc, err) => ({ ...acc, [err.field]: err.message }), {}) || {}
      });
      return false;
    }
    dispatch({ type: 'SET_VALIDATION_ERRORS', payload: {} });
    return true;
  }, [dispatch]);

  return {
    validateParams,
    sanitizeSearchQuery,
    normalizeRole
  };
}

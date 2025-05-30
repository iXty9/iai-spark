
import { UserRole, UserWithRole } from '@/services/admin/types/userTypes';

export interface UserManagementState {
  users: UserWithRole[];
  loading: boolean;
  error: string | null;
  connectionStatus: any;
  selectedUser: UserWithRole | null;
  dialog: "promote" | "demote" | "environment" | null;
  updatingUserId: string | null;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  searchQuery: string;
  roleFilter: string;
  validationErrors: Record<string, string>;
}

export type UserManagementAction =
  | { type: 'SET_USERS'; payload: UserWithRole[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CONNECTION_STATUS'; payload: any }
  | { type: 'SET_SELECTED_USER'; payload: UserWithRole | null }
  | { type: 'SET_DIALOG'; payload: "promote" | "demote" | "environment" | null }
  | { type: 'SET_UPDATING_USER_ID'; payload: string | null }
  | { type: 'SET_CURRENT_PAGE'; payload: number }
  | { type: 'SET_TOTAL_PAGES'; payload: number }
  | { type: 'SET_PAGE_SIZE'; payload: number }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_ROLE_FILTER'; payload: string }
  | { type: 'SET_VALIDATION_ERRORS'; payload: Record<string, string> }
  | { type: 'CLEAR_FILTERS' };

export const initialState: UserManagementState = {
  users: [],
  loading: true,
  error: null,
  connectionStatus: null,
  selectedUser: null,
  dialog: null,
  updatingUserId: null,
  currentPage: 1,
  totalPages: 1,
  pageSize: 10,
  searchQuery: '',
  roleFilter: 'all',
  validationErrors: {}
};

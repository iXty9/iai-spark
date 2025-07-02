// Main supa-menu service exports
export { supaMenu } from './core';
export type { 
  MenuConfig, 
  MenuItem, 
  MenuPosition, 
  MenuTheme, 
  SupaMenuState 
} from './types';
export { 
  getDefaultMenuConfig, 
  getDefaultLightMenuTheme, 
  getDefaultDarkMenuTheme 
} from './defaults';
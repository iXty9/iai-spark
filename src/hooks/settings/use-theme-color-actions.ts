
import { ThemeColors } from '@/types/theme';
import { applyThemeChanges } from '@/utils/theme-utils';

export interface UseThemeColorActionsProps {
  theme: 'light' | 'dark';
  lightTheme: ThemeColors;
  darkTheme: ThemeColors;
  setLightTheme: (theme: ThemeColors) => void;
  setDarkTheme: (theme: ThemeColors) => void;
}

export const useThemeColorActions = ({
  theme,
  lightTheme,
  darkTheme,
  setLightTheme,
  setDarkTheme
}: UseThemeColorActionsProps = {
  theme: 'light',
  lightTheme: {} as ThemeColors,
  darkTheme: {} as ThemeColors,
  setLightTheme: () => {},
  setDarkTheme: () => {}
}) => {

  const handleLightThemeChange = (e: React.ChangeEvent<HTMLInputElement> | { name: string; value: any }) => {
    const { name, value } = 'target' in e ? e.target : e;
    const updatedTheme: ThemeColors = {
      ...lightTheme,
      [name]: value
    };
    setLightTheme(updatedTheme);
    
    // Apply changes immediately in preview if we're in light mode
    if (theme === 'light') {
      applyThemeChanges(updatedTheme);
    }
  };

  const handleDarkThemeChange = (e: React.ChangeEvent<HTMLInputElement> | { name: string; value: any }) => {
    const { name, value } = 'target' in e ? e.target : e;
    const updatedTheme: ThemeColors = {
      ...darkTheme,
      [name]: value
    };
    setDarkTheme(updatedTheme);
    
    // Apply changes immediately in preview if we're in dark mode
    if (theme === 'dark') {
      applyThemeChanges(updatedTheme);
    }
  };

  const handleLightModeOpacityChange = (name: string, value: number) => {
    handleLightThemeChange({ name, value });
  };

  const handleDarkModeOpacityChange = (name: string, value: number) => {
    handleDarkThemeChange({ name, value });
  };

  return {
    handleLightThemeChange,
    handleDarkThemeChange,
    handleLightModeOpacityChange,
    handleDarkModeOpacityChange
  };
};

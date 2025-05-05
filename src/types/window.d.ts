
interface AppState {
  themeLoadAttempts: number;
  themeLoaded: boolean;
  lastThemeLoadTime: number;
}

declare interface Window {
  APP_STATE: AppState;
}

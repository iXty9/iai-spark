
// This file now serves as a barrel export for the settings services
// This makes the code more maintainable by splitting it into logical modules

export { fetchAppSettings, updateAppSetting, getAppSettingsMap, setDefaultThemeSettings } from './settings/generalSettings';
export { saveConnectionConfig, fetchConnectionConfig } from './settings/connectionSettings';
export type { AppSettings } from './settings/types';
export type { ConnectionConfig } from './settings/types';

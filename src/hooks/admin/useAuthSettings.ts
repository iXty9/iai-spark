import { useState, useEffect } from 'react';
import { settingsCacheService } from '@/services/settings-cache-service';

interface AuthSettings {
  tagline: string;
  welcomeDescription: string;
  loginTitle: string;
  loginDescription: string;
  registerTitle: string;
  registerDescription: string;
  disclaimerText: string;
  disclaimerRequired: boolean;
}

const DEFAULT_AUTH_SETTINGS: AuthSettings = {
  tagline: 'Intelligent Conversations',
  welcomeDescription: 'Welcome back! Sign in to continue your intelligent conversations or create a new account to get started.',
  loginTitle: 'Sign In',
  loginDescription: 'Enter your credentials to access your account and continue your conversations.',
  registerTitle: 'Create Account',
  registerDescription: 'Join Ixty AI to start your intelligent conversation journey. Fill in your details below to get started.',
  disclaimerText: 'I agree to terms & conditions provided by the company. By providing my phone number, I agree to receive text messages from IXTY9 LLC.',
  disclaimerRequired: true,
};

export const useAuthSettings = () => {
  const [authSettings, setAuthSettings] = useState<AuthSettings>(DEFAULT_AUTH_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await settingsCacheService.getSettings();
        
        setAuthSettings({
          tagline: settings.auth_tagline || DEFAULT_AUTH_SETTINGS.tagline,
          welcomeDescription: settings.auth_welcome_description || DEFAULT_AUTH_SETTINGS.welcomeDescription,
          loginTitle: settings.auth_login_title || DEFAULT_AUTH_SETTINGS.loginTitle,
          loginDescription: settings.auth_login_description || DEFAULT_AUTH_SETTINGS.loginDescription,
          registerTitle: settings.auth_register_title || DEFAULT_AUTH_SETTINGS.registerTitle,
          registerDescription: settings.auth_register_description || DEFAULT_AUTH_SETTINGS.registerDescription,
          disclaimerText: settings.auth_disclaimer_text || DEFAULT_AUTH_SETTINGS.disclaimerText,
          disclaimerRequired: settings.auth_disclaimer_required !== 'false',
        });
      } catch (error) {
        console.error('Failed to load auth settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();

    // Listen for settings changes
    const unsubscribe = settingsCacheService.addChangeListener((settings) => {
      setAuthSettings({
        tagline: settings.auth_tagline || DEFAULT_AUTH_SETTINGS.tagline,
        welcomeDescription: settings.auth_welcome_description || DEFAULT_AUTH_SETTINGS.welcomeDescription,
        loginTitle: settings.auth_login_title || DEFAULT_AUTH_SETTINGS.loginTitle,
        loginDescription: settings.auth_login_description || DEFAULT_AUTH_SETTINGS.loginDescription,
        registerTitle: settings.auth_register_title || DEFAULT_AUTH_SETTINGS.registerTitle,
        registerDescription: settings.auth_register_description || DEFAULT_AUTH_SETTINGS.registerDescription,
        disclaimerText: settings.auth_disclaimer_text || DEFAULT_AUTH_SETTINGS.disclaimerText,
        disclaimerRequired: settings.auth_disclaimer_required !== 'false',
      });
    });

    return unsubscribe;
  }, []);

  return { authSettings, isLoading };
};

import React from 'react';
import { Navigate } from 'react-router-dom';
import { getConnectionInfo } from '../services/supabase/connection-service';

export const SiteConfigRequired = ({ children }: { children: React.ReactNode }) => {
  const { hasStoredConfig } = getConnectionInfo();

  if (!hasStoredConfig) {
    return <Navigate to="/setup" />;
  }

  return <>{children}</>;
};

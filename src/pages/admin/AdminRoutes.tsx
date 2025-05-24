
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Admin from '../Admin';

export const AdminRoutes = () => {
  return (
    <Routes>
      <Route path="/*" element={<Admin />} />
    </Routes>
  );
};

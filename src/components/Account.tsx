
import React from 'react';

export const Account = ({ session }: { session: any }) => {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Account Management</h1>
      <p>Manage your account settings and preferences.</p>
      <p>Email: {session?.user?.email}</p>
    </div>
  );
};

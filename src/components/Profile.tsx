
import React from 'react';

interface ProfileProps {
  session: any;
  onAvatarChange: (url: string) => void;
}

export const Profile = ({ session, onAvatarChange }: ProfileProps) => {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">User Profile</h1>
      <p>Manage your profile information.</p>
      {session && <p>Logged in as: {session.user?.email}</p>}
      <button 
        className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        onClick={() => onAvatarChange('https://example.com/avatar.png')}
      >
        Update Avatar
      </button>
    </div>
  );
};

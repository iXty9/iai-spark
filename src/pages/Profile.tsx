import React, { useState, useEffect } from 'react';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { Loader2 } from 'lucide-react';

interface ProfileProps {
  session: any;
  onAvatarChange: (url: string) => void;
}

export default function Profile({ session, onAvatarChange }: ProfileProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [website, setWebsite] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    async function getProfile() {
      try {
        setLoading(true);
        
        if (!session?.user) {
          throw new Error('No user found');
        }
        
        setUser(session.user);
        
        // Get the client before using it
        const client = await supabase;
        if (!client) {
          throw new Error('Supabase client not available');
        }
        
        let { data, error, status } = await client
          .from('profiles')
          .select(`full_name, username, website, avatar_url`)
          .eq('id', session.user.id)
          .single()

        if (error && status !== 406) {
          throw error
        }

        if (data) {
          setFullName(data.full_name);
          setUsername(data.username);
          setWebsite(data.website);
          setAvatarUrl(data.avatar_url);
        }
      } catch (error: any) {
        toast({
          title: 'Error fetching profile',
          description: error.message,
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }

    getProfile()
  }, [session, toast])

  async function updateProfile({
    username,
    website,
    fullName,
    avatarUrl,
  }: {
    username: string
    website: string
    fullName: string
    avatarUrl: string
  }) {
    try {
      setLoading(true)
      
      if (!user) throw new Error('User not authenticated');
      
      // Get the client before using it
      const client = await supabase;
      if (!client) {
        throw new Error('Supabase client not available');
      }

      const updates = {
        id: user.id,
        full_name: fullName,
        username,
        website,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      }

      let { error } = await client.from('profiles').upsert(updates, {
        returning: 'minimal', // Don't return the value after inserting
      })

      if (error) {
        throw error
      }
      
      toast({
        title: 'Profile updated',
        description: 'Your profile has been updated successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Error updating profile',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false)
    }
  }

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.');
      }
      
      setUploading(true);
      
      if (!user) throw new Error('User not authenticated');
      
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;
      
      // Get the client before using storage
      const client = await supabase;
      if (!client) throw new Error('Supabase client not available');
      
      // Now we can use client.storage
      const { error: uploadError } = await client.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });
      
      if (uploadError) throw uploadError;
      
      const { data } = client.storage.from('avatars').getPublicUrl(filePath);
      
      const updates = {
        avatar_url: data.publicUrl,
        updated_at: new Date().toISOString(),
      };
      
      const { error: updateError } = await client
        .from('profiles')
        .update(updates)
        .eq('id', user.id);
        
      if (updateError) throw updateError;
      
      // Update the session with the new avatar URL
      await client.auth.refreshSession();
      
      onAvatarChange(data.publicUrl);
      setAvatarUrl(data.publicUrl);
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: 'Error uploading avatar',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  async function downloadImage(path: string) {
    try {
      const client = await supabase;
      if (!client || !path) return null;
      
      const { data, error } = await client.storage
        .from('avatars')
        .download(path);
        
      if (error) throw error;
      
      return URL.createObjectURL(data);
    } catch (error) {
      console.error('Error downloading image: ', error);
      return null;
    }
  }

  return (
    <div className="form-widget">
      <div className="upload-widget flex justify-center mb-4">
        <Avatar className="w-24 h-24">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback>{username}</AvatarFallback>
        </Avatar>
      </div>
      <Label htmlFor="avatar" className="block mt-2 text-sm font-medium text-gray-700">
        Change Avatar
      </Label>
      <Input
        type="file"
        id="avatar"
        accept="image/*"
        onChange={uploadAvatar}
        disabled={uploading}
        className="mt-1 block w-full shadow-sm sm:text-sm focus:ring-indigo-500"
      />
      {uploading ? (
        <div className="flex items-center justify-center mt-2">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...
        </div>
      ) : null}
      <div>
        <Label htmlFor="email" className="block mt-4 text-sm font-medium text-gray-700">
          Email
        </Label>
        <Input
          id="email"
          type="text"
          value={session?.user?.email || ''}
          disabled
          className="mt-1 block w-full shadow-sm sm:text-sm focus:ring-indigo-500"
        />
      </div>
      <div>
        <Label htmlFor="fullName" className="block mt-4 text-sm font-medium text-gray-700">
          Full Name
        </Label>
        <Input
          id="fullName"
          type="text"
          value={fullName || ''}
          onChange={(e) => setFullName(e.target.value)}
          className="mt-1 block w-full shadow-sm sm:text-sm focus:ring-indigo-500"
        />
      </div>
      <div>
        <Label htmlFor="username" className="block mt-4 text-sm font-medium text-gray-700">
          Username
        </Label>
        <Input
          id="username"
          type="text"
          value={username || ''}
          onChange={(e) => setUsername(e.target.value)}
          className="mt-1 block w-full shadow-sm sm:text-sm focus:ring-indigo-500"
        />
      </div>
      <div>
        <Label htmlFor="website" className="block mt-4 text-sm font-medium text-gray-700">
          Website
        </Label>
        <Input
          id="website"
          type="url"
          value={website || ''}
          onChange={(e) => setWebsite(e.target.value)}
          className="mt-1 block w-full shadow-sm sm:text-sm focus:ring-indigo-500"
        />
      </div>

      <div>
        <Button
          onClick={() => updateProfile({ username, website, fullName, avatarUrl })}
          disabled={loading}
          className="w-full mt-6"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating ...
            </>
          ) : (
            'Update Profile'
          )}
        </Button>
      </div>
    </div>
  )
}

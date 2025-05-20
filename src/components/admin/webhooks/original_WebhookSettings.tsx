import React, { useState, useEffect } from 'react';
import {
  Card, CardContent, CardDescription, CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  createWebhook,
  deleteWebhook,
  fetchWebhooks,
  updateWebhook
} from '@/services/admin/webhookService';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { MoreVertical, Edit, Trash2, Copy, CheckCircle, AlertCircle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { validateWebhookUrl } from './WebhookValidation';
import { Badge } from '@/components/ui/badge';
import { CopyToClipboard } from '@/components/ui/copy-to-clipboard';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { isValidUrl } from '@/utils/security';

interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function WebhookSettings() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<Webhook | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  
  // Load webhooks on mount
  useEffect(() => {
    loadWebhooks();
  }, []);
  
  // Load webhooks from the database
  const loadWebhooks = async () => {
    setIsLoading(true);
    try {
      const data = await fetchWebhooks();
      setWebhooks(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load webhooks',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle webhook creation
  const handleCreateWebhook = async () => {
    if (!name || !url || !events.length) {
      toast({
        title: 'Error',
        description: 'Please fill all fields',
        variant: 'destructive',
      });
      return;
    }
    
    if (!validateWebhookUrl(url)) {
      toast({
        title: 'Error',
        description: 'Please enter a valid URL',
        variant: 'destructive',
      });
      return;
    }
    
    setIsCreating(true);
    try {
      await createWebhook(name, url, events, isActive);
      toast({
        title: 'Success',
        description: 'Webhook created successfully',
      });
      await loadWebhooks();
      resetForm();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create webhook',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };
  
  // Handle webhook update
  const handleUpdateWebhook = async () => {
    if (!selectedWebhook) return;
    
    if (!name || !url || !events.length) {
      toast({
        title: 'Error',
        description: 'Please fill all fields',
        variant: 'destructive',
      });
      return;
    }
    
    if (!isValidUrl(url)) {
      toast({
        title: 'Error',
        description: 'Please enter a valid URL',
        variant: 'destructive',
      });
      return;
    }
    
    setIsUpdating(true);
    try {
      await updateWebhook(selectedWebhook.id, name, url, events, isActive);
      toast({
        title: 'Success',
        description: 'Webhook updated successfully',
      });
      await loadWebhooks();
      resetForm();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update webhook',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };
  
  // Handle webhook deletion
  const handleDeleteWebhook = async (webhookId: string) => {
    try {
      await deleteWebhook(webhookId);
      toast({
        title: 'Success',
        description: 'Webhook deleted successfully',
      });
      await loadWebhooks();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete webhook',
        variant: 'destructive',
      });
    } finally {
      setIsDialogOpen(false);
    }
  };
  
  // Handle form reset
  const resetForm = () => {
    setName('');
    setUrl('');
    setEvents([]);
    setIsActive(true);
    setSelectedWebhook(null);
  };
  
  // Handle event selection
  const handleEventSelection = (event: string) => {
    if (events.includes(event)) {
      setEvents(events.filter((e) => e !== event));
    } else {
      setEvents([...events, event]);
    }
  };
  
  // Handle webhook selection for update
  const handleSelectWebhook = (webhook: Webhook) => {
    setSelectedWebhook(webhook);
    setName(webhook.name);
    setUrl(webhook.url);
    setEvents(webhook.events);
    setIsActive(webhook.is_active);
  };
  
  // Define table columns
  const columns: ColumnDef<Webhook>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
    },
    {
      accessorKey: 'url',
      header: 'URL',
      cell: ({ row }) => (
        <div className="flex items-center space-x-2">
          <a href={row.getValue('url')} target="_blank" rel="noopener noreferrer" className="hover:underline">
            {row.getValue('url')}
          </a>
          <CopyToClipboard text={row.getValue('url')}>
            <Copy className="h-4 w-4 cursor-pointer text-gray-500 hover:text-gray-700" />
          </CopyToClipboard>
        </div>
      ),
    },
    {
      accessorKey: 'events',
      header: 'Events',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.events.map((event) => (
            <Badge key={event}>{event}</Badge>
          ))}
        </div>
      ),
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => (
        row.original.is_active ? (
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>Active</span>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span>Inactive</span>
          </div>
        )
      ),
    },
    {
      accessorKey: 'created_at',
      header: 'Created At',
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => handleSelectWebhook(row.original)}>
              <Edit className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <DropdownMenuItem>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the webhook from our servers.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <Button variant="destructive" onClick={() => handleDeleteWebhook(row.original.id)}>Delete</Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Webhook Management</CardTitle>
        <CardDescription>
          Manage webhooks to receive real-time updates about events in your application.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Webhook Name"
            />
          </div>
          <div>
            <Label htmlFor="url">URL</Label>
            <Input
              id="url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://your-webhook-endpoint.com"
            />
          </div>
        </div>
        <div>
          <Label>Events</Label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {['user.created', 'user.updated', 'user.deleted', 'role.created', 'role.updated', 'role.deleted'].map((event) => (
              <Button
                key={event}
                variant={events.includes(event) ? 'default' : 'outline'}
                onClick={() => handleEventSelection(event)}
              >
                {event}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Switch id="is-active" checked={isActive} onCheckedChange={setIsActive} />
          <Label htmlFor="is-active">Active</Label>
        </div>
        <div className="flex justify-end space-x-2">
          <Button type="button" variant="secondary" onClick={resetForm}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={isCreating || isUpdating}
            onClick={selectedWebhook ? handleUpdateWebhook : handleCreateWebhook}
          >
            {selectedWebhook ? (isUpdating ? 'Updating...' : 'Update Webhook') : (isCreating ? 'Creating...' : 'Create Webhook')}
          </Button>
        </div>
        <DataTable columns={columns} data={webhooks} isLoading={isLoading} />
      </CardContent>
    </Card>
  );
}

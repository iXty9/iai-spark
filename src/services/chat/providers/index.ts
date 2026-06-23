export type ChatBackend = 'webhook' | 'hermes';

export function resolveProvider(
  profile?: { preferred_backend?: string | null } | null,
): ChatBackend {
  return profile?.preferred_backend === 'hermes' ? 'hermes' : 'webhook';
}

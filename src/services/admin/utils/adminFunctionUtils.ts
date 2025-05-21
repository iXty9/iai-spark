import { withSupabase } from '@/utils/supabase-helpers';

// Update functions that directly use supabase client
export async function invokeFunctionWithServiceKey(functionName: string, body: any = {}): Promise<any> {
  return withSupabase(async (client) => {
    // Function implementation using client.functions.invoke
    return client.functions.invoke(functionName, {
      body: JSON.stringify(body)
    });
  });
}

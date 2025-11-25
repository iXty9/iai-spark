import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Generate version info with deployment timestamp
    const deploymentTimestamp = Date.now();
    const versionInfo = {
      version: "1.0.0",
      buildTime: new Date().toISOString(),
      buildHash: `deploy_${deploymentTimestamp}`,
      environment: "production",
      cacheNames: {
        static: `static-v${deploymentTimestamp}`,
        dynamic: `dynamic-v${deploymentTimestamp}`
      }
    };

    return new Response(
      JSON.stringify(versionInfo),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      }
    );
  } catch (error) {
    console.error('Error in version-info function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});

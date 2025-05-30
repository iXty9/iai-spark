
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCorsPreflightRequest, createJsonResponse } from "./cors.ts";
import { authenticateAndAuthorize } from "./auth.ts";
import { handleListUsers } from "./handlers/listUsers.ts";
import { handleSearchUsers } from "./handlers/searchUsers.ts";
import { handleUpdateUserRole } from "./handlers/updateUserRole.ts";

// Simple logging utility for edge functions
function log(level: string, message: string, data?: any) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level.toUpperCase()}] [admin-users] ${message}`, data ? JSON.stringify(data) : '');
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest();
  }

  log('info', 'Request received to admin-users function');

  try {
    const requestBody = await req.json();
    const { action, params = {} } = requestBody;
    
    // Handle ping action without authentication
    if (action === 'ping') {
      log('info', 'Ping request received');
      return createJsonResponse({ 
        success: true, 
        message: 'admin-users function is available' 
      });
    }
    
    // Authenticate and authorize for all other actions
    const authResult = await authenticateAndAuthorize(req.headers.get('Authorization'));
    
    if (!authResult.success) {
      log('warn', 'Authentication failed', { error: authResult.error, code: authResult.code });
      return createJsonResponse({
        error: authResult.error,
        message: authResult.error,
        code: authResult.code
      }, authResult.code === 'access_denied' ? 403 : 401);
    }

    log('info', 'Processing authenticated action', { action, paramsCount: Object.keys(params).length });

    // Handle different actions
    switch (action) {
      case 'listUsers':
        return await handleListUsers(params);
      case 'searchUsers':
        return await handleSearchUsers(params);
      case 'updateUserRole':
        return await handleUpdateUserRole(params);
      default:
        log('warn', 'Invalid action requested', { action });
        return createJsonResponse({ 
          error: 'Invalid action', 
          supportedActions: ['ping', 'listUsers', 'searchUsers', 'updateUserRole'],
          code: "invalid_action"
        }, 400);
    }
  } catch (error) {
    log('error', 'Error processing request', { 
      message: error.message, 
      stack: error.stack?.split('\n').slice(0, 3).join('\n')
    });
    
    return createJsonResponse({ 
      error: error.message,
      code: "server_error",
      details: error.stack ? error.stack.split('\n').slice(0, 3).join('\n') : 'No details available'
    }, 500);
  }
});

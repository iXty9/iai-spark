// Dynamic PWA Manifest API
// This endpoint serves the PWA manifest based on database settings

// Simple CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

// Handle preflight requests
if (typeof window !== 'undefined' && window.location) {
  // Client-side redirect to static manifest for now
  window.location.href = '/manifest.json';
} else {
  // Server-side or service worker context
  // In a full implementation, this would fetch from database
  // For now, redirect to static manifest
  Response.redirect('/manifest.json');
}
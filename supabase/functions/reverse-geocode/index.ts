import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple in-memory rate limiter and cache
const rateMap = new Map<string, { tokens: number; last: number }>();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const cache = new Map<string, { data: any; ts: number }>();

function rateLimit(ip: string, capacity = 30, refillPerSec = 0.5) {
  const now = Date.now();
  const entry = rateMap.get(ip) || { tokens: capacity, last: now };
  const elapsed = (now - entry.last) / 1000;
  entry.tokens = Math.min(capacity, entry.tokens + elapsed * refillPerSec);
  if (entry.tokens < 1) {
    entry.last = now;
    rateMap.set(ip, entry);
    return false;
  }
  entry.tokens -= 1;
  entry.last = now;
  rateMap.set(ip, entry);
  return true;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "anon";
    if (!rateLimit(ip)) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { lat, lon } = await req.json();
    if (typeof lat !== "number" || typeof lon !== "number") {
      return new Response(JSON.stringify({ error: "Invalid lat/lon" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const key = `${lat.toFixed(5)},${lon.toFixed(5)}`; // coarse cache key
    const now = Date.now();
    const cached = cache.get(key);
    if (cached && now - cached.ts < CACHE_TTL_MS) {
      return new Response(JSON.stringify(cached.data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let result: { address?: string; city?: string; country?: string; unavailable?: boolean } | null = null;

    // Primary: Nominatim
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`,
        { headers: { "User-Agent": "IxtyAI-ReverseGeocode/1.0 (contact: support@ixty.ai)", "Accept-Language": "en" } },
      );
      if (resp.ok) {
        const data = await resp.json();
        result = {
          address: data.display_name,
          city: data.address?.city || data.address?.town || data.address?.village,
          country: data.address?.country,
        };
      } else {
        console.warn("nominatim non-ok", resp.status);
      }
    } catch (e) {
      console.warn("nominatim failed", (e as Error).message);
    }

    // Fallback: BigDataCloud (free, no key)
    if (!result) {
      try {
        const resp = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
        );
        if (resp.ok) {
          const d = await resp.json();
          const city = d.city || d.locality || undefined;
          result = {
            address: [city, d.principalSubdivision, d.countryName].filter(Boolean).join(", ") || undefined,
            city,
            country: d.countryName || undefined,
          };
        } else {
          console.warn("bigdatacloud non-ok", resp.status);
        }
      } catch (e) {
        console.warn("bigdatacloud failed", (e as Error).message);
      }
    }

    // Graceful degradation: never fail the client over an optional address lookup
    if (!result) {
      return new Response(JSON.stringify({ address: null, city: null, country: null, unavailable: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    cache.set(key, { data: result, ts: now });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("reverse-geocode error", error);
    return new Response(JSON.stringify({ error: (error as Error).message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

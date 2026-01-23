import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.3";

const allowedOrigins = new Set([
    "https://goatmouth.com",
    "https://www.goatmouth.com",
    "https://goatmouth-git-main-cruelhelps-projects.vercel.app",
    "https://goatmouth-8gb1vi5ix-cruelhelps-projects.vercel.app",
    "https://goatmouth-8iqwwpc0k-cruelhelps-projects.vercel.app",
    "https://goatmouth-qbhs0cfmw-cruelhelps-projects.vercel.app",
    "http://127.0.0.1:5500",
    "http://localhost:5500"
]);

function getCorsHeaders(req: Request) {
    const origin = req.headers.get("origin");
    const allowOrigin = origin && allowedOrigins.has(origin) ? origin : null;
    const requestedHeaders = req.headers.get("access-control-request-headers");

    const headers: Record<string, string> = {
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": requestedHeaders || "authorization, x-client-info, apikey, content-type",
        "Access-Control-Max-Age": "86400",
        "Vary": "Origin"
    };

    if (allowOrigin) {
        headers["Access-Control-Allow-Origin"] = allowOrigin;
        headers["Access-Control-Allow-Credentials"] = "true";
    }

    return { headers, allowOrigin };
}

function jsonResponse(req: Request, body: unknown, status = 200) {
    const { headers } = getCorsHeaders(req);
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            "Content-Type": "application/json",
            ...headers
        }
    });
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        const { headers, allowOrigin } = getCorsHeaders(req);
        if (!allowOrigin) {
            return new Response("Origin not allowed", { status: 403, headers });
        }
        return new Response(null, { status: 204, headers });
    }

    if (req.method !== "POST") {
        return jsonResponse(req, { error: "Method not allowed" }, 405);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const testspriteApiKey = Deno.env.get("TESTSPRITE_API_KEY") || "";
    const testspriteApiUrl = Deno.env.get("TESTSPRITE_API_URL") || "";

    if (!supabaseUrl || !serviceRoleKey) {
        return jsonResponse(req, { error: "Missing Supabase environment variables" }, 500);
    }

    if (!testspriteApiKey || !testspriteApiUrl) {
        return jsonResponse(req, { error: "Missing TestSprite environment variables" }, 500);
    }

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

    if (!token) {
        return jsonResponse(req, { error: "Missing authorization token" }, 401);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false }
    });

    const { data: authData, error: authError } = await adminClient.auth.getUser(token);
    if (authError || !authData?.user) {
        return jsonResponse(req, { error: "Unauthorized" }, 401);
    }

    const { data: callerProfile, error: profileError } = await adminClient
        .from("profiles")
        .select("id, role")
        .eq("id", authData.user.id)
        .maybeSingle();

    if (profileError) {
        return jsonResponse(req, { error: "Failed to validate profile" }, 500);
    }

    if (!callerProfile || callerProfile.role !== "admin") {
        return jsonResponse(req, { error: "Forbidden" }, 403);
    }

    let payload: {
        path?: string;
        method?: string;
        query?: Record<string, string>;
        body?: unknown;
    } = {};

    try {
        payload = await req.json();
    } catch (_) {
        payload = {};
    }

    const path = payload.path || "/runs";
    const method = (payload.method || "GET").toUpperCase();
    const query = payload.query || {};
    const body = payload.body;

    const url = new URL(path, testspriteApiUrl);
    Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            url.searchParams.set(key, value);
        }
    });

    const headers: Record<string, string> = {
        "Authorization": `Bearer ${testspriteApiKey}`,
        "Accept": "application/json"
    };

    if (method !== "GET" && body !== undefined) {
        headers["Content-Type"] = "application/json";
    }

    let upstreamResponse: Response;
    try {
        upstreamResponse = await fetch(url.toString(), {
            method,
            headers,
            body: method === "GET" || body === undefined ? undefined : JSON.stringify(body)
        });
    } catch (error) {
        return jsonResponse(req, { error: "Failed to reach TestSprite API", details: String(error) }, 502);
    }

    const text = await upstreamResponse.text();
    let data: unknown = null;
    try {
        data = text ? JSON.parse(text) : null;
    } catch (_) {
        data = { raw: text };
    }

    if (!upstreamResponse.ok) {
        return jsonResponse(req, {
            error: "TestSprite API error",
            status: upstreamResponse.status,
            data
        }, 502);
    }

    return jsonResponse(req, { data }, 200);
});

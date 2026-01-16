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

    if (!supabaseUrl || !serviceRoleKey) {
        return jsonResponse(req, { error: "Missing Supabase environment variables" }, 500);
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

    let roleFilter = null;
    try {
        const body = await req.json();
        roleFilter = body?.role || null;
    } catch (_) {
        roleFilter = null;
    }

    const users = [];
    let page = 1;
    const perPage = 1000;

    while (true) {
        const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
        if (error) {
            return jsonResponse(req, { error: "Failed to list users" }, 500);
        }

        users.push(...(data?.users || []));

        if (!data?.users || data.users.length < perPage) {
            break;
        }

        page += 1;
    }

    const userIds = users.map((user) => user.id);
    const profilesById = new Map();

    if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await adminClient
            .from("profiles")
            .select("*")
            .in("id", userIds);

        if (profilesError) {
            return jsonResponse(req, { error: "Failed to load profiles" }, 500);
        }

        (profiles || []).forEach((profile) => {
            profilesById.set(profile.id, profile);
        });
    }

    const mergedUsers = users.map((user) => {
        const profile = profilesById.get(user.id) || {};
        const email = profile.email || user.email || null;
        const fallbackUsername = email ? email.split("@")[0] : "user";

        return {
            id: user.id,
            email,
            username: profile.username || user.user_metadata?.username || fallbackUsername,
            role: profile.role || "user",
            balance: profile.balance || 0,
            created_at: profile.created_at || user.created_at || null,
            updated_at: profile.updated_at || null,
            avatar_url: profile.avatar_url || null,
            display_name: profile.display_name || null,
            bio: profile.bio || null,
            auth_created_at: user.created_at || null,
            last_sign_in_at: user.last_sign_in_at || null
        };
    });

    const filteredUsers = roleFilter
        ? mergedUsers.filter((user) => user.role === roleFilter)
        : mergedUsers;

    return jsonResponse(req, { users: filteredUsers, total: filteredUsers.length }, 200);
});

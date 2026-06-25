import "edge-runtime";

import { createClient } from '@supabase/supabase-js';





Deno.serve(async (req: Request) => {
    const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        {
            global: {
                headers: { Authorization: req.headers.get('Authorization')! },
            },
        }
    );

    let dbStatus = "unknown";
    try {
        const { error } = await supabaseClient.from('profiles').select('id').limit(1);
        dbStatus = error ? "error" : "connected";
    } catch (err) {
        dbStatus = "failed";
    }

    const data = {
        status: dbStatus === "connected" ? "ok" : "degraded",
        database: dbStatus,
        message: dbStatus === "connected" ? "Migonest API is healthy" : "Database connection issues",
        timestamp: new Date().toISOString(),
        environment: Deno.env.get("ENVIRONMENT") || "unknown"
    };

    return new Response(JSON.stringify(data), {
        headers: {
            "Content-Type": "application/json",
            "Connection": "keep-alive"
        }
    });
});

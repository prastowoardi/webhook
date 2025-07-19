export default {
  async fetch(request, env) {
    const { method } = request;
    const { pathname } = new URL(request.url);

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    if (method === 'POST' && pathname === '/webhook') {
      const body = await request.json();
      const ip =
        request.headers.get("CF-Connecting-IP") ||
        request.headers.get("X-Forwarded-For") ||
        request.headers.get("X-Real-IP") ||
        "unknown";

      const log = {
        timestamp: new Date().toISOString(),
        ip,
        body,
      };

      const key = `log-${Date.now()}`;
      await env.LOGS.put(key, JSON.stringify(log));

      return new Response("OK", {
        status: 200,
        headers: corsHeaders,
      });
    }

    if (method === 'GET' && pathname === '/logs') {
      const list = await env.LOGS.list({ prefix: "log-" });
      const keys = list.keys.sort((a, b) => b.name.localeCompare(a.name)); // descending

      const logs = [];
      for (const key of keys.slice(0, 100)) {
        const value = await env.LOGS.get(key.name);
        if (value) logs.push(JSON.parse(value));
      }

      return new Response(JSON.stringify(logs), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }

    if (method === 'GET' && pathname === '/') {
      return Response.redirect("https://prastowoardi.github.io", 302);
    }

    return new Response("Not Found", {
      status: 404,
      headers: corsHeaders,
    });
  }
};

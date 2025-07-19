export default {
  async fetch(request, env, ctx) {
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
      let body;
      try {
        body = await request.json();
      } catch (e) {
        body = { error: "Invalid JSON" };
      }

      const log = {
        timestamp: new Date().toISOString(),
        ip: request.headers.get("CF-Connecting-IP") || request.headers.get("x-forwarded-for") || "unknown",
        method: method || "UNKNOWN",
        body,
        userAgent: request.headers.get("user-agent") || "unknown",
      };

      let oldLogs = [];
      try {
        const oldLogsText = await env.LOGS.get("webhook_logs");
        if (oldLogsText) {
          oldLogs = JSON.parse(oldLogsText);
        }
      } catch (e) {
        oldLogs = [];
      }

      oldLogs.unshift(log);
      if (oldLogs.length > 100) oldLogs = oldLogs.slice(0, 100);

      await env.LOGS.put("webhook_logs", JSON.stringify(oldLogs));

      return new Response("OK", {
        status: 200,
        headers: corsHeaders,
      });
    }

    if (method === 'GET' && pathname === '/logs') {
      const logsText = await env.LOGS.get("webhook_logs");
      return new Response(logsText || "[]", {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }

    if (method === 'GET' && pathname === '/') {
      return Response.redirect('https://prastowoardi.github.io', 302);
    }

    return new Response('Not Found', {
      status: 404,
      headers: corsHeaders,
    });
  },
};

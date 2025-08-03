export default {
  async fetch(request, env, ctx) {
    const { method } = request;
    const { pathname } = new URL(request.url);

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    const MAX_LOGS_PER_PAGE = 100;

    async function saveLog(log) {
      let pageIndex = 0;

      while (true) {
        const key = `webhook_logs_${pageIndex}`;
        let logs = [];

        const existing = await env.LOGS.get(key);
        if (existing) {
          logs = JSON.parse(existing);
        }

        if (logs.length < MAX_LOGS_PER_PAGE) {
          logs.unshift(log);
          await env.LOGS.put(key, JSON.stringify(logs));
          break;
        }

        pageIndex++;
      }
    }

    async function getAllLogs() {
      let allLogs = [];
      let pageIndex = 0;

      while (true) {
        const key = `webhook_logs_${pageIndex}`;
        const data = await env.LOGS.get(key);
        if (!data) break;

        const logs = JSON.parse(data);
        if (logs.length === 0) break;

        allLogs = allLogs.concat(logs);
        pageIndex++;
      }

      return allLogs;
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
        headers: {},
      };

      for (const [key, value] of request.headers.entries()) {
        log.headers[key] = value;
      }

      await saveLog(log);

      return new Response("OK", {
        status: 200,
        headers: corsHeaders,
      });
    }

    if (method === 'GET' && pathname === '/logs') {
      const logs = await getAllLogs();
      return new Response(JSON.stringify(logs), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }

    if (method === 'DELETE' && pathname === '/logs') {
      let pageIndex = 0;
      while (true) {
        const key = `webhook_logs_${pageIndex}`;
        const data = await env.LOGS.get(key);
        if (!data) break;
        await env.LOGS.delete(key);
        pageIndex++;
      }

      return new Response("All logs deleted", {
        status: 200,
        headers: corsHeaders,
      });
    }

    if (method === 'GET' && pathname === '/') {
      return Response.redirect('https://prastowoardi.github.io', 302);
    }

    if (method === 'GET' && pathname === '/webhook') {
      return new Response('Webhook endpoint - GET is not allowed', {
        status: 405,
        headers: corsHeaders,
      });
    }

    return new Response('Not Found', {
      status: 404,
      headers: corsHeaders,
    });
  },
};

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

    async function getLogs() {
      const logsText = await env.LOGS.get("webhook_logs");
      return logsText ? JSON.parse(logsText) : [];
    }

    async function saveLogs(logs) {
      await env.LOGS.put("webhook_logs", JSON.stringify(logs));
    }

    async function deleteLogAtIndex(index) {
      const logs = await getLogs();
      if (isNaN(index) || index < 0 || index >= logs.length) {
        throw new Error("Index out of range");
      }
      logs.splice(index, 1);
      await saveLogs(logs);
    }

    if (method === 'POST' && pathname === '/webhook') {
      let body = {};
      try {
        body = await request.json();
      } catch {
        return new Response("Invalid JSON", {
          status: 400,
          headers: corsHeaders,
        });
      }

      const log = {
        timestamp: new Date().toISOString(),
        ip: request.headers.get("CF-Connecting-IP") || request.headers.get("x-forwarded-for") || "unknown",
        method,
        body,
        userAgent: request.headers.get("user-agent") || "unknown",
        headers: {},
      };

      for (const [key, value] of request.headers.entries()) {
        log.headers[key] = value;
      }

      const logs = await getLogs();
      logs.unshift(log);
      if (logs.length > 100) logs.length = 100;
      await saveLogs(logs);

      return new Response("OK", {
        status: 200,
        headers: corsHeaders,
      });
    }

    if (method === 'GET' && pathname === '/logs') {
      const logs = await getLogs();
      return new Response(JSON.stringify(logs), {
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

    if (method === 'DELETE' && pathname.startsWith('/logs/')) {
      const indexStr = pathname.split('/')[2];
      const index = parseInt(indexStr, 10);

      try {
        await deleteLogAtIndex(index);
        return new Response("Log deleted", {
          status: 200,
          headers: corsHeaders,
        });
      } catch (err) {
        return new Response(err.message, {
          status: 400,
          headers: corsHeaders,
        });
      }
    }

    if (method === 'DELETE' && pathname === '/logs') {
      await saveLogs([]);
      return new Response("All logs deleted", {
        status: 200,
        headers: corsHeaders,
      });
    }

    if (method === 'POST' && pathname === '/delete') {
      let data = {};
      try {
        data = await request.json();
      } catch {
        return new Response("Invalid JSON", { status: 400, headers: corsHeaders });
      }

      const index = parseInt(data.index, 10);

      try {
        await deleteLogAtIndex(index);
        return new Response("Log deleted", {
          status: 200,
          headers: corsHeaders,
        });
      } catch (err) {
        return new Response(err.message, {
          status: 400,
          headers: corsHeaders,
        });
      }
    }

    return new Response('Not Found', {
      status: 404,
      headers: corsHeaders,
    });
  },
};

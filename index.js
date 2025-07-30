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

    if (method === 'GET' && pathname === '/webhook') {
      return new Response('Webhook endpoint - GET is not allowed', {
        status: 405,
        headers: corsHeaders,
      });
    }

    if (method === 'DELETE' && pathname.startsWith('/logs/')) {
      const indexStr = pathname.split('/')[2];
      const index = parseInt(indexStr, 10);

      if (isNaN(index)) {
        return new Response("Invalid index", { status: 400 });
      }

      const logsText = await env.LOGS.get("webhook_logs");
      if (!logsText) {
        return new Response("No logs", { status: 404 });
      }

      let logs = [];
      try {
        logs = JSON.parse(logsText);
      } catch {
        return new Response("Corrupt log data", { status: 500 });
      }

      if (index < 0 || index >= logs.length) {
        return new Response("Index out of range", { status: 404 });
      }

      logs.splice(index, 1);

      await env.LOGS.put("webhook_logs", JSON.stringify(logs));

      return new Response("Log deleted", {
        status: 200,
        headers: corsHeaders,
      });
    }

    if (method === 'DELETE' && pathname === '/logs') {
      await env.LOGS.put("webhook_logs", JSON.stringify([]));
      return new Response("All logs deleted", {
        status: 200,
        headers: corsHeaders,
      });
    }

    if (method === 'POST' && pathname === '/delete') {
      let { index } = await request.json();
      index = parseInt(index, 10);

      if (isNaN(index)) {
        return new Response("Invalid index", { status: 400, headers: corsHeaders });
      }

      const logsText = await env.LOGS.get("webhook_logs");
      if (!logsText) {
        return new Response("No logs", { status: 404, headers: corsHeaders });
      }

      let logs = [];
      try {
        logs = JSON.parse(logsText);
      } catch {
        return new Response("Corrupt log data", { status: 500, headers: corsHeaders });
      }

      if (index < 0 || index >= logs.length) {
        return new Response("Index out of range", { status: 404, headers: corsHeaders });
      }

      logs.splice(index, 1);

      await env.LOGS.put("webhook_logs", JSON.stringify(logs));

      return new Response("Log deleted", {
        status: 200,
        headers: corsHeaders,
      });
    }

    return new Response('Not Found', {
      status: 404,
      headers: corsHeaders,
    });
  },
};

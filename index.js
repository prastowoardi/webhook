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
      const log = {
        timestamp: new Date().toISOString(),
        ip: request.headers.get("CF-Connecting-IP") || "unknown",
        body,
      };

      let currentLogsJSON = await env.LOGS.get("entries");
      let currentLogs = currentLogsJSON ? JSON.parse(currentLogsJSON) : [];

      currentLogs.push(log);
      if (currentLogs.length > 50) currentLogs.shift();

      await env.LOGS.put("entries", JSON.stringify(currentLogs));

      return new Response("OK", {
        status: 200,
        headers: corsHeaders,
      });
    }

    if (method === 'GET' && pathname === '/logs') {
      let logs = await env.LOGS.get("entries");
      return new Response(logs || "[]", {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }

    return new Response('Not Found', {
      status: 404,
      headers: corsHeaders,
    });
  },
};

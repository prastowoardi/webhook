let logs = [];

export default {
  async fetch(request) {
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

      logs.push(log);
      if (logs.length > 50) logs.shift();

      console.log("Webhook received", log);

      return new Response("OK", {
        status: 200,
        headers: corsHeaders,
      });
    }

    if (method === 'GET' && pathname === '/logs') {
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

    return new Response('Not Found', {
      status: 404,
      headers: corsHeaders,
    });
  },
};

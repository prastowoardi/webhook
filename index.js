let logs = [];

export default {
  async fetch(request) {
    const { pathname } = new URL(request.url);

    if (request.method === 'POST' && pathname === '/webhook') {
      const body = await request.json();

      const log = {
        timestamp: new Date().toISOString(),
        ip: request.headers.get("CF-Connecting-IP") || "unknown",
        body,
      };

      logs.push(log);

      if (logs.length > 50) logs.shift();

      console.log("📩 Webhook:", JSON.stringify(log, null, 2));
      return new Response("OK", { status: 200 });
    }

    if (request.method === 'GET' && pathname === '/logs') {
      return new Response(JSON.stringify(logs), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response("Not Found", { status: 404 });
  },
};

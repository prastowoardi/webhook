export default {
  async fetch(request, env, ctx) {
    const { method } = request;
    const { pathname } = new URL(request.url);

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept, Origin, User-Agent, Cache-Control, Pragma, X-Custom-Header",
      "Access-Control-Max-Age": "86400",
      "Access-Control-Allow-Credentials": "false",
      "Vary": "Origin, Access-Control-Request-Method, Access-Control-Request-Headers"
    };

    function withCors(body, status = 200, extraHeaders = {}) {
      return new Response(body, {
        status,
        headers: {
          ...corsHeaders,
          ...extraHeaders,
        },
      });
    }

    if (method === "OPTIONS") {
      return withCors(null, 204, {
        "Content-Length": "0"
      });
    }

    const MAX_LOGS_PER_PAGE = 100;

    async function saveLog(log) {
      let pageIndex = 0;
      while (true) {
        const key = `webhook_logs_${pageIndex}`;
        let logs = [];
        const existing = await env.LOGS.get(key);
        if (existing) logs = JSON.parse(existing);

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

        try {
          const logs = JSON.parse(data);
          if (logs.length === 0) break;
          allLogs = allLogs.concat(logs);
        } catch (err) {
          console.error(`Error parsing ${key}:`, err);
        }
        pageIndex++;
      }
      return allLogs;
    }

    try {
      if (method === "POST" && pathname === "/webhook") {
        let body;
        try {
          body = await request.json();
        } catch {
          body = { error: "Invalid JSON" };
        }

        const log = {
          timestamp: new Date().toISOString(),
          ip: request.headers.get("CF-Connecting-IP") || request.headers.get("x-forwarded-for") || "unknown",
          method,
          body,
          userAgent: request.headers.get("user-agent") || "unknown",
          headers: Object.fromEntries(request.headers.entries()),
        };

        await saveLog(log);
        return withCors("OK", 200, {
          "Content-Type": "text/plain"
        });
      }

      if (method === "GET" && pathname === "/logs") {
        const logs = await getAllLogs();
        return withCors(JSON.stringify(logs), 200, { 
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate"
        });
      }

      if (method === "DELETE" && pathname === "/logs") {
        let pageIndex = 0;
        while (true) {
          const key = `webhook_logs_${pageIndex}`;
          const data = await env.LOGS.get(key);
          if (!data) break;
          await env.LOGS.delete(key);
          pageIndex++;
        }
        return withCors("All logs deleted", 200, {
          "Content-Type": "text/plain"
        });
      }

      if (method === "DELETE" && pathname.startsWith("/logs/")) {
        try {
          const indexStr = pathname.split("/")[2];
          const globalIndex = parseInt(indexStr, 10);
          if (isNaN(globalIndex)) return withCors("Invalid index", 400, {
            "Content-Type": "text/plain"
          });

          let allLogs = await getAllLogs();
          if (globalIndex < 0 || globalIndex >= allLogs.length) {
            return withCors("Index out of range", 404, {
              "Content-Type": "text/plain"
            });
          }

          allLogs.splice(globalIndex, 1);

          let pageIndex = 0;
          while (allLogs.length > 0) {
            const key = `webhook_logs_${pageIndex}`;
            const chunk = allLogs.splice(0, MAX_LOGS_PER_PAGE);
            await env.LOGS.put(key, JSON.stringify(chunk));
            pageIndex++;
          }

          while (true) {
            const key = `webhook_logs_${pageIndex}`;
            const data = await env.LOGS.get(key);
            if (!data) break;
            await env.LOGS.delete(key);
            pageIndex++;
          }

          return withCors("Log deleted", 200, {
            "Content-Type": "text/plain"
          });
        } catch (err) {
          return withCors(`Error: ${err.message}`, 500, {
            "Content-Type": "text/plain"
          });
        }
      }

      if (method === "GET" && pathname === "/") {
        return new Response(null, {
          status: 302,
          headers: {
            ...corsHeaders,
            "Location": "https://prastowoardi.github.io"
          }
        });
      }

      if (method === "GET" && pathname === "/webhook") {
        return withCors("Webhook endpoint - GET is not allowed", 405, {
          "Content-Type": "text/plain"
        });
      }

      return withCors("Not Found", 404, {
        "Content-Type": "text/plain"
      });

    } catch (error) {
      console.error("Worker error:", error);
      return withCors("Internal Server Error", 500, {
        "Content-Type": "text/plain"
      });
    }
  },
};
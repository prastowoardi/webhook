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
    const TWO_MONTHS_MS = 60 * 24 * 60 * 60 * 1000; // 60 hari dalam ms

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

    /**
     * Tulis ulang semua logs ke storage secara berurutan per halaman.
     * Hapus halaman lama yang sudah tidak terpakai.
     */
    async function rebuildStorage(logs, maxOldPage) {
      const remaining = [...logs];
      let pageIndex = 0;

      while (remaining.length > 0) {
        const key = `webhook_logs_${pageIndex}`;
        const chunk = remaining.splice(0, MAX_LOGS_PER_PAGE);
        await env.LOGS.put(key, JSON.stringify(chunk));
        pageIndex++;
      }

      // Hapus sisa halaman lama yang sudah tidak dipakai
      while (pageIndex <= maxOldPage) {
        const key = `webhook_logs_${pageIndex}`;
        const data = await env.LOGS.get(key);
        if (!data) break;
        await env.LOGS.delete(key);
        pageIndex++;
      }
    }

    /**
     * Ambil semua logs, filter yang sudah > 2 bulan,
     * dan rebuild storage kalau ada yang dihapus.
     */
    async function getAllLogs() {
      const cutoff = new Date(Date.now() - TWO_MONTHS_MS);
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

      const lastPageIndex = pageIndex - 1;

      const filtered = allLogs.filter(
        (log) => new Date(log.timestamp) >= cutoff
      );

      if (filtered.length < allLogs.length) {
        console.log(
          `Auto-cleanup: ${allLogs.length - filtered.length} log(s) older than 2 months removed.`
        );
        await rebuildStorage(filtered, lastPageIndex);
      }

      return filtered;
    }

    /**
     * Cleanup khusus dipanggil dari Cron Trigger (scheduled handler).
     * Sama persis dengan getAllLogs() tapi tanpa return value.
     */
    async function cleanupOldLogs() {
      await getAllLogs(); // efek sampingnya sudah rebuild storage
    }

    try {
      // POST /webhook — terima log baru
      if (method === "POST" && pathname === "/webhook") {
        let body;
        try {
          body = await request.json();
        } catch {
          body = { error: "Invalid JSON" };
        }

        const log = {
          timestamp: new Date().toISOString(),
          ip:
            request.headers.get("CF-Connecting-IP") ||
            request.headers.get("x-forwarded-for") ||
            "unknown",
          method,
          body,
          userAgent: request.headers.get("user-agent") || "unknown",
          headers: Object.fromEntries(request.headers.entries()),
        };

        await saveLog(log);
        return withCors(JSON.stringify({
          message: "OK",
          status: 200
        }), 200, {
          "Content-Type": "application/json"
        });
      }

      // GET /logs — ambil semua logs (sekaligus trigger cleanup otomatis)
      if (method === "GET" && pathname === "/logs") {
        const logs = await getAllLogs();
        return withCors(JSON.stringify(logs), 200, {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        });
      }

      // DELETE /logs — hapus semua logs
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
          "Content-Type": "text/plain",
        });
      }

      // DELETE /logs/:index — hapus satu log berdasarkan index global
      if (method === "DELETE" && pathname.startsWith("/logs/")) {
        try {
          const indexStr = pathname.split("/")[2];
          const globalIndex = parseInt(indexStr, 10);
          if (isNaN(globalIndex)) 
              return withCors("Invalid index", 400, {
              "Content-Type": "text/plain",
            });

          let allLogs = await getAllLogs();
          if (globalIndex < 0 || globalIndex >= allLogs.length) {
            return withCors("Index out of range", 404, {
              "Content-Type": "text/plain",
            });
          }

          allLogs.splice(globalIndex, 1);
          await rebuildStorage(allLogs, Math.ceil(allLogs.length / MAX_LOGS_PER_PAGE) + 1);

          return withCors("Log deleted", 200, { "Content-Type": "text/plain" });
        } catch (err) {
          return withCors(`Error: ${err.message}`, 500, {
            "Content-Type": "text/plain",
          });
        }
      }

      // GET / — redirect
      if (method === "GET" && pathname === "/") {
        return new Response(null, {
          status: 302,
          headers: {
            ...corsHeaders,
            Location: "https://prastowoardi.github.io",
          },
        });
      }

      // GET /webhook — method not allowed
      if (method === "GET" && pathname === "/webhook") {
        return withCors("Webhook endpoint - GET is not allowed", 405, {
          "Content-Type": "text/plain",
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

  // ─── Cron Trigger ────────────────────────────────────────────────────────
  // Jadwal di wrangler.toml:
  //   [triggers]
  //   crons = ["0 0 1 * *"]   ← tiap tanggal 1 setiap bulan, jam 00:00 UTC
  //
  async scheduled(event, env, ctx) {
    console.log(`[Cron] Cleanup triggered at ${new Date().toISOString()}`);

    const TWO_MONTHS_MS = 60 * 24 * 60 * 60 * 1000;
    const cutoff = new Date(Date.now() - TWO_MONTHS_MS);
    const MAX_LOGS_PER_PAGE = 100;

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
        console.error(`[Cron] Error parsing ${key}:`, err);
      }
      pageIndex++;
    }

    const lastPageIndex = pageIndex - 1;
    const filtered = allLogs.filter((log) => new Date(log.timestamp) >= cutoff);
    const removedCount = allLogs.length - filtered.length;

    if (removedCount > 0) {
      // Rebuild storage dengan logs yang masih valid
      const remaining = [...filtered];
      let writeIndex = 0;

      while (remaining.length > 0) {
        const key = `webhook_logs_${writeIndex}`;
        const chunk = remaining.splice(0, MAX_LOGS_PER_PAGE);
        await env.LOGS.put(key, JSON.stringify(chunk));
        writeIndex++;
      }

      // Hapus halaman lama yang tidak terpakai
      while (writeIndex <= lastPageIndex) {
        const key = `webhook_logs_${writeIndex}`;
        const data = await env.LOGS.get(key);
        if (!data) break;
        await env.LOGS.delete(key);
        writeIndex++;
      }

      console.log(`[Cron] Removed ${removedCount} log(s) older than 2 months.`);
    } else {
      console.log(`[Cron] No old logs found. Storage is clean.`);
    }
  },
};
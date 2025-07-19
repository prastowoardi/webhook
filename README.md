# Webhook Logger

A simple webhook logger using Cloudflare Workers and GitHub Pages. Logs incoming webhook requests and displays them on a static HTML page with real-time polling.

## 🗂 Project Structure

```
repo-root/
├── index.js            # Cloudflare Worker script
├── wrangler.toml       # Wrangler configuration
└── gh-pages/
    ├── index.html      # Static HTML for GitHub Pages
    └── main.js         # Frontend script for polling logs
```

## 🚀 Getting Started

### Prerequisites

* Node.js & npm
* [Wrangler CLI v3+](https://developers.cloudflare.com/workers/wrangler/)
* GitHub repository with GitHub Pages enabled
* Cloudflare account with Workers access

### 1. Setup Cloudflare Worker

1. **Configure `wrangler.toml`:**

   ```toml
   name = "webhook"
   type = "javascript"

   main = "index.js"
   compatibility_date = "2024-07-19"

   [[kv_namespaces]]
   binding = "LOGS"
   id = "<YOUR_KV_NAMESPACE_ID>"
   ```

2. **Publish Worker:**

   ```bash
   npm install -g wrangler
   wrangler login
   wrangler kv:namespace create "LOGS"  # Only first time
   wrangler publish
   ```

3. **Verify endpoints:**

   * POST webhook: `https://<your-worker>.workers.dev/webhook`
   * GET logs: `https://<your-worker>.workers.dev/logs`

### 2. Setup GitHub Pages

1. Create a folder `gh-pages/` in your repo root.
2. Copy the following into `gh-pages/index.html` and `gh-pages/main.js`.
3. In GitHub repository settings → Pages:

   * Source: Branch `main`
   * Folder: `/gh-pages`
4. Wait for the page to deploy: `https://<username>.github.io/<repo>/`

## 📋 Usage

1. **Deploy Worker**: `wrangler publish`
2. **Enable GitHub Pages** on `gh-pages/` folder.
3. **Send webhook** to `https://<your-worker>.workers.dev/webhook`.
4. **View logs** at `https://<username>.github.io/<repo>/`.

---


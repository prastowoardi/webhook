function loadLogs() {
  fetch("https://webhook.prastowoardi616.workers.dev/logs")
    .then(res => res.json())
    .then(data => {
      const container = document.getElementById("log-container");

      const openMap = {};
      Array.from(container.children).forEach(child => {
        const summary = child.querySelector("summary");
        if (child.tagName === "DETAILS" && child.open && summary) {
          openMap[summary.textContent] = true;
        }
      });

      container.innerHTML = "";

      [...data].reverse().forEach((log) => {
        if (!log.method || log.method === "UNKNOWN") return;

        const details = document.createElement("details");
        const summary = document.createElement("summary");

        const gmt7 = new Date(log.timestamp);
        gmt7.setHours(gmt7.getHours() + 7);
        const localTime = gmt7.toISOString().replace("T", " ").slice(0, 19);

        const summaryText = `${log.method} - ${localTime} - ${log.ip}`;
        summary.textContent = summaryText;
        details.appendChild(summary);

        const jsonText = JSON.stringify(log.body, null, 2);

        const copyBtn = copyButton(jsonText);
        details.appendChild(copyBtn);

        const linkedText = jsonText.replace(
          /(https?:\/\/[^\s"]+)/g,
          '<a href="$1" target="_blank" style="color:#4FC3F7;">$1</a>'
        );

        const pre = document.createElement("pre");
        pre.innerHTML = linkedText;
        details.appendChild(pre);

        if (openMap[summaryText]) {
          details.open = true;
        }

        container.prepend(details);
      });
    })
    .catch(err => {
      document.getElementById("log-container").innerText = "Error loading logs.";
      console.error(err);
    });
}

function copyButton(textToCopy) {
  const button = document.createElement("button");
  button.textContent = "📋 Copy";
  button.style.margin = "10px 0";
  button.style.cursor = "pointer";
  button.style.backgroundColor = "#444";
  button.style.color = "#fff";
  button.style.border = "none";
  button.style.padding = "5px 10px";
  button.style.borderRadius = "4px";
  button.style.fontSize = "12px";

  button.addEventListener("click", () => {
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        button.textContent = "✅ Copied!";
        setTimeout(() => (button.textContent = "📋 Copy"), 1500);
      })
      .catch(() => {
        button.textContent = "❌ Failed";
      });
  });

  return button;
}

loadLogs();
setInterval(loadLogs, 5000);

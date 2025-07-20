import { deleteSingleLog, deleteLogs } from './helpers/action.js';

function loadLogs() {
  fetch("https://webhook.prastowoardi616.workers.dev/logs")
    .then(res => res.json())
    .then(data => {
      const container = document.getElementById("log-container");
      const countDisplay = document.getElementById("log-count");

      if (!data || data.length === 0) {
        countDisplay.textContent = "Total Logs: 0";
        container.innerHTML = "<p style='text-align:center; color:#888;'>No log data!</p>";
        return;
      }
      countDisplay.innerHTML = `Total Data: <strong>${data.length}</strong>`;

      const openMap = {};
      Array.from(container.children).forEach(child => {
        const summary = child.querySelector("summary");
        if (child.tagName === "DETAILS" && child.open && summary) {
          const key = summary.getAttribute("data-key");
          if (key) openMap[key] = true;
        }
      });
      
      container.innerHTML = "";
      
      [...data].reverse().forEach((log, i) => {
        if (!log.method || log.method === "UNKNOWN") return;
      
        const details = document.createElement("details");
        const summary = document.createElement("summary");
      
        const gmt7 = new Date(log.timestamp);
        gmt7.setHours(gmt7.getHours() + 7);
        const localTime = moment(log.timestamp).utcOffset(7).format("DD-MM-YYYY - HH:mm:ss");
      
        const summaryText = `${log.method} - ${localTime} - ${log.ip}`;
        const uniqueKey = `${log.timestamp}_${log.ip}_${log.method}`;
      
        summary.textContent = summaryText;
        summary.setAttribute("data-key", uniqueKey);
      
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "🗑️";
        deleteBtn.style.marginLeft = "10px";
        deleteBtn.style.cursor = "pointer";
        deleteBtn.style.background = "none";
        deleteBtn.style.border = "none";
        deleteBtn.style.color = "#f44336";
        deleteBtn.style.fontSize = "14px";
        deleteBtn.style.float = "right";
        deleteBtn.onclick = (event) => {
          event.stopPropagation();
          deleteSingleLog(data.length - 1 - i);
        };
        summary.appendChild(deleteBtn);
      
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
      
        if (openMap[uniqueKey]) {
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

document.getElementById("delete-all").addEventListener("click", deleteLogs);

function updateCurrentTime() {
  const now = moment().utcOffset(7);
  const formatted = now.format("DD-MM-YYYY - HH:mm:ss");
  document.getElementById("current-time").textContent = `Current Time: ${formatted}`;
}

updateCurrentTime();
setInterval(updateCurrentTime, 1000);
loadLogs();
setInterval(loadLogs, 5000);

export {
  loadLogs,
}
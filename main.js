import { deleteSingleLog, deleteLogs } from './helpers/action.js';

function createElement(tag, options = {}, styles = {}, children = []) {
  const el = document.createElement(tag);
  Object.assign(el, options);
  Object.assign(el.style, styles);
  children.forEach(child => el.appendChild(child));
  return el;
}

function formatLocalTime(timestamp) {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(new Date(timestamp));
}

function copyButton(textToCopy) {
  const button = createElement("button", {
    textContent: "📋 Copy"
  }, {
    margin: "10px 0",
    cursor: "pointer",
    backgroundColor: "#444",
    color: "#fff",
    border: "none",
    padding: "5px 10px",
    borderRadius: "4px",
    fontSize: "12px"
  });

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

let loadingLogs = false;

function loadLogs() {
  if (loadingLogs) return;
  loadingLogs = true;

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
      container.querySelectorAll("details[open] > summary[data-key]").forEach(summary => {
        const key = summary.getAttribute("data-key");
        if (key) openMap[key] = true;
      });

      const fragment = document.createDocumentFragment();

      [...data].reverse().forEach((log, i) => {
        if (!log.method || log.method === "UNKNOWN") return;

        const details = document.createElement("details");
        const summary = createElement("summary");

        const localTime = formatLocalTime(log.timestamp);
        const summaryText = `${log.method} - ${localTime} - ${log.ip}`;
        const uniqueKey = `${log.timestamp}_${log.ip}_${log.method}`;

        summary.textContent = summaryText;
        summary.setAttribute("data-key", uniqueKey);

        const deleteBtn = createElement("button", {
          textContent: "🗑️",
          onclick: (e) => {
            e.stopPropagation();
            deleteSingleLog(data.length - 1 - i);
          }
        }, {
          marginLeft: "10px",
          cursor: "pointer",
          background: "none",
          border: "none",
          color: "#f44336",
          fontSize: "14px",
          float: "right"
        });

        summary.appendChild(deleteBtn);
        details.appendChild(summary);

        const containerFlex = createElement("div", {}, {
          display: "flex",
          gap: "20px",
          justifyContent: "space-between",
          alignItems: "flex-start"
        });

        const headersBox = createElement("div", {}, {
          flex: "1",
          background: "#eee",
          padding: "8px",
          borderRadius: "4px",
          overflowX: "auto"
        }, [
          createElement("h4", { textContent: "Headers:" }),
          createElement("pre", { textContent: JSON.stringify(log.headers ?? {}, null, 2) })
        ]);

        const jsonText = JSON.stringify(log.body ?? {}, null, 2);
        const linkedText = jsonText.replace(
          /(https?:\/\/[^\s"]+)/g,
          '<a href="$1" target="_blank" style="color:#4FC3F7;">$1</a>'
        );

        const bodyBox = createElement("div", {}, {
          flex: "1",
          background: "#f9f9f9",
          padding: "8px",
          borderRadius: "4px",
          overflowX: "auto"
        });

        const bodyHeader = createElement("div", {}, {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "8px"
        }, [
          createElement("h4", { textContent: "Body:" }, { margin: "0" }),
          copyButton(jsonText)
        ]);

        bodyBox.appendChild(bodyHeader);
        const bodyPre = createElement("pre");
        bodyPre.innerHTML = linkedText;
        bodyBox.appendChild(bodyPre);

        containerFlex.appendChild(headersBox);
        containerFlex.appendChild(bodyBox);
        details.appendChild(containerFlex);

        if (openMap[uniqueKey]) details.open = true;

        fragment.appendChild(details);
      });

      container.innerHTML = "";
      container.appendChild(fragment);
    })
    .catch(err => {
      document.getElementById("log-container").innerText = "Error loading logs.";
      console.error(err);
    })
    .finally(() => {
      loadingLogs = false;
    });
}

function updateCurrentTime() {
  const now = new Date();
  const formatted = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(now);

  document.getElementById("current-time").textContent = `Current Time: ${formatted}`;
}

document.getElementById("delete-all").addEventListener("click", deleteLogs);

updateCurrentTime();
setInterval(updateCurrentTime, 1000);

loadLogs();
setInterval(loadLogs, 5000);

export {
  loadLogs,
};

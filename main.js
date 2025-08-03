import { deleteSingleLog, deleteLogs } from './helpers/action.js';
const baseURL = "https://webhook.prastowoardi616.workers.dev";
const pageSize = 50;
let fullLogData = [];

const savedPage = parseInt(localStorage.getItem("currentPage"));
let currentPage = !isNaN(savedPage) ? savedPage : 1;

function loadLogs() {
  fetch(`${baseURL}/logs`)
    .then(res => res.json())
    .then(data => {
      fullLogData = data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      const savedPage = parseInt(localStorage.getItem("currentPage"));
      const totalPages = Math.ceil(fullLogData.length / pageSize) || 1;
      if (!isNaN(savedPage) && savedPage >= 1 && savedPage <= totalPages) {
        currentPage = savedPage;
      } else {
        currentPage = 1;
        localStorage.setItem("currentPage", currentPage);
      }

      renderPage(currentPage);
    })
    .catch(err => {
      document.getElementById("log-container").innerText = "Error loading logs.";
      console.error(err);
    });
}

function copyButton(textToCopy) {
  const clipboardIcon = `
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
  </svg>`;

  const button = document.createElement("button");
  button.innerHTML = `${clipboardIcon}`;
  button.style.margin = "10px 0";
  button.style.cursor = "pointer";
  button.style.backgroundColor = "#444";
  button.style.color = "#fff";
  button.style.border = "none";
  button.style.padding = "5px 10px";
  button.style.borderRadius = "4px";
  button.style.fontSize = "12px";
  button.style.display = "flex";
  button.style.alignItems = "center";
  button.style.gap = "5px";

  button.addEventListener("click", () => {
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        button.textContent = "Copied!";
        setTimeout(() => {
          button.innerHTML = `${clipboardIcon}`;
        }, 1500);
      })
      .catch(() => {
        button.textContent = "Failed";
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

function renderWebhookUrl() {
  const WEBHOOK_URL = `${baseURL}/webhook`;

  const webhookContainer = document.getElementById("webhook-url");
  webhookContainer.innerHTML = "";

  const flexContainer = document.createElement("div");
  flexContainer.style.display = "flex";
  flexContainer.style.alignItems = "center";
  flexContainer.style.gap = "10px";

  const code = document.createElement("code");
  code.textContent = WEBHOOK_URL;
  code.style.fontFamily = "monospace";
  code.style.backgroundColor = "#eee";
  code.style.padding = "4px 8px";
  code.style.borderRadius = "4px";
  code.style.userSelect = "all";

  const button = copyButton(WEBHOOK_URL);

  flexContainer.appendChild(code);
  flexContainer.appendChild(button);

  webhookContainer.appendChild(flexContainer);
}

function renderPage(page) {
  const container = document.getElementById("log-container");
  const countDisplay = document.getElementById("log-count");
  const pageInfo = document.getElementById("page-info");

  if (!fullLogData || fullLogData.length === 0) {
    countDisplay.textContent = "Total Logs: 0";
    container.innerHTML = "<p style='text-align:center; color:#888;'>No log data!</p>";
    pageInfo.textContent = "";
    return;
  }

  const totalPages = Math.ceil(fullLogData.length / pageSize);

  if (page < 1) page = 1;
  if (page > totalPages) page = totalPages;

  currentPage = page;

  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  const logs = fullLogData.slice(start, end);

  container.innerHTML = "";
  countDisplay.innerHTML = `Total Logs: <strong>${fullLogData.length}</strong>`;
  pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;

  logs.forEach((log, i) => {
    if (!log.method || log.method === "UNKNOWN") return;

    const details = document.createElement("details");
    const summary = document.createElement("summary");

    const localTime = moment(log.timestamp).utcOffset(7).format("DD-MM-YYYY - HH:mm:ss");
    const summaryText = `${log.method} - ${localTime} - ${log.ip}`;
    const uniqueKey = `${log.timestamp}_${log.ip}_${log.method}`;

    summary.textContent = summaryText;
    summary.setAttribute("data-key", uniqueKey);

    if (localStorage.getItem(`log-open-${uniqueKey}`) === "true") {
      details.open = true;
    }

    details.addEventListener("toggle", () => {
      localStorage.setItem(`log-open-${uniqueKey}`, details.open ? "true" : "false");
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "🗑️";
    deleteBtn.style.marginLeft = "10px";
    deleteBtn.style.cursor = "pointer";
    deleteBtn.style.background = "none";
    deleteBtn.style.border = "none";
    deleteBtn.style.color = "#f44336";
    deleteBtn.style.fontSize = "14px";
    deleteBtn.style.float = "right";

    const globalIndex = start + i;
    deleteBtn.onclick = (event) => {
      event.stopPropagation();
      deleteSingleLog(globalIndex, uniqueKey);
    };
    summary.appendChild(deleteBtn);

    details.appendChild(summary);

    const containerFlex = document.createElement("div");
    containerFlex.style.display = "flex";
    containerFlex.style.gap = "20px";
    containerFlex.style.justifyContent = "space-between";
    containerFlex.style.alignItems = "flex-start";

    const headersBox = document.createElement("div");
    headersBox.style.flex = "1";
    headersBox.style.background = "#eee";
    headersBox.style.padding = "8px";
    headersBox.style.borderRadius = "4px";
    headersBox.style.overflowX = "auto";

    const headersTitle = document.createElement("h4");
    headersTitle.textContent = "Headers:";
    headersBox.appendChild(headersTitle);

    const headersPre = document.createElement("pre");
    headersPre.textContent = JSON.stringify(log.headers, null, 2);
    headersBox.appendChild(headersPre);

    const bodyBox = document.createElement("div");
    bodyBox.style.flex = "1";
    bodyBox.style.background = "#f9f9f9";
    bodyBox.style.padding = "8px";
    bodyBox.style.borderRadius = "4px";
    bodyBox.style.overflowX = "auto";

    const bodyHeader = document.createElement("div");
    bodyHeader.style.display = "flex";
    bodyHeader.style.justifyContent = "space-between";
    bodyHeader.style.alignItems = "center";
    bodyHeader.style.marginBottom = "8px";

    const bodyTitle = document.createElement("h4");
    bodyTitle.textContent = "Body:";
    bodyTitle.style.margin = "0";

    const jsonText = JSON.stringify(log.body, null, 2);
    const copyBtn = copyButton(jsonText);

    bodyHeader.appendChild(bodyTitle);
    bodyHeader.appendChild(copyBtn);
    bodyBox.appendChild(bodyHeader);

    const linkedText = jsonText.replace(
      /(https?:\/\/[^\s"]+)/g,
      '<a href="$1" target="_blank" style="color:#4FC3F7;">$1</a>'
    );

    const bodyPre = document.createElement("pre");
    bodyPre.innerHTML = linkedText;
    bodyBox.appendChild(bodyPre);

    containerFlex.appendChild(headersBox);
    containerFlex.appendChild(bodyBox);
    details.appendChild(containerFlex);
    container.appendChild(details);
  });

  document.getElementById("prev-page").disabled = currentPage === 1;
  document.getElementById("next-page").disabled = currentPage === totalPages;

  localStorage.setItem("currentPage", currentPage);
}

renderWebhookUrl();
updateCurrentTime();
setInterval(updateCurrentTime, 1000);
loadLogs();
setInterval(loadLogs, 5000);

document.getElementById("prev-page").addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    localStorage.setItem("currentPage", currentPage);
    renderPage(currentPage);
  }
});

document.getElementById("next-page").addEventListener("click", () => {
  const totalPages = Math.ceil(fullLogData.length / pageSize);
  if (currentPage < totalPages) {
    currentPage++;
    localStorage.setItem("currentPage", currentPage);
    renderPage(currentPage);
  }
});

export {
  loadLogs,
}

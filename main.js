function loadLogs() {
  fetch("https://webhook.prastowoardi616.workers.dev/logs")
    .then(res => res.json())
    .then(data => {
      const container = document.getElementById("log-container");

      const openMap = {};
      Array.from(container.children).forEach(child => {
        const summary = child.querySelector("summary");
        if (child.tagName === "DETAILS" && child.open && summary) {
          const key = summary.textContent;
          openMap[key] = true;
        }
      });

      container.innerHTML = "";

      [...data].reverse().forEach((log, i) => {
        const details = document.createElement("details");
        const summary = document.createElement("summary");

        const logNumber = data.length - i;
        const summaryText = `${i + 1}. ${log.timestamp} - ${log.ip}`;
        
        summary.textContent = `${logNumber}. ${log.timestamp} - ${log.ip}`;
        details.appendChild(summary);

        const pre = document.createElement("pre");
        pre.textContent = JSON.stringify(log.body, null, 2);
        details.appendChild(pre);

        if (openMap[summaryText]) {
          details.open = true;
        }

        container.appendChild(details);
      });
    })
    .catch(err => {
      document.getElementById("log-container").innerText = "Error loading logs.";
      console.error(err);
    });
}

loadLogs();
setInterval(loadLogs, 5000);

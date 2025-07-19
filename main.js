function loadLogs() {
  fetch("https://webhook.prastowoardi616.workers.dev/logs")
    .then(res => res.json())
    .then(data => {
      const container = document.getElementById("log-container");
      container.innerHTML = "";

      data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      data.forEach((log, i) => {
        const details = document.createElement("details");
        const summary = document.createElement("summary");
        summary.textContent = `${i + 1}. ${log.timestamp} | IP: ${log.ip}`;
        details.appendChild(summary);

        const pre = document.createElement("pre");
        pre.textContent = JSON.stringify(log.body, null, 2);
        details.appendChild(pre);

        container.appendChild(details);
      });
    })
    .catch(err => {
      document.getElementById("log-container").innerText = "Error loading logs.";
      console.error(err);
    });
}

loadLogs();

setInterval(loadLogs, 2000);

fetch("https://webhook.prastowoardi616.workers.dev/logs")
  .then(res => res.json())
  .then(data => {
    const container = document.getElementById("log-container");
    container.innerHTML = "";

    if (!data.length) {
      container.innerHTML = "<p>No logs yet.</p>";
      return;
    }

    data.reverse().forEach((log, i) => {
      const details = document.createElement("details");
      const summary = document.createElement("summary");
      summary.textContent = `${i + 1}. ${log.timestamp} — ${log.ip}`;
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

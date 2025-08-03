import { loadLogs } from '../main.js'

const confirmModal = document.getElementById("confirm-modal");
const confirmMessage = document.getElementById("confirm-message");
const confirmYesBtn = document.getElementById("confirm-yes");
const confirmNoBtn = document.getElementById("confirm-no");

const notifyModal = document.getElementById("notify-modal");
const notifyMessage = document.getElementById("notify-message");
const notifyOkBtn = document.getElementById("notify-ok");

function showConfirm(message) {
  confirmMessage.textContent = message;
  confirmModal.style.display = "flex";

  return new Promise((resolve) => {
    confirmYesBtn.onclick = () => {
      confirmModal.style.display = "none";
      resolve(true);
    };
    confirmNoBtn.onclick = () => {
      confirmModal.style.display = "none";
      resolve(false);
    };
  });
}

function showNotify(message) {
  notifyMessage.textContent = message;
  notifyModal.style.display = "flex";
  notifyOkBtn.onclick = () => {
    notifyModal.style.display = "none";
  };
}

async function deleteSingleLog(index) {
  const confirmed = await showConfirm("Are you sure want to delete log?");
  if (!confirmed) return;

  fetch(`https://webhook.prastowoardi616.workers.dev/logs/${index}`, {
    method: "DELETE",
  })
  .then(res => {
    if (res.ok) {
      if (uniqueKey) {
        localStorage.removeItem(`log-open-${uniqueKey}`);
      }
      showNotify("Success delete log.");
      loadLogs();
    } else {
      res.text().then(text => showNotify(`Failed to delete log: ${text}`));
    }
  })
  .catch(err => {
    showNotify("An error occurred while deleting.");
    console.error(err);
  });
}

async function deleteLogs() {
  const confirmed = await showConfirm("Are you sure you want to delete all logs?");
  if (!confirmed) return;

  fetch("https://webhook.prastowoardi616.workers.dev/logs", {
    method: "DELETE"
  })
  .then(res => {
    if (res.ok) {
      showNotify("All logs deleted successfully");
      loadLogs();
    } else {
      showNotify("Failed to delete log.");
    }
  })
  .catch(err => {
    showNotify("An error occurred while deleting.");
    console.error(err);
  });
}

export {
  showConfirm,
  showNotify,
  deleteSingleLog,
  deleteLogs
};
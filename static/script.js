let ipChart;

function setText(id, value) {
  const node = document.getElementById(id);
  if (node) {
    node.textContent = value;
  }
}

function setStatus(message, isError = false) {
  const status = document.getElementById("statusMessage");
  if (!status) {
    return;
  }
  status.textContent = message;
  status.className = isError ? "status-error" : "status-ok";
}

function renderAlertsTable(alerts) {
  const body = document.getElementById("alertsTableBody");
  if (!body) {
    return;
  }
  body.innerHTML = alerts.length
    ? alerts
        .map(
          (alert) => `
      <tr>
        <td>${alert.time}</td>
        <td>${alert.ip}</td>
        <td>${alert.type}</td>
        <td>${alert.reason}</td>
        <td class="severity-${alert.severity.toLowerCase()}">${alert.severity.toUpperCase()}</td>
      </tr>
    `
        )
        .join("")
    : '<tr><td colspan="5">No alerts found</td></tr>';
}

function renderFullAlertsTable(alerts) {
  const body = document.getElementById("fullAlertsTableBody");
  if (!body) {
    return;
  }
  body.innerHTML = alerts.length
    ? alerts
        .map(
          (alert) => `
      <tr>
        <td>${alert.time}</td>
        <td>${alert.ip}</td>
        <td>${alert.type}</td>
        <td>${alert.reason}</td>
        <td class="severity-${alert.severity.toLowerCase()}">${alert.severity.toUpperCase()}</td>
      </tr>
    `
        )
        .join("")
    : '<tr><td colspan="5">No alerts found</td></tr>';
}

function renderLogsTable(logs) {
  const body = document.getElementById("logsTableBody");
  if (!body) {
    return;
  }
  const recentLogs = logs.slice(-10).reverse();
  body.innerHTML = recentLogs.length
    ? recentLogs
        .map(
          (log) => `
      <tr>
        <td>${log.timestamp}</td>
        <td>${log.event}</td>
        <td>${log.ip}</td>
      </tr>
    `
        )
        .join("")
    : '<tr><td colspan="3">No log events available</td></tr>';
}

function renderFullLogsTable(logs) {
  const body = document.getElementById("fullLogsTableBody");
  if (!body) {
    return;
  }
  body.innerHTML = logs.length
    ? logs
        .slice()
        .reverse()
        .map(
          (log) => `
      <tr>
        <td>${log.timestamp}</td>
        <td>${log.event}</td>
        <td>${log.ip}</td>
        <td class="severity-${(log.severity || "LOW").toLowerCase()}">${(log.severity || "LOW").toUpperCase()}</td>
      </tr>
    `
        )
        .join("")
    : '<tr><td colspan="4">No log events available</td></tr>';
}

function renderIpChart(topAttackers) {
  const ctx = document.getElementById("ipChart");
  if (!ctx) {
    return;
  }

  const labels = topAttackers.map((item) => item.ip);
  const data = topAttackers.map((item) => item.failed_logins);

  if (typeof Chart === "undefined") {
    setStatus("Chart library unavailable. Data tables are still live.", true);
    return;
  }

  if (ipChart) {
    ipChart.destroy();
  }

  const isLight = document.body.classList.contains("light-theme");

  ipChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Failed logins",
          data,
          backgroundColor: isLight ? "#2563eb" : "#3b82f6",
          borderColor: "#1d4ed8",
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: isLight ? "#0f172a" : "#e2e8f0" } },
      },
      scales: {
        x: { ticks: { color: isLight ? "#334155" : "#cbd5e1" } },
        y: { ticks: { color: isLight ? "#334155" : "#cbd5e1" }, beginAtZero: true, precision: 0 },
      },
    },
  });
}

function renderTopAttackers(topAttackers) {
  const body = document.getElementById("topAttackersBody");
  if (!body) {
    return;
  }
  body.innerHTML = topAttackers.length
    ? topAttackers
        .map(
          (item) => `
      <tr>
        <td>${item.ip}</td>
        <td>${item.failed_logins}</td>
      </tr>
    `
        )
        .join("")
    : '<tr><td colspan="2">No attacking IPs detected</td></tr>';
}

async function refreshDashboard() {
  try {
    const [logsResp, alertsResp, summaryResp] = await Promise.all([
      fetch("/api/logs"),
      fetch("/api/alerts"),
      fetch("/api/summary"),
    ]);

    if (!logsResp.ok || !alertsResp.ok || !summaryResp.ok) {
      throw new Error("Dashboard API returned an error status.");
    }

    const logsData = await logsResp.json();
    const alertsData = await alertsResp.json();
    const summaryData = await summaryResp.json();

    setText("totalLogs", summaryData.total_logs ?? logsData.count);
    setText("totalAlerts", summaryData.total_alerts ?? alertsData.count);
    setText("severityHigh", summaryData.severity_counts?.HIGH ?? 0);
    setText("topIp", summaryData.top_attackers?.[0]?.ip ?? "N/A");
    renderAlertsTable(alertsData.alerts);
    renderLogsTable(logsData.logs);
    renderTopAttackers(summaryData.top_attackers ?? []);
    renderIpChart(summaryData.top_attackers ?? []);
    setStatus("Auto-refresh active (5s).");
  } catch (error) {
    setStatus(`Dashboard update failed: ${error.message}`, true);
  }
}

async function refreshLogsPage() {
  try {
    const logsResp = await fetch("/api/logs");
    if (!logsResp.ok) {
      throw new Error("Failed to load logs.");
    }
    const logsData = await logsResp.json();
    renderFullLogsTable(logsData.logs ?? []);
    setStatus("Auto-refresh active (5s).");
  } catch (error) {
    setStatus(`Logs update failed: ${error.message}`, true);
  }
}

async function refreshAlertsPage() {
  try {
    const alertsResp = await fetch("/api/alerts");
    if (!alertsResp.ok) {
      throw new Error("Failed to load alerts.");
    }
    const alertsData = await alertsResp.json();
    renderFullAlertsTable(alertsData.alerts ?? []);
    setStatus("Auto-refresh active (5s).");
  } catch (error) {
    setStatus(`Alerts update failed: ${error.message}`, true);
  }
}

// Only start polling when dashboard widgets are present.
if (document.getElementById("totalLogs")) {
  refreshDashboard();
  setInterval(refreshDashboard, 5000);
}

if (document.getElementById("fullLogsTableBody")) {
  refreshLogsPage();
  setInterval(refreshLogsPage, 5000);
}

if (document.getElementById("fullAlertsTableBody")) {
  refreshAlertsPage();
  setInterval(refreshAlertsPage, 5000);
}

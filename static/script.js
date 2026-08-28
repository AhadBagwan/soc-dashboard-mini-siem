let ipChart;
let severityChart;
let globalLogs = [];
let globalAlerts = [];
let activeSeverityFilter = "ALL";

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
  const recentAlerts = alerts.slice(0, 5);
  body.innerHTML = recentAlerts.length
    ? recentAlerts
        .map(
          (alert) => `
      <tr>
        <td>${alert.time}</td>
        <td><code class="code-text">${alert.ip}</code></td>
        <td><strong>${alert.type}</strong></td>
        <td>${alert.reason}</td>
        <td><span class="severity-${alert.severity.toLowerCase()}">${alert.severity.toUpperCase()}</span></td>
      </tr>
    `
        )
        .join("")
    : '<tr><td colspan="5">No threat alerts recorded</td></tr>';
}

function renderFullAlertsTable(alerts) {
  const body = document.getElementById("fullAlertsTableBody");
  if (!body) {
    return;
  }

  const query = document.getElementById("alertSearchInput")?.value.toLowerCase().trim() || "";
  let filtered = alerts;

  if (activeSeverityFilter !== "ALL") {
    filtered = filtered.filter((a) => (a.severity || "").toUpperCase() === activeSeverityFilter);
  }

  if (query) {
    filtered = filtered.filter(
      (a) =>
        (a.ip || "").toLowerCase().includes(query) ||
        (a.type || "").toLowerCase().includes(query) ||
        (a.reason || "").toLowerCase().includes(query) ||
        (a.time || "").toLowerCase().includes(query)
    );
  }

  body.innerHTML = filtered.length
    ? filtered
        .map(
          (alert) => `
      <tr>
        <td>${alert.time}</td>
        <td><code class="code-text">${alert.ip}</code></td>
        <td><strong>${alert.type}</strong></td>
        <td>${alert.reason}</td>
        <td><span class="severity-${alert.severity.toLowerCase()}">${alert.severity.toUpperCase()}</span></td>
      </tr>
    `
        )
        .join("")
    : '<tr><td colspan="5">No matching security alerts found</td></tr>';
}

function renderLogsTable(logs) {
  const body = document.getElementById("logsTableBody");
  if (!body) {
    return;
  }
  const recentLogs = logs.slice(-5).reverse();
  body.innerHTML = recentLogs.length
    ? recentLogs
        .map(
          (log) => `
      <tr>
        <td>${log.timestamp}</td>
        <td><strong>${log.event}</strong></td>
        <td><code class="code-text">${log.ip}</code></td>
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

  const query = document.getElementById("logSearchInput")?.value.toLowerCase().trim() || "";
  let filtered = logs.slice().reverse();

  if (query) {
    filtered = filtered.filter(
      (l) =>
        (l.ip || "").toLowerCase().includes(query) ||
        (l.event || "").toLowerCase().includes(query) ||
        (l.timestamp || "").toLowerCase().includes(query)
    );
  }

  setText("logCountDisplay", filtered.length);

  body.innerHTML = filtered.length
    ? filtered
        .map(
          (log) => `
      <tr>
        <td>${log.timestamp}</td>
        <td><strong>${log.event}</strong></td>
        <td><code class="code-text">${log.ip}</code></td>
        <td><span class="severity-${(log.severity || "LOW").toLowerCase()}">${(log.severity || "LOW").toUpperCase()}</span></td>
      </tr>
    `
        )
        .join("")
    : '<tr><td colspan="4">No log events match your search query</td></tr>';
}

function renderIpChart(topAttackers) {
  const ctx = document.getElementById("ipChart");
  if (!ctx) {
    return;
  }

  const labels = topAttackers.map((item) => item.ip);
  const data = topAttackers.map((item) => item.failed_logins);

  if (typeof Chart === "undefined") {
    setStatus("Chart engine unavailable. Data feeds active.", true);
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
          label: "Failed Login Attempts",
          data,
          backgroundColor: isLight ? "#2563eb" : "#3b82f6",
          borderColor: "#1d4ed8",
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: isLight ? "#0f172a" : "#e2e8f0", font: { family: "Inter" } } },
      },
      scales: {
        x: { ticks: { color: isLight ? "#334155" : "#cbd5e1" }, grid: { color: isLight ? "#e2e8f0" : "#1f293d" } },
        y: { ticks: { color: isLight ? "#334155" : "#cbd5e1" }, grid: { color: isLight ? "#e2e8f0" : "#1f293d" }, beginAtZero: true },
      },
    },
  });
}

function renderSeverityChart(severityCounts) {
  const ctx = document.getElementById("severityChart");
  if (!ctx) {
    return;
  }

  if (typeof Chart === "undefined") {
    return;
  }

  if (severityChart) {
    severityChart.destroy();
  }

  const isLight = document.body.classList.contains("light-theme");

  severityChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["High Severity", "Medium Severity", "Low Severity"],
      datasets: [
        {
          data: [
            severityCounts?.HIGH ?? 0,
            severityCounts?.MEDIUM ?? 0,
            severityCounts?.LOW ?? 0,
          ],
          backgroundColor: ["#ef4444", "#f59e0b", "#3b82f6"],
          borderColor: isLight ? "#ffffff" : "#111827",
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: isLight ? "#0f172a" : "#e2e8f0", font: { family: "Inter" } },
        },
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
        <td><code class="code-text">${item.ip}</code></td>
        <td><strong>${item.failed_logins}</strong> attempts</td>
        <td><span class="severity-high">BRUTE_FORCE</span></td>
        <td><span class="badge-role">BLOCKED</span></td>
      </tr>
    `
        )
        .join("")
    : '<tr><td colspan="4">No attacking IPs detected</td></tr>';
}

async function refreshDashboard() {
  try {
    const [logsResp, alertsResp, summaryResp] = await Promise.all([
      fetch("/api/logs"),
      fetch("/api/alerts"),
      fetch("/api/summary"),
    ]);

    if (!logsResp.ok || !alertsResp.ok || !summaryResp.ok) {
      throw new Error("Dashboard API connection error.");
    }

    const logsData = await logsResp.json();
    const alertsData = await alertsResp.json();
    const summaryData = await summaryResp.json();

    globalLogs = logsData.logs ?? [];
    globalAlerts = alertsData.alerts ?? [];

    setText("totalLogs", summaryData.total_logs ?? logsData.count);
    setText("totalAlerts", summaryData.total_alerts ?? alertsData.count);
    setText("severityHigh", summaryData.severity_counts?.HIGH ?? 0);
    setText("topIp", summaryData.top_attackers?.[0]?.ip ?? "N/A");

    renderAlertsTable(globalAlerts);
    renderLogsTable(globalLogs);
    renderTopAttackers(summaryData.top_attackers ?? []);
    renderIpChart(summaryData.top_attackers ?? []);
    renderSeverityChart(summaryData.severity_counts ?? {});

    setStatus("● Telemetry Live (5s Auto-Sync)");
  } catch (error) {
    setStatus(`SIEM Connection Failed: ${error.message}`, true);
  }
}

async function refreshLogsPage() {
  try {
    const logsResp = await fetch("/api/logs");
    if (!logsResp.ok) {
      throw new Error("Failed to load log feed.");
    }
    const logsData = await logsResp.json();
    globalLogs = logsData.logs ?? [];
    renderFullLogsTable(globalLogs);
    setStatus("● Log Telemetry Live (5s Auto-Sync)");
  } catch (error) {
    setStatus(`Log Ingestion Error: ${error.message}`, true);
  }
}

async function refreshAlertsPage() {
  try {
    const alertsResp = await fetch("/api/alerts");
    if (!alertsResp.ok) {
      throw new Error("Failed to load alert feed.");
    }
    const alertsData = await alertsResp.json();
    globalAlerts = alertsData.alerts ?? [];
    renderFullAlertsTable(globalAlerts);
    setStatus("● Alert Engine Live (5s Auto-Sync)");
  } catch (error) {
    setStatus(`Alert Feed Error: ${error.message}`, true);
  }
}

function bindFilterEvents() {
  const logSearch = document.getElementById("logSearchInput");
  if (logSearch) {
    logSearch.addEventListener("input", () => renderFullLogsTable(globalLogs));
  }

  const alertSearch = document.getElementById("alertSearchInput");
  if (alertSearch) {
    alertSearch.addEventListener("input", () => renderFullAlertsTable(globalAlerts));
  }

  const filterBtns = document.querySelectorAll(".filter-btn");
  filterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      filterBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      activeSeverityFilter = btn.dataset.severity;
      renderFullAlertsTable(globalAlerts);
    });
  });
}

// Page Initialization
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

bindFilterEvents();

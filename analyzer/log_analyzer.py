import json
import re
from collections import Counter, deque
from datetime import datetime
from pathlib import Path

from analyzer.alert_store import save_alerts_to_db


LOG_PATTERN = re.compile(
    r"^(?P<date>\d{4}-\d{2}-\d{2})\s+"
    r"(?P<time>\d{2}:\d{2}:\d{2})\s+"
    r"(?P<event>[A-Z_]+)\s+"
    r"(?P<ip>(?:\d{1,3}\.){3}\d{1,3})$"
)

# Optional static blacklist to flag known suspicious IPs.
SUSPICIOUS_IP_BLACKLIST = {"123.45.67.89", "203.0.113.50", "45.33.32.156"}
WINDOW_MINUTES = 2
FAILED_LOGIN_THRESHOLD = 5


def is_whitelisted_ip(ip: str) -> bool:
    """Ignore local/internal ranges that should not produce alerts."""
    return ip == "127.0.0.1" or ip.startswith("192.168.")


def parse_logs(log_file: Path):
    """Parse supported log lines into normalized dictionaries."""
    parsed = []
    if not log_file.exists():
        return parsed

    for line in log_file.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue

        match = LOG_PATTERN.match(line)
        if not match:
            continue

        item = match.groupdict()
        item["timestamp"] = f"{item['date']} {item['time']}"
        event = item["event"]
        event_severity = "LOW"
        if event == "FAILED_LOGIN":
            event_severity = "MEDIUM"

        parsed.append(
            {
                "timestamp": item["timestamp"],
                "event": event,
                "ip": item["ip"],
                "severity": event_severity,
            }
        )
    return parsed


def detect_alerts(parsed_logs):
    """Detect brute-force attacks and suspicious IPs with severity labels."""
    alerts = []
    parsed_with_dt = []
    for entry in parsed_logs:
        parsed_with_dt.append(
            {**entry, "dt": datetime.strptime(entry["timestamp"], "%Y-%m-%d %H:%M:%S")}
        )

    # Sliding-window brute-force detection: 5 failed logins within 2 minutes.
    failed_windows = {}
    brute_force_alerted_ips = set()
    for entry in sorted(parsed_with_dt, key=lambda item: item["dt"]):
        ip = entry["ip"]
        if is_whitelisted_ip(ip):
            continue

        if entry["event"] != "FAILED_LOGIN":
            continue

        if ip not in failed_windows:
            failed_windows[ip] = deque()

        queue = failed_windows[ip]
        queue.append(entry["dt"])

        while queue and (entry["dt"] - queue[0]).total_seconds() > WINDOW_MINUTES * 60:
            queue.popleft()

        if len(queue) >= FAILED_LOGIN_THRESHOLD and ip not in brute_force_alerted_ips:
            brute_force_alerted_ips.add(ip)
            alerts.append(
                {
                    "ip": ip,
                    "time": entry["timestamp"],
                    "type": "BRUTE_FORCE",
                    "reason": f"Brute-force pattern: {len(queue)} failed logins within {WINDOW_MINUTES} minutes",
                    "severity": "HIGH",
                }
            )

    seen_blacklisted = {}
    for entry in parsed_with_dt:
        if is_whitelisted_ip(entry["ip"]):
            continue

        if entry["ip"] in SUSPICIOUS_IP_BLACKLIST:
            seen_blacklisted[entry["ip"]] = entry["timestamp"]

    for ip, ts in seen_blacklisted.items():
        alerts.append(
            {
                "ip": ip,
                "time": ts,
                "type": "SUSPICIOUS_IP",
                "reason": "Suspicious IP address detected",
                "severity": "MEDIUM",
            }
        )

    # Informational low-severity signal for normal successful logins.
    normal_latest = {}
    for entry in parsed_with_dt:
        if is_whitelisted_ip(entry["ip"]):
            continue

        if entry["event"] == "SUCCESS_LOGIN":
            normal_latest[entry["ip"]] = entry["timestamp"]

    for ip, ts in normal_latest.items():
        alerts.append(
            {
                "ip": ip,
                "time": ts,
                "type": "NORMAL_ACTIVITY",
                "reason": "Normal login behavior observed",
                "severity": "LOW",
            }
        )

    alerts.sort(
        key=lambda a: datetime.strptime(a["time"], "%Y-%m-%d %H:%M:%S")
        if a.get("time")
        else datetime.min,
        reverse=True,
    )
    return alerts


def write_alerts(alerts, alerts_file: Path):
    """Persist alerts to JSON so the dashboard can consume stable output."""
    alerts_file.parent.mkdir(parents=True, exist_ok=True)
    alerts_file.write_text(json.dumps(alerts, indent=2), encoding="utf-8")


def analyze_logs(log_file: Path, alerts_file: Path, db_file: Path):
    """Main SIEM mini-pipeline: parse -> detect -> persist JSON + SQLite."""
    parsed_logs = parse_logs(log_file)
    alerts = detect_alerts(parsed_logs)
    write_alerts(alerts, alerts_file)
    save_alerts_to_db(alerts, db_file)
    return parsed_logs, alerts

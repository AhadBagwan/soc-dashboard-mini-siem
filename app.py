import os
import tempfile
from pathlib import Path

from flask import Flask, jsonify, render_template

from analyzer.alert_store import read_alerts_from_db
from analyzer.log_analyzer import analyze_logs, is_whitelisted_ip


BASE_DIR = Path(__file__).resolve().parent
LOG_FILE = BASE_DIR / "logs" / "sample.log"


def get_storage_paths():
    """Return storage paths, falling back to OS temp dir for read-only environments (e.g. Vercel)."""
    default_dir = BASE_DIR / "data"
    try:
        default_dir.mkdir(parents=True, exist_ok=True)
        test_file = default_dir / ".write_test"
        test_file.touch()
        test_file.unlink()
        return default_dir / "alerts.json", default_dir / "alerts.db"
    except Exception:
        tmp_dir = Path(tempfile.gettempdir()) / "soc_dashboard_data"
        tmp_dir.mkdir(parents=True, exist_ok=True)
        return tmp_dir / "alerts.json", tmp_dir / "alerts.db"


ALERTS_FILE, ALERTS_DB_FILE = get_storage_paths()

app = Flask(__name__)



def refresh_analysis():
    """Parse logs and refresh alerts storage on every data request."""
    return analyze_logs(LOG_FILE, ALERTS_FILE, ALERTS_DB_FILE)


def build_summary(parsed_logs, detected_alerts):
    severity_counts = {"LOW": 0, "MEDIUM": 0, "HIGH": 0}
    for alert in detected_alerts:
        sev = alert.get("severity", "").upper()
        if sev in severity_counts:
            severity_counts[sev] += 1

    failed_by_ip = {}
    for entry in parsed_logs:
        if entry["event"] != "FAILED_LOGIN":
            continue
        if is_whitelisted_ip(entry["ip"]):
            continue
        failed_by_ip[entry["ip"]] = failed_by_ip.get(entry["ip"], 0) + 1

    top_attackers = sorted(
        [{"ip": ip, "failed_logins": count} for ip, count in failed_by_ip.items()],
        key=lambda item: item["failed_logins"],
        reverse=True,
    )[:5]

    return {
        "total_logs": len(parsed_logs),
        "total_alerts": len(detected_alerts),
        "severity_counts": severity_counts,
        "top_attackers": top_attackers,
    }


@app.route("/")
@app.route("/landing")
def landing():
    return render_template("landing.html", active_page="landing")


@app.route("/dashboard")
@app.route("/index")
def index():
    return render_template("index.html", active_page="dashboard")


@app.route("/login")
def login():
    return render_template("login.html")


@app.route("/settings")
def settings():
    return render_template("settings.html", active_page="settings")


@app.route("/logs")
def logs():
    return render_template("logs.html", active_page="logs")


@app.route("/alerts")
def alerts():
    return render_template("alerts.html", active_page="alerts")



@app.route("/api/logs")
def api_logs():
    parsed_logs, detected_alerts = refresh_analysis()
    return jsonify(
        {
            "count": len(parsed_logs),
            "logs": parsed_logs,
            "alert_count": len(detected_alerts),
        }
    )


@app.route("/api/alerts")
def api_alerts():
    refresh_analysis()
    detected_alerts = read_alerts_from_db(ALERTS_DB_FILE)
    return jsonify({"count": len(detected_alerts), "alerts": detected_alerts})


@app.route("/api/summary")
@app.route("/summary")
def summary():
    parsed_logs, detected_alerts = refresh_analysis()
    return jsonify(build_summary(parsed_logs, detected_alerts))


if __name__ == "__main__":
    # Keep startup predictable for local use; no auto-reloader child process.
    app.run(debug=False, host="127.0.0.1", port=5000)

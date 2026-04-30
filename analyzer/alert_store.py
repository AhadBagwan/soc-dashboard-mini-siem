import sqlite3
from pathlib import Path


def _reason_from_type(alert_type: str) -> str:
    mapping = {
        "BRUTE_FORCE": "Brute-force attack detected in sliding window",
        "SUSPICIOUS_IP": "Suspicious IP address detected",
        "NORMAL_ACTIVITY": "Normal login behavior observed",
    }
    return mapping.get(alert_type, alert_type)


def _connect(db_file: Path):
    db_file.parent.mkdir(parents=True, exist_ok=True)
    return sqlite3.connect(db_file)


def init_db(db_file: Path):
    """Create alerts table if it does not exist."""
    with _connect(db_file) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ip TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                type TEXT NOT NULL,
                severity TEXT NOT NULL
            )
            """
        )
        conn.commit()


def save_alerts_to_db(alerts, db_file: Path):
    """Replace alert rows with the latest analysis output."""
    init_db(db_file)
    with _connect(db_file) as conn:
        conn.execute("DELETE FROM alerts")
        conn.executemany(
            "INSERT INTO alerts (ip, timestamp, type, severity) VALUES (?, ?, ?, ?)",
            [
                (alert["ip"], alert["time"], alert["type"], alert["severity"])
                for alert in alerts
            ],
        )
        conn.commit()


def read_alerts_from_db(db_file: Path):
    """Read current alert set ordered by latest timestamp."""
    init_db(db_file)
    with _connect(db_file) as conn:
        rows = conn.execute(
            """
            SELECT id, ip, timestamp, type, severity
            FROM alerts
            ORDER BY timestamp DESC
            """
        ).fetchall()
    return [
        {
            "id": row[0],
            "ip": row[1],
            "time": row[2],
            "type": row[3],
            "severity": row[4],
            "reason": _reason_from_type(row[3]),
        }
        for row in rows
    ]

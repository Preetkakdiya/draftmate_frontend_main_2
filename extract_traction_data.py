"""
DraftMate Traction Data Extractor
Run: python3 extract_traction_data.py
"""
import psycopg2, json, os
from dotenv import load_dotenv
load_dotenv()

DSN = os.getenv("POSTGRES_DSN") or os.getenv("DATABASE_URL")

def run():
    print("🔌 Connecting...")
    conn = psycopg2.connect(DSN)
    cur = conn.cursor()
    d = {}

    cur.execute("SELECT COUNT(*) FROM users;")
    d["total_users"] = cur.fetchone()[0]

    cur.execute("SELECT DATE(created_at), COUNT(*) FROM users WHERE created_at IS NOT NULL GROUP BY DATE(created_at) ORDER BY 1;")
    d["signups_by_day"] = [{"date": str(r[0]), "count": r[1]} for r in cur.fetchall()]

    cur.execute("SELECT TO_CHAR(created_at,'YYYY-MM'), COUNT(*) FROM users WHERE created_at IS NOT NULL GROUP BY 1 ORDER BY 1;")
    d["signups_by_month"] = [{"month": r[0], "count": r[1]} for r in cur.fetchall()]

    cur.execute("SELECT CASE WHEN google_id IS NOT NULL THEN 'Google' ELSE 'Email' END, COUNT(*) FROM users GROUP BY 1;")
    d["signup_methods"] = [{"method": r[0], "count": r[1]} for r in cur.fetchall()]

    cur.execute("SELECT COUNT(*) FROM profiles;")
    d["profiles_completed"] = cur.fetchone()[0]

    cur.execute("SELECT COUNT(p.profile_id), COUNT(*)-COUNT(p.profile_id) FROM users u LEFT JOIN profiles p ON u.id=p.user_id;")
    r = cur.fetchone()
    d["profile_completion"] = {"with_profile": r[0], "without_profile": r[1]}

    cur.execute("SELECT role, COUNT(*) FROM profiles WHERE role IS NOT NULL AND role!='' GROUP BY role ORDER BY 2 DESC;")
    d["user_roles"] = [{"role": r[0], "count": r[1]} for r in cur.fetchall()]

    cur.execute("SELECT DATE(created_at), COUNT(*) FROM sessions WHERE created_at IS NOT NULL GROUP BY 1 ORDER BY 1;")
    d["logins_by_day"] = [{"date": str(r[0]), "count": r[1]} for r in cur.fetchall()]

    cur.execute("SELECT DATE(created_at), COUNT(DISTINCT user_id) FROM sessions WHERE created_at IS NOT NULL GROUP BY 1 ORDER BY 1;")
    d["dau"] = [{"date": str(r[0]), "count": r[1]} for r in cur.fetchall()]

    cur.execute("SELECT DATE_TRUNC('week',created_at)::date, COUNT(DISTINCT user_id) FROM sessions WHERE created_at IS NOT NULL GROUP BY 1 ORDER BY 1;")
    d["wau"] = [{"date": str(r[0]), "count": r[1]} for r in cur.fetchall()]

    cur.execute("SELECT TO_CHAR(created_at,'YYYY-MM'), COUNT(DISTINCT user_id) FROM sessions WHERE created_at IS NOT NULL GROUP BY 1 ORDER BY 1;")
    d["mau"] = [{"month": r[0], "count": r[1]} for r in cur.fetchall()]

    cur.execute("SELECT status, COUNT(*) FROM user_subscriptions GROUP BY status;")
    d["subscription_status"] = [{"status": r[0], "count": r[1]} for r in cur.fetchall()]

    cur.execute("SELECT status, COUNT(*), COALESCE(SUM(amount),0) FROM payments GROUP BY status;")
    d["payment_summary"] = [{"status": r[0], "count": r[1], "total_amount": float(r[2])} for r in cur.fetchall()]

    cur.execute("SELECT DATE(COALESCE(payment_time,created_at)), COUNT(*), SUM(amount) FROM payments WHERE status='SUCCESS' GROUP BY 1 ORDER BY 1;")
    d["payments_by_day"] = [{"date": str(r[0]), "count": r[1], "total": float(r[2])} for r in cur.fetchall()]

    cur.execute("SELECT DATE(created_at), COUNT(*), SUM(COUNT(*)) OVER (ORDER BY DATE(created_at)) FROM users WHERE created_at IS NOT NULL GROUP BY 1 ORDER BY 1;")
    d["cumulative_signups"] = [{"date": str(r[0]), "daily": r[1], "cumulative": int(r[2])} for r in cur.fetchall()]

    cur.execute("SELECT DATE(COALESCE(payment_time,created_at)), SUM(amount), SUM(SUM(amount)) OVER (ORDER BY DATE(COALESCE(payment_time,created_at))) FROM payments WHERE status='SUCCESS' GROUP BY 1 ORDER BY 1;")
    d["cumulative_revenue"] = [{"date": str(r[0]), "daily": float(r[1]), "cumulative": float(r[2])} for r in cur.fetchall()]

    cur.execute("""SELECT COUNT(CASE WHEN c=1 THEN 1 END), COUNT(CASE WHEN c>1 THEN 1 END), COUNT(CASE WHEN c>=5 THEN 1 END)
        FROM (SELECT user_id, COUNT(*) c FROM sessions GROUP BY user_id) s;""")
    r = cur.fetchone()
    d["retention"] = {"single_session": r[0], "returning_users": r[1], "power_users": r[2]}

    cur.execute("SELECT email, created_at, CASE WHEN google_id IS NOT NULL THEN 'Google' ELSE 'Email' END FROM users ORDER BY created_at;")
    d["all_users"] = [{"email": r[0], "created_at": str(r[1]) if r[1] else None, "method": r[2]} for r in cur.fetchall()]

    cur.close(); conn.close()
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "traction_data.json")
    with open(out, "w") as f: json.dump(d, f, indent=2, default=str)
    print(f"✅ Exported to {out}\n  Users: {d['total_users']}, Months: {len(d['signups_by_month'])}")

if __name__ == "__main__": run()

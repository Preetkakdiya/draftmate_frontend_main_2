"""
Script to extract user traction data from DraftMate's PostgreSQL database.
Outputs JSON files for use in visualization.
"""
import psycopg2
import json
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

DSN = os.getenv("POSTGRES_DSN") or os.getenv("DATABASE_URL")

def run():
    conn = psycopg2.connect(DSN)
    cur = conn.cursor()
    data = {}

    # 1. Total users count
    cur.execute("SELECT COUNT(*) FROM users;")
    data["total_users"] = cur.fetchone()[0]

    # 2. User signups over time (by day)
    cur.execute("""
        SELECT DATE(created_at) as signup_date, COUNT(*) as count
        FROM users
        WHERE created_at IS NOT NULL
        GROUP BY DATE(created_at)
        ORDER BY signup_date;
    """)
    data["signups_by_day"] = [{"date": str(row[0]), "count": row[1]} for row in cur.fetchall()]

    # 3. User signups by week
    cur.execute("""
        SELECT DATE_TRUNC('week', created_at)::date as week_start, COUNT(*) as count
        FROM users
        WHERE created_at IS NOT NULL
        GROUP BY DATE_TRUNC('week', created_at)
        ORDER BY week_start;
    """)
    data["signups_by_week"] = [{"week": str(row[0]), "count": row[1]} for row in cur.fetchall()]

    # 4. User signups by month
    cur.execute("""
        SELECT TO_CHAR(created_at, 'YYYY-MM') as month, COUNT(*) as count
        FROM users
        WHERE created_at IS NOT NULL
        GROUP BY TO_CHAR(created_at, 'YYYY-MM')
        ORDER BY month;
    """)
    data["signups_by_month"] = [{"month": row[0], "count": row[1]} for row in cur.fetchall()]

    # 5. Google vs Email signups
    cur.execute("""
        SELECT 
            CASE WHEN google_id IS NOT NULL THEN 'Google' ELSE 'Email' END as method,
            COUNT(*) as count
        FROM users
        GROUP BY CASE WHEN google_id IS NOT NULL THEN 'Google' ELSE 'Email' END;
    """)
    data["signup_methods"] = [{"method": row[0], "count": row[1]} for row in cur.fetchall()]

    # 6. Profiles completed (users who filled out profiles)
    cur.execute("SELECT COUNT(*) FROM profiles;")
    data["profiles_completed"] = cur.fetchone()[0]

    # 7. Profile completion rate
    cur.execute("""
        SELECT 
            COUNT(p.profile_id) as with_profile,
            COUNT(*) - COUNT(p.profile_id) as without_profile
        FROM users u
        LEFT JOIN profiles p ON u.id = p.user_id;
    """)
    row = cur.fetchone()
    data["profile_completion"] = {"with_profile": row[0], "without_profile": row[1]}

    # 8. User roles distribution (from profiles)
    cur.execute("""
        SELECT role, COUNT(*) as count
        FROM profiles
        WHERE role IS NOT NULL AND role != ''
        GROUP BY role
        ORDER BY count DESC;
    """)
    data["user_roles"] = [{"role": row[0], "count": row[1]} for row in cur.fetchall()]

    # 9. Sessions data (login activity over time)
    cur.execute("""
        SELECT DATE(created_at) as login_date, COUNT(*) as count
        FROM sessions
        WHERE created_at IS NOT NULL
        GROUP BY DATE(created_at)
        ORDER BY login_date;
    """)
    data["logins_by_day"] = [{"date": str(row[0]), "count": row[1]} for row in cur.fetchall()]

    # 10. Unique active users per day (DAU)
    cur.execute("""
        SELECT DATE(created_at) as login_date, COUNT(DISTINCT user_id) as unique_users
        FROM sessions
        WHERE created_at IS NOT NULL
        GROUP BY DATE(created_at)
        ORDER BY login_date;
    """)
    data["dau"] = [{"date": str(row[0]), "count": row[1]} for row in cur.fetchall()]

    # 11. Unique active users per week (WAU)
    cur.execute("""
        SELECT DATE_TRUNC('week', created_at)::date as week_start, COUNT(DISTINCT user_id) as unique_users
        FROM sessions
        WHERE created_at IS NOT NULL
        GROUP BY DATE_TRUNC('week', created_at)
        ORDER BY week_start;
    """)
    data["wau"] = [{"date": str(row[0]), "count": row[1]} for row in cur.fetchall()]

    # 12. Subscription data
    cur.execute("""
        SELECT status, COUNT(*) as count
        FROM user_subscriptions
        GROUP BY status;
    """)
    data["subscription_status"] = [{"status": row[0], "count": row[1]} for row in cur.fetchall()]

    # 13. Payment data
    cur.execute("""
        SELECT status, COUNT(*) as count, COALESCE(SUM(amount), 0) as total_amount
        FROM payments
        GROUP BY status;
    """)
    data["payment_summary"] = [{"status": row[0], "count": row[1], "total_amount": float(row[2])} for row in cur.fetchall()]

    # 14. Payments over time
    cur.execute("""
        SELECT DATE(payment_time) as pay_date, COUNT(*) as count, SUM(amount) as total
        FROM payments
        WHERE payment_time IS NOT NULL AND status = 'SUCCESS'
        GROUP BY DATE(payment_time)
        ORDER BY pay_date;
    """)
    data["payments_by_day"] = [{"date": str(row[0]), "count": row[1], "total": float(row[2])} for row in cur.fetchall()]

    # 15. Cumulative user growth
    cur.execute("""
        SELECT DATE(created_at) as signup_date, COUNT(*) as count,
               SUM(COUNT(*)) OVER (ORDER BY DATE(created_at)) as cumulative
        FROM users
        WHERE created_at IS NOT NULL
        GROUP BY DATE(created_at)
        ORDER BY signup_date;
    """)
    data["cumulative_signups"] = [{"date": str(row[0]), "daily": row[1], "cumulative": row[2]} for row in cur.fetchall()]

    # 16. All user emails and created_at for reference
    cur.execute("""
        SELECT email, created_at, 
               CASE WHEN google_id IS NOT NULL THEN 'Google' ELSE 'Email' END as method
        FROM users
        ORDER BY created_at;
    """)
    data["all_users"] = [{"email": row[0], "created_at": str(row[1]) if row[1] else None, "method": row[2]} for row in cur.fetchall()]

    cur.close()
    conn.close()

    # Save to JSON
    output_path = os.path.join(os.path.dirname(__file__), "traction_data.json")
    with open(output_path, "w") as f:
        json.dump(data, f, indent=2, default=str)
    
    print(f"✅ Data exported to {output_path}")
    print(f"   Total users: {data['total_users']}")
    print(f"   Profiles completed: {data['profiles_completed']}")
    print(f"   Signup methods: {data['signup_methods']}")
    print(f"   Signups by month: {data['signups_by_month']}")
    print(f"   Subscription statuses: {data['subscription_status']}")
    print(f"   Payment summary: {data['payment_summary']}")

if __name__ == "__main__":
    run()

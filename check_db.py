import psycopg2
import os
import sys
import argparse

def get_connection():
    try:
        dsn = os.environ.get('POSTGRES_DSN', os.environ.get('DATABASE_URL'))
        return psycopg2.connect(dsn)
    except Exception as e:
        print(f"Connection failed: {e}")
        sys.exit(1)

def check_subs():
    print("Connecting to DB...")
    conn = get_connection()
    cur = conn.cursor()
    
    print("\n--- Last 5 Payments ---")
    try:
        cur.execute("SELECT order_id, user_id, amount, status, payment_time FROM payments ORDER BY payment_time DESC NULLS LAST LIMIT 5;")
        payments = cur.fetchall()
        if not payments:
            print("No payments found.")
        for row in payments:
            print(row)
    except Exception as e:
        print(f"Error querying payments: {e}")
        conn.rollback()
        
    print("\n--- Last 5 Subscriptions ---")
    try:
        cur.execute("SELECT user_id, plan_id, status, start_date, end_date FROM user_subscriptions ORDER BY start_date DESC LIMIT 5;")
        subs = cur.fetchall()
        if not subs:
            print("No subscriptions found.")
        for row in subs:
            print(row)
    except Exception as e:
        print(f"Error querying subscriptions: {e}")
        
    cur.close()
    conn.close()
    print("\nDone.")

def remove_subs(email=None):
    print("Connecting to DB...")
    conn = get_connection()
    cur = conn.cursor()
    
    try:
        if email:
            print(f"\nCancelling active test subscriptions for email: {email}...")
            cur.execute("""
                UPDATE user_subscriptions 
                SET status = 'expired' 
                FROM users 
                WHERE user_subscriptions.user_id = users.id 
                AND users.email = %s 
                AND user_subscriptions.status = 'active';
            """, (email,))
        else:
            print("\nCancelling all active test subscriptions...")
            cur.execute("UPDATE user_subscriptions SET status = 'expired' WHERE status = 'active';")
            
        rows_affected = cur.rowcount
        conn.commit()
        
        if rows_affected > 0:
            print(f"Success! {rows_affected} active subscription(s) cancelled.")
        else:
            print("No active subscriptions found to cancel.")
            
    except Exception as e:
        print(f"Failed to cancel subscriptions: {e}")
        conn.rollback()
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Database utility script for DraftMate.')
    subparsers = parser.add_subparsers(dest='command', help='Commands')

    # Check command
    check_parser = subparsers.add_parser('check', help='Check recent payments and subscriptions')

    # Cancel command
    cancel_parser = subparsers.add_parser('cancel', help='Cancel active test subscriptions')
    cancel_parser.add_argument('email', nargs='?', help='Optional: Specify an email to cancel only that user\'s subscriptions')

    args = parser.parse_args()

    if args.command == 'check':
        check_subs()
    elif args.command == 'cancel':
        remove_subs(args.email)
    else:
        parser.print_help()

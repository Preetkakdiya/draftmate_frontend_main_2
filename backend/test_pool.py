import psycopg2.pool
pool = psycopg2.pool.SimpleConnectionPool(1, 20, "dbname=postgres user=postgres")
conn = pool.getconn()
pool.putconn(conn)
print("pool works")

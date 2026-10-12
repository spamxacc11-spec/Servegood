#!/bin/sh
set -e

# If DB_URL is not set or points to localhost, initialize and start local PostgreSQL
if [ -z "$DB_URL" ] || echo "$DB_URL" | grep -q "localhost" || echo "$DB_URL" | grep -q "127.0.0.1"; then
    echo "=========================================================="
    echo "  Starting embedded PostgreSQL inside container..."
    echo "=========================================================="
    
    # Initialize PostgreSQL data directory if empty
    if [ ! -f /var/lib/postgresql/data/PG_VERSION ]; then
        echo "Initializing PostgreSQL database..."
        su-exec postgres initdb -D /var/lib/postgresql/data --auth-local=trust --auth-host=trust > /dev/null 2>&1
    fi
    
    # Start PostgreSQL daemon
    su-exec postgres pg_ctl -D /var/lib/postgresql/data -o "-c listen_addresses='localhost'" -w start
    
    # Create servegood role if missing
    su-exec postgres psql -U postgres -tc "SELECT 1 FROM pg_roles WHERE rolname='servegood'" | grep -q 1 || \
        su-exec postgres psql -U postgres -c "CREATE USER servegood WITH SUPERUSER PASSWORD 'servegood';"
    
    # Create servegood database if missing
    su-exec postgres psql -U postgres -tc "SELECT 1 FROM pg_database WHERE datname='servegood'" | grep -q 1 || \
        su-exec postgres psql -U postgres -c "CREATE DATABASE servegood OWNER servegood;"

    # Enable pg_trgm extension
    su-exec postgres psql -U postgres -d servegood -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;" > /dev/null 2>&1
    
    echo "Embedded PostgreSQL is running and ready."
fi

# Gracefully stop services on container termination
shutdown() {
    echo "Shutting down..."
    if [ -f /var/lib/postgresql/data/postmaster.pid ]; then
        su-exec postgres pg_ctl -D /var/lib/postgresql/data stop -m fast || true
    fi
    exit 0
}
trap shutdown SIGTERM SIGINT

# Default PORT fallback if not provided by host
export PORT="${PORT:-8081}"

echo "=========================================================="
echo "  Starting ServeGood Backend on port $PORT..."
echo "=========================================================="

# Launch Spring Boot in background and wait so traps can intercept SIGTERM
java $JAVA_OPTS -jar app.jar &
JAVA_PID=$!

wait $JAVA_PID

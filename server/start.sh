#!/bin/bash

# Start script for subscription management server
echo "🚀 Starting Subscription Management Server..."

# Check if database directory exists
if [ ! -d "/app/server/db" ]; then
    echo "📁 Creating database directory..."
    mkdir -p /app/server/db
fi

# Check if database file exists, if not, initialize it
if [ ! -f "/app/server/db/database.sqlite" ]; then
    echo "🔧 Database file not found. Initializing database..."
    node /app/server/db/init.js
    
    if [ $? -eq 0 ]; then
        echo "✅ Database initialized successfully!"
    else
        echo "❌ Database initialization failed!"
        exit 1
    fi
else
    echo "📂 Database file exists. Running migrations..."
    # Run database migrations to ensure schema is up to date
    node /app/server/db/migrate.js

    if [ $? -eq 0 ]; then
        echo "✅ Database migrations completed successfully!"
    else
        echo "❌ Database migrations failed!"
        exit 1
    fi
fi

# Check if API_KEY is set
if [ -z "$API_KEY" ]; then
    echo "⚠️  WARNING: API_KEY environment variable is not set!"
    echo "The server may not start properly without an API key."
fi

# Check if TIANAPI_KEY is set (optional but recommended)
if [ -z "$TIANAPI_KEY" ]; then
    echo "ℹ️  INFO: TIANAPI_KEY not set. Exchange rate auto-update will be disabled."
fi

# Display configuration
echo "📋 Configuration:"
echo "   PORT: ${PORT:-3001}"
echo "   NODE_ENV: ${NODE_ENV:-development}"
echo "   LOG_LEVEL: ${LOG_LEVEL:-info}"
echo "   API_KEY: ${API_KEY:+***set***}"
echo "   TIANAPI_KEY: ${TIANAPI_KEY:+***set***}"

echo "🌟 Starting the application server..."
exec node /app/server/server.js 
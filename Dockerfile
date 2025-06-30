# Build stage for frontend
FROM node:20-alpine AS frontend-builder

# Set working directory for frontend
WORKDIR /app

# Copy frontend package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY tailwind.config.js ./
COPY postcss.config.js ./
COPY components.json ./
COPY index.html ./

# Install frontend dependencies
RUN npm install

# Copy frontend source code
COPY src/ ./src/
COPY env.d.ts ./

# Build frontend
RUN npm run build

# Build stage for backend preparation
FROM node:20-alpine AS backend-builder

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

# Set working directory for backend
WORKDIR /app/server

# Copy backend package files
COPY server/package*.json ./

# Install backend dependencies
RUN npm install --only=production

# Production stage
FROM node:20-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001

# Set working directory
WORKDIR /app

# Copy backend application and dependencies
COPY --from=backend-builder --chown=nodeuser:nodejs /app/server/node_modules ./server/node_modules
COPY --chown=nodeuser:nodejs server/ ./server/

# Make start script executable (ensure it has proper permissions)
RUN chmod +x ./server/start.sh && \
    ls -la ./server/start.sh

# Database initialization will be handled by CMD at startup

# Copy frontend build output to serve as static files
COPY --from=frontend-builder --chown=nodeuser:nodejs /app/dist ./public

# Ensure database directory has correct permissions
RUN chown -R nodeuser:nodejs ./server/db && \
    chmod 755 ./server/db && \
    if [ -f ./server/db/database.sqlite ]; then \
        chmod 644 ./server/db/database.sqlite; \
    fi

# Switch to non-root user
USER nodeuser

# Expose port
EXPOSE 3001

# Set environment to production
ENV NODE_ENV=production
ENV LOG_LEVEL=warn

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "const http=require('http');const options={hostname:'localhost',port:3001,path:'/',timeout:2000};const req=http.request(options,res=>{process.exit(res.statusCode===200?0:1)});req.on('error',()=>process.exit(1));req.end();"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Use the start script which handles database initialization and migrations
CMD ["/app/server/start.sh"]
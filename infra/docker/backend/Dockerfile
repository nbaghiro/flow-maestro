# Multi-stage build for backend
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package*.json ./

# Copy workspace package files
COPY backend/package*.json ./backend/
COPY shared/package*.json ./shared/

# Install dependencies for both workspaces
RUN npm ci --workspace=backend --workspace=shared

# Copy source code
COPY shared/ ./shared/
COPY backend/ ./backend/
COPY tsconfig.base.json ./

# Build shared package first
RUN npm run build --workspace=shared

# Build backend
RUN npm run build --workspace=backend

# Production image
FROM node:20-alpine

WORKDIR /app

# Copy root package files
COPY package*.json ./

# Copy workspace package files
COPY backend/package*.json ./backend/
COPY shared/package*.json ./shared/

# Install production dependencies only
RUN npm ci --workspace=backend --workspace=shared --omit=dev

# Copy built files from builder stage
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/shared/dist ./shared/dist

# Copy migrations
COPY backend/migrations ./backend/migrations

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Default command (can be overridden for workers)
CMD ["node", "backend/dist/backend/src/index.js"]

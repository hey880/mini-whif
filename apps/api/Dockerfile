# Build stage - Only for TypeScript compilation
FROM node:20-alpine AS builder

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache openssl-dev tzdata && ln -snf /usr/share/zoneinfo/Asia/Seoul /etc/localtime
ENV TZ=Asia/Seoul

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/
COPY packages/proto/package.json packages/proto/
COPY packages/shared-types/package.json packages/shared-types/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code (only src and config files, exclude node_modules)
COPY apps/api/src ./apps/api/src
COPY apps/api/prisma ./apps/api/prisma
COPY apps/api/tsconfig.json ./apps/api/
COPY apps/api/newrelic.cjs ./apps/api/

COPY packages/proto/proto ./packages/proto/proto
COPY packages/proto/buf.gen.yaml ./packages/proto/
COPY packages/proto/buf.yaml ./packages/proto/
COPY packages/proto/tsconfig.json ./packages/proto/

COPY packages/shared-types/src ./packages/shared-types/src
COPY packages/shared-types/tsconfig.json ./packages/shared-types/

# Generate and build proto (generates .ts then compiles to .js)
RUN cd packages/proto && pnpm build

# Generate Prisma client
RUN cd apps/api && pnpm db:generate

# Build API TypeScript
RUN cd apps/api && pnpm build

# Production stage - Minimal runtime image
FROM node:20-alpine

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache openssl-dev tzdata && ln -snf /usr/share/zoneinfo/Asia/Seoul /etc/localtime
ENV TZ=Asia/Seoul

# Install pnpm
RUN npm install -g pnpm

# Copy workspace configuration
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy package.json files
COPY apps/api/package.json ./apps/api/
COPY packages/proto/package.json ./packages/proto/
COPY packages/shared-types/package.json ./packages/shared-types/

# Copy shared-types source (needed for workspace resolution)
COPY packages/shared-types/src ./packages/shared-types/src

# Install ALL dependencies (workspace links need full install)
RUN pnpm install --frozen-lockfile

# Copy pre-built proto from builder
COPY --from=builder /app/packages/proto/gen ./packages/proto/gen

# Copy Prisma files and generate client
COPY apps/api/prisma ./apps/api/prisma
RUN cd apps/api && pnpm db:generate

# Copy compiled API code from builder
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Copy New Relic config
COPY apps/api/newrelic.cjs ./apps/api/

# Copy entrypoint script
COPY apps/api/entrypoint.sh ./apps/api/
RUN chmod +x ./apps/api/entrypoint.sh

# Expose port
EXPOSE 3000

WORKDIR /app/apps/api

# Create whif user/group and set up log directory with group write permissions
RUN addgroup -g 1001 whif && \
    adduser -D -u 1001 -G whif whif && \
    mkdir -p /app/apps/api/logs && \
    chown -R whif:whif /app && \
    chmod -R 775 /app/apps/api/logs

USER whif

# Use entrypoint to ensure correct permissions on mounted volumes
ENTRYPOINT ["/app/apps/api/entrypoint.sh"]

# Start server
CMD ["node", "dist/index.js"]

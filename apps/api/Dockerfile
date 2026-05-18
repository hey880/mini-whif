FROM node:20-alpine

WORKDIR /app

# Install system dependencies including OpenSSL
RUN apk add --no-cache openssl-dev

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/
COPY packages/proto/package.json packages/proto/
COPY packages/shared-types/package.json packages/shared-types/

# Install all dependencies (needed for build and runtime)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps/api apps/api/
COPY packages/proto packages/proto/
COPY packages/shared-types packages/shared-types/
COPY turbo.json .

# Generate Prisma client and proto code
RUN cd apps/api && pnpm db:generate
RUN cd packages/proto && pnpm generate

# Build TypeScript
RUN cd apps/api && pnpm build

# Copy New Relic config
COPY apps/api/newrelic.cjs ./apps/api/

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "apps/api/dist/index.js"]

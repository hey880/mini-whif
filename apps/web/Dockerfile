# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Build arguments for Next.js public env vars
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_PORTONE_STORE_ID
ARG NEXT_PUBLIC_PORTONE_CHANNEL_KEY

# Set environment variables for build
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_PORTONE_STORE_ID=$NEXT_PUBLIC_PORTONE_STORE_ID
ENV NEXT_PUBLIC_PORTONE_CHANNEL_KEY=$NEXT_PUBLIC_PORTONE_CHANNEL_KEY

# Timezone setting
RUN apk add --no-cache tzdata && ln -snf /usr/share/zoninfo/Asia/Seoul /etc/localtime

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/package.json apps/web/
COPY packages/proto/package.json packages/proto/
COPY packages/shared-types/package.json packages/shared-types/

# Install dependencies (including dev dependencies for buf CLI)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps/web apps/web/
COPY packages/proto packages/proto/
COPY packages/shared-types packages/shared-types/
COPY turbo.json .

# Generate proto code
RUN cd packages/proto && pnpm build

# Build Next.js app
RUN cd apps/web && pnpm build

# Production stage - Minimal runtime image
FROM node:20-alpine AS runner

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

ENV NODE_ENV=production

# Copy workspace configuration
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy package.json files
COPY apps/web/package.json ./apps/web/
COPY packages/proto/package.json ./packages/proto/
COPY packages/shared-types/package.json ./packages/shared-types/

# Copy shared-types source (needed for workspace resolution)
COPY packages/shared-types/src ./packages/shared-types/src

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built proto from builder
COPY --from=builder /app/packages/proto/gen ./packages/proto/gen

# Copy Next.js build output from builder
COPY --from=builder /app/apps/web/.next ./apps/web/.next
# COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/next.config.mjs ./apps/web/

# Expose port
EXPOSE 3000

# Start Next.js
CMD ["pnpm", "--filter", "@persona-chat/web", "start"]

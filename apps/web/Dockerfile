# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Build arguments for Next.js public env vars
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY

# Set environment variables for build
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

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
RUN cd packages/proto && pnpm generate

# Build Next.js app
RUN cd apps/web && pnpm build

# Expose port
EXPOSE 3000

# Start Next.js
CMD ["pnpm", "--filter", "@persona-chat/web", "start"]

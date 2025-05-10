# Dockerfile for the web app
# Build step uses the base Dockerfile
FROM node:18-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Set working directory
WORKDIR /app

# Set pnpm store directory
ENV PNPM_HOME="/app/.pnpm"
ENV PATH="${PNPM_HOME}:${PATH}"

# Install dependencies only when needed
FROM base AS deps
# Copy root workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json ./

# Copy the entire packages directory including source files
COPY packages ./packages

# Copy the web app
COPY apps/web ./apps/web

# Install dependencies for the entire workspace
RUN --mount=type=cache,id=pnpm-store,target=/app/.pnpm-store \
    pnpm install --frozen-lockfile --prefer-offline

# Build the app
FROM base AS builder
COPY --from=deps /app .

# First ensure all dependencies are built
RUN pnpm turbo run build --filter="@repo/ui..." --filter="web..."

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Set the correct working directory for the entrypoint
WORKDIR /app

# Run the application
CMD ["node", "apps/web/server.js"]

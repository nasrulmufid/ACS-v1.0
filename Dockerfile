# Multi-stage Dockerfile for Next.js production build
# 1) Base image
FROM node:20-alpine AS base
WORKDIR /app

# 2) Dependencies layer (uses full dev deps for building)
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# 3) Builder layer
FROM base AS builder
ENV NODE_ENV=production
# Copy node_modules from deps and the rest of the source
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build with Turbopack (defined in package.json)
RUN npm run build

# 4) Runner layer (production-only deps, smaller image)
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Install only production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy necessary build artifacts and app files
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/middleware.ts ./middleware.ts
COPY --from=builder /app/package.json ./package.json

# By default Next.js listens on 3000
EXPOSE 3000

# You can pass environment variables at runtime using --env-file or -e flags
# The app will start in production mode
CMD ["npm", "start"]
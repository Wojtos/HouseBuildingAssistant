FROM node:20-slim AS builder

WORKDIR /app

# Build arguments for client-side env vars (inlined at build time)
ARG PUBLIC_SUPABASE_URL
ARG PUBLIC_SUPABASE_ANON_KEY
ARG PUBLIC_API_URL

# Set as env vars for the build process
ENV PUBLIC_SUPABASE_URL=$PUBLIC_SUPABASE_URL
ENV PUBLIC_SUPABASE_ANON_KEY=$PUBLIC_SUPABASE_ANON_KEY
ENV PUBLIC_API_URL=$PUBLIC_API_URL

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build the application (env vars are inlined into client bundles)
RUN npm run build

# Production stage
FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy built application from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/.astro ./.astro

# Use existing node user (UID 1000) and set ownership
RUN chown -R node:node /app
USER node

# Expose port (Fly.io uses 8080 by default)
EXPOSE 8080

# Run the application (Astro standalone node adapter)
CMD ["sh", "-c", "HOST=0.0.0.0 PORT=${PORT:-8080} node ./dist/server/entry.mjs"]


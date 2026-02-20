FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace config from monorepo root
COPY pnpm-workspace.yaml ./
COPY package.json ./package.json

# Copy the quantum-sim package
COPY packages/quantum-sim/package.json ./packages/quantum-sim/
COPY packages/quantum-sim/tsconfig.json ./packages/quantum-sim/
COPY packages/quantum-sim/src ./packages/quantum-sim/src

# Copy multiplayer package
COPY apps/multiplayer/package.json ./apps/multiplayer/
COPY apps/multiplayer/tsconfig.json ./apps/multiplayer/
COPY apps/multiplayer/src ./apps/multiplayer/src

# Install dependencies from workspace root
RUN pnpm install --no-frozen-lockfile

# Build quantum-sim first (dependency)
WORKDIR /app/packages/quantum-sim
RUN pnpm build

# Build multiplayer
WORKDIR /app/apps/multiplayer
RUN pnpm build && \
    echo "Build completed, checking output..." && \
    ls -la dist/ && \
    test -f dist/index.js || (echo "ERROR: dist/index.js not found!" && exit 1)

# Production image
FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm

# Copy workspace config
COPY pnpm-workspace.yaml ./
COPY package.json ./package.json

# Copy built quantum-sim package
COPY --from=builder /app/packages/quantum-sim/package.json ./packages/quantum-sim/
COPY --from=builder /app/packages/quantum-sim/dist ./packages/quantum-sim/dist

# Copy multiplayer package.json
COPY apps/multiplayer/package.json ./apps/multiplayer/

# Install production dependencies from workspace root
RUN pnpm install --no-frozen-lockfile --prod

# Copy built multiplayer files
WORKDIR /app/apps/multiplayer
COPY --from=builder /app/apps/multiplayer/dist ./dist

# Verify the file exists in production image
RUN test -f dist/index.js || (echo "ERROR: dist/index.js not copied!" && exit 1)

EXPOSE 2567

CMD ["node", "dist/index.js"]

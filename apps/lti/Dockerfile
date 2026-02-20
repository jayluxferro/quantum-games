FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json ./

# Install all dependencies (including devDependencies for build)
RUN pnpm install --no-frozen-lockfile

# Copy source code
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript - fail if build fails
RUN pnpm build && \
    echo "Build completed, checking output..." && \
    ls -la dist/ && \
    test -f dist/index.js || (echo "ERROR: dist/index.js not found!" && exit 1)

# Production image
FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm

# Copy package.json for production dependencies
COPY package.json ./

# Install production dependencies only
RUN pnpm install --no-frozen-lockfile --prod

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Verify the file exists in production image
RUN test -f dist/index.js || (echo "ERROR: dist/index.js not copied!" && exit 1)

EXPOSE 3001

CMD ["node", "dist/index.js"]

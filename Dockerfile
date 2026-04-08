FROM node:22-slim

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile --prod=false

# Copy source
COPY . .

# Build server bundle
RUN pnpm build:server

# Expose port
EXPOSE 3000

# Run the server
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]

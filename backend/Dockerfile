# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Install openssl for Prisma
RUN apk add --no-cache openssl

COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies including devDependencies for build
RUN npm ci

COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install openssl for Prisma
RUN apk add --no-cache openssl

COPY package*.json ./
COPY prisma ./prisma/

# Install only production dependencies
RUN npm ci --only=production

# Copy built artifacts from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

# Expose API port
EXPOSE 5000

# Start server
CMD ["npm", "start"]

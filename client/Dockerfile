FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy the rest of the application
COPY . .

# Build the application
RUN npm run build

# Production image
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy next.config.js only if it exists (won't fail if missing)
COPY --from=builder /app/next.config.mjs ./

# Copy necessary folders
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules

# Expose port for the application
EXPOSE 3000

# Start the application
CMD ["npm", "start"]

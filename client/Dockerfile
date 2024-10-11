# Use an appropriate Node.js version for your application
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies)
RUN npm install

# Copy the application code
COPY . .

# Build the application
RUN npm run build

# Use a minimal server image for production
FROM node:18-alpine AS production

# Set working directory
WORKDIR /app

# Copy the built files from the builder stage
COPY --from=builder /app ./

# Install only production dependencies (not needed in production)
RUN npm install 

# Expose the port your app runs on
EXPOSE 3000

# Start the Next.js application
CMD ["npm", "start"]

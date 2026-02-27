# Use Node.js 22 LTS (Alpine for smaller image)
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose port for Vite dev server
EXPOSE 5173

# Start development server with host flag for Docker compatibility
CMD ["npm", "run", "dev", "--", "--host"]
FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY index.js .

# Cloud Run sets PORT environment variable
ENV PORT=8080

# Start the application
CMD ["npm", "start"]

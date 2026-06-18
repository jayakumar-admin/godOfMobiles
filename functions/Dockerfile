# Build runtime container for Node.js API
FROM node:22-alpine
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy server files
COPY . .

# Expose server port
EXPOSE 3000

# Start Express application
CMD ["npm", "start"]

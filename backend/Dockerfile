# Use official Node.js 22 image
FROM node:22

# Set working directory inside the container
WORKDIR /app

# Copy package.json first for better caching
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy all other files (except .dockerignore items)
COPY . .

# Set an environment variable to tell Node.js we are in Docker
ENV DOCKER_ENV=true

# Expose the port used inside the container
EXPOSE 5000

# Start the Node.js application
CMD ["node", "index.js"]

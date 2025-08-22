# Use official Node.js image as base
FROM node:latest

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package.json yarn.lock* package-lock.json* ./
RUN yarn install --frozen-lockfile || npm install

# Copy source code
COPY . .

# Build TypeScript (if needed)
RUN yarn build || npm run build

# Install Azure Functions Core Tools (Linux x64)
RUN apt-get update && \
    apt-get install -y wget apt-transport-https && \
    wget -q https://packages.microsoft.com/config/ubuntu/22.04/packages-microsoft-prod.deb && \
    dpkg -i packages-microsoft-prod.deb && \
    apt-get update && \
    apt-get install -y azure-functions-core-tools-4

# Expose the port Azure Functions host uses
EXPOSE 7071

# Start Azure Functions host
CMD [ "func", "start", "--javascript" ]
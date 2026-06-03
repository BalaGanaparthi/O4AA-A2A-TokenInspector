#!/bin/bash

set -e

cd "$(dirname "$0")"

# Check for .env file
if [ ! -f ".env" ]; then
  echo "ERROR: .env file not found."
  echo "Copy .env.example to .env and fill in your values:"
  echo "  cp .env.example .env"
  exit 1
fi

# Install dependencies if node_modules is missing
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

echo "Starting A2A Identity Chaining app at http://localhost:3000"
npm run dev

#!/bin/bash
set -e

APP_DIR="${APP_DIR:-/home/ubuntu/ecommerce-app}"
cd "$APP_DIR"

echo "Pulling latest changes..."
git pull origin main

echo "Building and starting containers..."
docker compose pull rabbitmq || true
docker compose build --no-cache backend email-service
docker compose up -d

echo "Cleaning unused Docker images..."
docker image prune -f

echo "Deployment complete."
docker compose ps

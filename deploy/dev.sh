#! /usr/bin/bash

echo "Building Docker container..."
docker build -t lol-norway-bot:prod .
echo "Docker container built"

echo "Starting Docker container..."
docker run -d lol-norway-bot:prod
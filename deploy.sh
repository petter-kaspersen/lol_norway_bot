#! /usr/bin/bash

# Build the docker container
echo "Building Docker container..."
docker build -t lol-norway-bot:prod .
echo "Docker container built"

echo "Deploying to K8s..."

kubectl create -f k8s/configmap.yml
kubectl create -f k8s/secrets.yml

kubectl create -f k8s/deployment.yml

echo "Application successfully deployed"


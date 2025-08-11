#!/bin/bash

# Task Management App Deployment Script

set -e

echo "🚀 Starting deployment of Task Management App..."

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS CLI not configured. Please run 'aws configure' first."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build backend
echo "🔧 Building backend..."
cd backend
python3 -m pip install -r requirements.txt -t .
cd ..

# Build frontend
echo "🎨 Building frontend..."
cd frontend
npm install
npm run build
cd ..

# Bootstrap CDK (if needed)
echo "🏗️  Bootstrapping CDK..."
cd infrastructure
npm install
npx cdk bootstrap

# Deploy infrastructure
echo "☁️  Deploying infrastructure..."
npx cdk deploy --all --require-approval never

echo "✅ Deployment completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Check the CloudFormation outputs for your API URL and website URL"
echo "2. Update the frontend environment variables if needed"
echo "3. Test your application"

# Task Management Web Application

A serverless task management application built with AWS CDK, featuring a TypeScript React frontend and Python Lambda backend.

## Architecture

- **Frontend**: React with TypeScript, hosted on S3 + CloudFront
- **Backend**: Python Lambda functions with API Gateway
- **Database**: DynamoDB for task storage
- **Infrastructure**: AWS CDK for deployment

## Project Structure

```
task-management-app/
├── infrastructure/          # CDK infrastructure code
├── backend/                # Python Lambda functions
├── frontend/               # React TypeScript application
├── shared/                 # Shared types and utilities
└── scripts/                # Build and deployment scripts
```

## Getting Started

1. Install dependencies: `npm install`
2. Deploy infrastructure: `npm run deploy`
3. Build frontend: `npm run build:frontend`
4. Deploy frontend: `npm run deploy:frontend`

## Development

- `npm run dev:frontend` - Start frontend development server
- `npm run test:backend` - Run backend tests
- `npm run test:frontend` - Run frontend tests
- `npm run synth` - Synthesize CDK templates

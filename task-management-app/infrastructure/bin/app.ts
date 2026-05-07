#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { TaskManagementBackendStack } from '../lib/backend-stack';
import { TaskManagementFrontendInfraStack, TaskManagementFrontendDeployStack } from '../lib/frontend-stack';
import { TaskManagementDatabaseStack } from '../lib/database-stack';

const app = new cdk.App();

// Use explicit environment or defaults
const account = '816024705881';
const region = 'us-east-1';

const env = { account, region };

// Database stack (foundational)
const databaseStack = new TaskManagementDatabaseStack(app, 'TaskManagementDatabaseStack', { env });

// Frontend infrastructure stack (S3 + CloudFront) - created early so backend can reference the CF domain
const frontendInfraStack = new TaskManagementFrontendInfraStack(app, 'TaskManagementFrontendInfraStack', { env });

// Backend stack (depends on database and frontend infra for CloudFront domain)
const backendStack = new TaskManagementBackendStack(app, 'TaskManagementBackendStack', {
  table: databaseStack.tasksTable,
  cloudFrontDomainName: frontendInfraStack.distribution.distributionDomainName,
  env,
});

// Frontend deploy stack (deploys assets after backend is ready)
const frontendDeployStack = new TaskManagementFrontendDeployStack(app, 'TaskManagementFrontendDeployStack', {
  bucket: frontendInfraStack.bucket,
  distribution: frontendInfraStack.distribution,
  apiUrl: backendStack.api.url,
  env,
});

// Add dependencies
backendStack.addDependency(databaseStack);
backendStack.addDependency(frontendInfraStack);
frontendDeployStack.addDependency(backendStack);

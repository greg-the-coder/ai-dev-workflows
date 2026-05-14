#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { TaskManagementBackendStack } from '../lib/backend-stack';
import { TaskManagementFrontendStack } from '../lib/frontend-stack';
import { TaskManagementDatabaseStack } from '../lib/database-stack';

const app = new cdk.App();

// Use explicit environment or defaults
const account = '816024705881';
const region = 'us-east-1';

// Database stack (foundational)
const databaseStack = new TaskManagementDatabaseStack(app, 'TaskManagementDatabaseStack', {
  env: {
    account: account,
    region: region,
  },
});

// Frontend stack (creates CloudFront distribution)
const frontendStack = new TaskManagementFrontendStack(app, 'TaskManagementFrontendStack', {
  env: {
    account: account,
    region: region,
  },
});

// Backend stack (depends on database and frontend for CloudFront domain)
const backendStack = new TaskManagementBackendStack(app, 'TaskManagementBackendStack', {
  table: databaseStack.tasksTable,
  cloudFrontDomainName: frontendStack.distribution.distributionDomainName,
  env: {
    account: account,
    region: region,
  },
});

// Add dependencies
backendStack.addDependency(databaseStack);
backendStack.addDependency(frontendStack);

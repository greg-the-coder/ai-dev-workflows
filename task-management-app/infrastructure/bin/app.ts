#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { TaskManagementBackendStack } from '../lib/backend-stack';
import { TaskManagementFrontendStack } from '../lib/frontend-stack';
import { TaskManagementDatabaseStack } from '../lib/database-stack';

const app = new cdk.App();

const account = app.node.tryGetContext('account') || process.env.CDK_DEFAULT_ACCOUNT;
const region = app.node.tryGetContext('region') || process.env.CDK_DEFAULT_REGION || 'us-east-1';

// Database stack (foundational)
const databaseStack = new TaskManagementDatabaseStack(app, 'TaskManagementDatabaseStack', {
  env: {
    account: account,
    region: region,
  },
});

// Backend stack (depends on database)
const backendStack = new TaskManagementBackendStack(app, 'TaskManagementBackendStack', {
  table: databaseStack.tasksTable,
  env: {
    account: account,
    region: region,
  },
});

// Frontend stack (depends on backend API)
const frontendStack = new TaskManagementFrontendStack(app, 'TaskManagementFrontendStack', {
  apiUrl: backendStack.api.url,
  env: {
    account: account,
    region: region,
  },
});

// Add dependencies
backendStack.addDependency(databaseStack);
frontendStack.addDependency(backendStack);

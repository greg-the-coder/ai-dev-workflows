import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export class TaskManagementDatabaseStack extends cdk.Stack {
  public readonly tasksTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB table for tasks
    this.tasksTable = new dynamodb.Table(this, 'TasksTable', {
      tableName: 'TaskManagement-Tasks',
      partitionKey: {
        name: 'taskId',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Use RETAIN for production
      pointInTimeRecovery: true,
    });

    // GSI for querying by completion status and priority
    this.tasksTable.addGlobalSecondaryIndex({
      indexName: 'CompletionStatusIndex',
      partitionKey: {
        name: 'completionStatus',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'priority',
        type: dynamodb.AttributeType.STRING,
      },
    });

    // GSI for querying completed tasks by date (only for completed tasks)
    this.tasksTable.addGlobalSecondaryIndex({
      indexName: 'CompletionDateIndex',
      partitionKey: {
        name: 'completionStatus',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'completionDateSort',
        type: dynamodb.AttributeType.STRING,
      },
    });

    // Output table name
    new cdk.CfnOutput(this, 'TasksTableName', {
      value: this.tasksTable.tableName,
      description: 'DynamoDB table name for tasks',
    });
  }
}

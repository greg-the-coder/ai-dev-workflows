import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import { Construct } from 'constructs';

interface BackendStackProps extends cdk.StackProps {
  table: dynamodb.Table;
}

export class TaskManagementBackendStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;

  constructor(scope: Construct, id: string, props: BackendStackProps) {
    super(scope, id, props);

    // Common Lambda environment variables
    const commonEnvironment = {
      TASKS_TABLE_NAME: props.table.tableName,
      COMPLETION_STATUS_INDEX: 'CompletionStatusIndex',
      COMPLETION_DATE_INDEX: 'CompletionDateIndex',
    };

    // Common Lambda props shared across all functions
    const commonLambdaProps = {
      runtime: lambda.Runtime.PYTHON_3_11,
      code: lambda.Code.fromAsset('../backend/src'),
      environment: commonEnvironment,
      timeout: cdk.Duration.seconds(30),
      tracing: lambda.Tracing.ACTIVE, // SEC-2.1: Enable X-Ray tracing
    };

    // SEC-1.2: Helper to create a least-privilege IAM role for each Lambda
    const createLambdaRole = (id: string): iam.Role => {
      return new iam.Role(this, id, {
        assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
          iam.ManagedPolicy.fromAwsManagedPolicyName('AWSXRayDaemonWriteAccess'), // SEC-2.1: X-Ray permissions
        ],
      });
    };

    // SEC-1.2: Separate roles with least-privilege grants

    // Read-only role for GET handlers
    const getTasksRole = createLambdaRole('GetTasksLambdaRole');
    props.table.grantReadData(getTasksRole);

    const getOpenTasksSummaryRole = createLambdaRole('GetOpenTasksSummaryLambdaRole');
    props.table.grantReadData(getOpenTasksSummaryRole);

    const getCompletedTasksRole = createLambdaRole('GetCompletedTasksLambdaRole');
    props.table.grantReadData(getCompletedTasksRole);

    // Create role: only PutItem
    const createTaskRole = createLambdaRole('CreateTaskLambdaRole');
    createTaskRole.addToPolicy(new iam.PolicyStatement({
      actions: ['dynamodb:PutItem'],
      resources: [props.table.tableArn],
    }));

    // Update role: only UpdateItem
    const updateTaskRole = createLambdaRole('UpdateTaskLambdaRole');
    updateTaskRole.addToPolicy(new iam.PolicyStatement({
      actions: ['dynamodb:UpdateItem'],
      resources: [props.table.tableArn],
    }));

    // Delete role: only DeleteItem
    const deleteTaskRole = createLambdaRole('DeleteTaskLambdaRole');
    deleteTaskRole.addToPolicy(new iam.PolicyStatement({
      actions: ['dynamodb:DeleteItem'],
      resources: [props.table.tableArn],
    }));

    // Lambda functions with individual roles
    const createTaskFunction = new lambda.Function(this, 'CreateTaskFunction', {
      ...commonLambdaProps,
      handler: 'handlers.create_task.handler',
      role: createTaskRole,
    });

    const getTasksFunction = new lambda.Function(this, 'GetTasksFunction', {
      ...commonLambdaProps,
      handler: 'handlers.get_tasks.handler',
      role: getTasksRole,
    });

    const updateTaskFunction = new lambda.Function(this, 'UpdateTaskFunction', {
      ...commonLambdaProps,
      handler: 'handlers.update_task.handler',
      role: updateTaskRole,
    });

    const deleteTaskFunction = new lambda.Function(this, 'DeleteTaskFunction', {
      ...commonLambdaProps,
      handler: 'handlers.delete_task.handler',
      role: deleteTaskRole,
    });

    const getOpenTasksSummaryFunction = new lambda.Function(this, 'GetOpenTasksSummaryFunction', {
      ...commonLambdaProps,
      handler: 'handlers.get_open_tasks_summary.handler',
      role: getOpenTasksSummaryRole,
    });

    const getCompletedTasksFunction = new lambda.Function(this, 'GetCompletedTasksFunction', {
      ...commonLambdaProps,
      handler: 'handlers.get_completed_tasks.handler',
      role: getCompletedTasksRole,
    });

    // API Gateway with SEC-2.1 tracing and SEC-3.2 throttling
    this.api = new apigateway.RestApi(this, 'TaskManagementApi', {
      restApiName: 'Task Management API',
      description: 'API for task management application',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key'],
      },
      deployOptions: {
        tracingEnabled: true, // SEC-2.1: Enable X-Ray tracing on API Gateway
        throttlingBurstLimit: 1000, // SEC-3.2: Burst limit
        throttlingRateLimit: 500, // SEC-3.2: Sustained rate limit
      },
    });

    // API Resources and Methods
    const tasksResource = this.api.root.addResource('tasks');

    // POST /tasks - Create task
    tasksResource.addMethod('POST', new apigateway.LambdaIntegration(createTaskFunction));

    // GET /tasks - Get all tasks
    tasksResource.addMethod('GET', new apigateway.LambdaIntegration(getTasksFunction));

    // Individual task operations
    const taskResource = tasksResource.addResource('{taskId}');
    taskResource.addMethod('PUT', new apigateway.LambdaIntegration(updateTaskFunction));
    taskResource.addMethod('DELETE', new apigateway.LambdaIntegration(deleteTaskFunction));

    // Summary endpoints
    const summaryResource = this.api.root.addResource('summary');

    // GET /summary/open-tasks - Get open tasks summary by priority
    const openTasksResource = summaryResource.addResource('open-tasks');
    openTasksResource.addMethod('GET', new apigateway.LambdaIntegration(getOpenTasksSummaryFunction));

    // GET /summary/completed-tasks - Get completed tasks by date
    const completedTasksResource = summaryResource.addResource('completed-tasks');
    completedTasksResource.addMethod('GET', new apigateway.LambdaIntegration(getCompletedTasksFunction));

    // SEC-2.1: CloudWatch Alarms

    // Alarm for API Gateway 5xx error rate exceeding 5%
    const api5xxErrors = new cloudwatch.Metric({
      namespace: 'AWS/ApiGateway',
      metricName: '5XXError',
      dimensionsMap: {
        ApiName: this.api.restApiName,
      },
      statistic: 'Average',
      period: cdk.Duration.minutes(5),
    });

    new cloudwatch.Alarm(this, 'ApiGateway5xxAlarm', {
      alarmName: 'TaskManagement-API-5xx-ErrorRate',
      alarmDescription: 'API Gateway 5xx error rate exceeds 5%',
      metric: api5xxErrors,
      threshold: 0.05,
      evaluationPeriods: 3,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    // Alarm for Lambda error invocations
    const lambdaFunctions = [
      { fn: createTaskFunction, name: 'CreateTask' },
      { fn: getTasksFunction, name: 'GetTasks' },
      { fn: updateTaskFunction, name: 'UpdateTask' },
      { fn: deleteTaskFunction, name: 'DeleteTask' },
      { fn: getOpenTasksSummaryFunction, name: 'GetOpenTasksSummary' },
      { fn: getCompletedTasksFunction, name: 'GetCompletedTasks' },
    ];

    for (const { fn, name } of lambdaFunctions) {
      new cloudwatch.Alarm(this, `${name}ErrorAlarm`, {
        alarmName: `TaskManagement-${name}-Errors`,
        alarmDescription: `Lambda ${name} error invocations alarm`,
        metric: fn.metricErrors({
          period: cdk.Duration.minutes(5),
          statistic: 'Sum',
        }),
        threshold: 5,
        evaluationPeriods: 2,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });
    }

    // Output API URL
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.api.url,
      description: 'Task Management API URL',
    });
  }
}

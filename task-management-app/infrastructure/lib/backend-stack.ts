import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

interface BackendStackProps extends cdk.StackProps {
  table: dynamodb.Table;
}

export class TaskManagementBackendStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;

  constructor(scope: Construct, id: string, props: BackendStackProps) {
    super(scope, id, props);

    // Lambda execution role
    const lambdaRole = new iam.Role(this, 'TaskManagementLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // Grant DynamoDB permissions to Lambda role
    props.table.grantReadWriteData(lambdaRole);

    // Common Lambda environment variables
    const commonEnvironment = {
      TASKS_TABLE_NAME: props.table.tableName,
      COMPLETION_STATUS_INDEX: 'CompletionStatusIndex',
      COMPLETION_DATE_INDEX: 'CompletionDateIndex',
    };

    // Lambda functions
    const createTaskFunction = new lambda.Function(this, 'CreateTaskFunction', {
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'handlers.create_task.handler',
      code: lambda.Code.fromAsset('../backend/src'),
      role: lambdaRole,
      environment: commonEnvironment,
      timeout: cdk.Duration.seconds(30),
    });

    const getTasksFunction = new lambda.Function(this, 'GetTasksFunction', {
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'handlers.get_tasks.handler',
      code: lambda.Code.fromAsset('../backend/src'),
      role: lambdaRole,
      environment: commonEnvironment,
      timeout: cdk.Duration.seconds(30),
    });

    const updateTaskFunction = new lambda.Function(this, 'UpdateTaskFunction', {
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'handlers.update_task.handler',
      code: lambda.Code.fromAsset('../backend/src'),
      role: lambdaRole,
      environment: commonEnvironment,
      timeout: cdk.Duration.seconds(30),
    });

    const deleteTaskFunction = new lambda.Function(this, 'DeleteTaskFunction', {
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'handlers.delete_task.handler',
      code: lambda.Code.fromAsset('../backend/src'),
      role: lambdaRole,
      environment: commonEnvironment,
      timeout: cdk.Duration.seconds(30),
    });

    const getOpenTasksSummaryFunction = new lambda.Function(this, 'GetOpenTasksSummaryFunction', {
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'handlers.get_open_tasks_summary.handler',
      code: lambda.Code.fromAsset('../backend/src'),
      role: lambdaRole,
      environment: commonEnvironment,
      timeout: cdk.Duration.seconds(30),
    });

    const getCompletedTasksFunction = new lambda.Function(this, 'GetCompletedTasksFunction', {
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'handlers.get_completed_tasks.handler',
      code: lambda.Code.fromAsset('../backend/src'),
      role: lambdaRole,
      environment: commonEnvironment,
      timeout: cdk.Duration.seconds(30),
    });

    // API Gateway
    this.api = new apigateway.RestApi(this, 'TaskManagementApi', {
      restApiName: 'Task Management API',
      description: 'API for task management application',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key'],
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

    // Output API URL
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.api.url,
      description: 'Task Management API URL',
    });
  }
}

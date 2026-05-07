import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';

interface BackendStackProps extends cdk.StackProps {
  table: dynamodb.Table;
  cloudFrontDomainName: string;
}

export class TaskManagementBackendStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;

  constructor(scope: Construct, id: string, props: BackendStackProps) {
    super(scope, id, props);

    const allowedOrigin = `https://${props.cloudFrontDomainName}`;

    // Cognito User Pool
    this.userPool = new cognito.UserPool(this, 'TaskManagementUserPool', {
      userPoolName: 'task-management-user-pool',
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      standardAttributes: {
        email: { required: true, mutable: true },
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Cognito User Pool Client
    this.userPoolClient = new cognito.UserPoolClient(this, 'TaskManagementUserPoolClient', {
      userPool: this.userPool,
      userPoolClientName: 'task-management-app-client',
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      preventUserExistenceErrors: true,
    });

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
      ALLOWED_ORIGIN: allowedOrigin,
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

    // Cognito Authorizer for API Gateway
    const cognitoAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'TaskManagementAuthorizer', {
      cognitoUserPools: [this.userPool],
      authorizerName: 'TaskManagementCognitoAuthorizer',
      identitySource: 'method.request.header.Authorization',
    });

    // API Gateway
    this.api = new apigateway.RestApi(this, 'TaskManagementApi', {
      restApiName: 'Task Management API',
      description: 'API for task management application',
      defaultCorsPreflightOptions: {
        allowOrigins: [allowedOrigin],
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key'],
      },
    });

    const methodOptions: apigateway.MethodOptions = {
      authorizationType: apigateway.AuthorizationType.COGNITO,
      authorizer: cognitoAuthorizer,
    };

    // API Resources and Methods
    const tasksResource = this.api.root.addResource('tasks');

    // POST /tasks - Create task
    tasksResource.addMethod('POST', new apigateway.LambdaIntegration(createTaskFunction), methodOptions);

    // GET /tasks - Get all tasks
    tasksResource.addMethod('GET', new apigateway.LambdaIntegration(getTasksFunction), methodOptions);

    // Individual task operations
    const taskResource = tasksResource.addResource('{taskId}');
    taskResource.addMethod('PUT', new apigateway.LambdaIntegration(updateTaskFunction), methodOptions);
    taskResource.addMethod('DELETE', new apigateway.LambdaIntegration(deleteTaskFunction), methodOptions);

    // Summary endpoints
    const summaryResource = this.api.root.addResource('summary');

    // GET /summary/open-tasks - Get open tasks summary by priority
    const openTasksResource = summaryResource.addResource('open-tasks');
    openTasksResource.addMethod('GET', new apigateway.LambdaIntegration(getOpenTasksSummaryFunction), methodOptions);

    // GET /summary/completed-tasks - Get completed tasks by date
    const completedTasksResource = summaryResource.addResource('completed-tasks');
    completedTasksResource.addMethod('GET', new apigateway.LambdaIntegration(getCompletedTasksFunction), methodOptions);

    // Outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.api.url,
      description: 'Task Management API URL',
    });

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
      description: 'Cognito User Pool ID',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
    });
  }
}

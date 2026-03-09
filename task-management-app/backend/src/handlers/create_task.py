import json
import sys
import os

# Add the src directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from services.dynamodb_service import DynamoDBService
from services.logger import structured_log, get_correlation_id
from models.task import Task

def handler(event, context):
    """Lambda handler for creating a new task"""
    correlation_id = get_correlation_id(event)

    # CORS headers
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Amz-Date, Authorization, X-Api-Key'
    }

    try:
        # Handle preflight OPTIONS request
        if event.get('httpMethod') == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': headers,
                'body': ''
            }

        # Parse request body
        if 'body' not in event or not event['body']:
            structured_log('WARNING', 'Missing request body', correlation_id)
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': 'Request body is required'})
            }

        body = json.loads(event['body'])

        # Validate required fields
        if 'description' not in body:
            structured_log('WARNING', 'Missing description field', correlation_id)
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': 'Description is required'})
            }

        # Create task object
        task = Task(
            task_id='',  # Will be auto-generated
            description=body['description'],
            priority=body.get('priority', 'medium').lower()
        )

        # Validate priority
        if task.priority not in ['high', 'medium', 'low']:
            structured_log('WARNING', 'Invalid priority value', correlation_id, priority=task.priority)
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': 'Priority must be high, medium, or low'})
            }

        # Save to DynamoDB
        db_service = DynamoDBService()
        result = db_service.create_task(task)

        if result['success']:
            structured_log('INFO', 'Task created successfully', correlation_id, task_id=result['task'].get('taskId'))
            return {
                'statusCode': 201,
                'headers': headers,
                'body': json.dumps({
                    'message': 'Task created successfully',
                    'task': result['task']
                })
            }
        else:
            structured_log('ERROR', 'Failed to create task', correlation_id, error=result['error'])
            return {
                'statusCode': 500,
                'headers': headers,
                'body': json.dumps({'error': f'Failed to create task: {result["error"]}'})
            }

    except json.JSONDecodeError:
        structured_log('WARNING', 'Invalid JSON in request body', correlation_id)
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({'error': 'Invalid JSON in request body'})
        }
    except Exception as e:
        structured_log('ERROR', 'Unhandled exception in create_task handler', correlation_id, error=str(e))
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': 'Internal server error'})
        }

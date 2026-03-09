import json
import sys
import os
from datetime import datetime

# Add the src directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from services.dynamodb_service import DynamoDBService
from services.logger import structured_log, get_correlation_id

def handler(event, context):
    """Lambda handler for updating a task"""
    correlation_id = get_correlation_id(event)

    # CORS headers
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'PUT, OPTIONS',
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

        # Get task ID from path parameters
        task_id = event.get('pathParameters', {}).get('taskId')
        if not task_id:
            structured_log('WARNING', 'Missing task ID', correlation_id)
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': 'Task ID is required'})
            }

        # Parse request body
        if 'body' not in event or not event['body']:
            structured_log('WARNING', 'Missing request body', correlation_id, task_id=task_id)
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': 'Request body is required'})
            }

        body = json.loads(event['body'])

        # Prepare updates
        updates = {}

        if 'description' in body:
            updates['description'] = body['description']

        if 'priority' in body:
            priority = body['priority'].lower()
            if priority not in ['high', 'medium', 'low']:
                structured_log('WARNING', 'Invalid priority value', correlation_id, task_id=task_id, priority=priority)
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({'error': 'Priority must be high, medium, or low'})
                }
            updates['priority'] = priority

        if 'completed' in body:
            if body['completed']:
                updates['completion_status'] = 'completed'
                updates['completion_date'] = datetime.utcnow().isoformat()
            else:
                updates['completion_status'] = 'open'
                updates['completion_date'] = None

        # Always update the updated_date
        updates['updated_date'] = datetime.utcnow().isoformat()

        if not updates:
            structured_log('WARNING', 'No valid fields to update', correlation_id, task_id=task_id)
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': 'No valid fields to update'})
            }

        # Update task in DynamoDB
        db_service = DynamoDBService()
        result = db_service.update_task(task_id, updates)

        if result['success']:
            structured_log('INFO', 'Task updated successfully', correlation_id, task_id=task_id)
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'message': 'Task updated successfully',
                    'task': result['task']
                })
            }
        else:
            structured_log('ERROR', 'Failed to update task', correlation_id, task_id=task_id, error=result['error'])
            return {
                'statusCode': 500,
                'headers': headers,
                'body': json.dumps({'error': f'Failed to update task: {result["error"]}'})
            }

    except json.JSONDecodeError:
        structured_log('WARNING', 'Invalid JSON in request body', correlation_id)
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({'error': 'Invalid JSON in request body'})
        }
    except Exception as e:
        structured_log('ERROR', 'Unhandled exception in update_task handler', correlation_id, error=str(e))
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': 'Internal server error'})
        }

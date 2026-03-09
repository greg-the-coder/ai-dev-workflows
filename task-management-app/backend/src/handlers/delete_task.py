import json
import sys
import os

# Add the src directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from services.dynamodb_service import DynamoDBService
from services.logger import structured_log, get_correlation_id

def handler(event, context):
    """Lambda handler for deleting a task"""
    correlation_id = get_correlation_id(event)

    # CORS headers
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
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

        # Delete task from DynamoDB
        db_service = DynamoDBService()
        result = db_service.delete_task(task_id)

        if result['success']:
            structured_log('INFO', 'Task deleted successfully', correlation_id, task_id=task_id)
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'message': 'Task deleted successfully',
                    'taskId': task_id
                })
            }
        else:
            structured_log('ERROR', 'Failed to delete task', correlation_id, task_id=task_id, error=result['error'])
            return {
                'statusCode': 500,
                'headers': headers,
                'body': json.dumps({'error': f'Failed to delete task: {result["error"]}'})
            }

    except Exception as e:
        structured_log('ERROR', 'Unhandled exception in delete_task handler', correlation_id, error=str(e))
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': 'Internal server error'})
        }

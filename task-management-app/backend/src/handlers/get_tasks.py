import json
import sys
import os

# Add the src directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from services.dynamodb_service import DynamoDBService
from services.logger import structured_log, get_correlation_id

def handler(event, context):
    """Lambda handler for getting all tasks"""
    correlation_id = get_correlation_id(event)

    # CORS headers
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

        # SEC-3.2: Accept limit query parameter for pagination
        query_params = event.get('queryStringParameters') or {}
        try:
            limit = int(query_params.get('limit', 50))
        except ValueError:
            limit = 50
        limit = max(1, min(limit, 200))

        exclusive_start_key = query_params.get('next_token')

        # Get tasks from DynamoDB with pagination
        db_service = DynamoDBService()
        result = db_service.get_all_tasks(limit=limit, exclusive_start_key=exclusive_start_key)

        # Convert tasks to dictionaries for JSON serialization
        tasks_data = [task.to_dict() for task in result['tasks']]

        response_body = {
            'tasks': tasks_data,
            'count': len(tasks_data),
        }

        if result.get('next_token'):
            response_body['next_token'] = result['next_token']

        structured_log('INFO', 'Tasks retrieved', correlation_id, count=len(tasks_data), limit=limit)

        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps(response_body)
        }

    except Exception as e:
        structured_log('ERROR', 'Unhandled exception in get_tasks handler', correlation_id, error=str(e))
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': 'Internal server error'})
        }

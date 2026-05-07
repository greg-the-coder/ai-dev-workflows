import json
import sys
import os

# Add the src directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from services.dynamodb_service import DynamoDBService

def handler(event, context):
    """Lambda handler for getting all tasks"""

    allowed_origin = os.environ.get('ALLOWED_ORIGIN', '')

    # CORS headers
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': allowed_origin,
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

        # Get all tasks from DynamoDB
        db_service = DynamoDBService()
        tasks = db_service.get_all_tasks()

        # Convert tasks to dictionaries for JSON serialization
        tasks_data = [task.to_dict() for task in tasks]

        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'tasks': tasks_data,
                'count': len(tasks_data)
            })
        }

    except Exception as e:
        print(f"Error in get_tasks handler: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': 'Internal server error'})
        }

import json
import sys
import os

# Add the src directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from services.dynamodb_service import DynamoDBService

def handler(event, context):
    """Lambda handler for getting completed tasks by date"""

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

        # Get query parameters
        query_params = event.get('queryStringParameters') or {}
        limit = int(query_params.get('limit', 50))

        # Validate limit
        if limit < 1 or limit > 100:
            limit = 50

        # Get completed tasks sorted by completion date
        db_service = DynamoDBService()
        completed_tasks = db_service.get_completed_tasks_by_date(limit)

        # Convert tasks to dictionaries and group by date
        tasks_data = [task.to_dict() for task in completed_tasks]

        # Group tasks by completion date (YYYY-MM-DD format)
        tasks_by_date = {}
        for task in tasks_data:
            if task['completionDate']:
                # Extract date part from ISO timestamp
                completion_date = task['completionDate'].split('T')[0]
                if completion_date not in tasks_by_date:
                    tasks_by_date[completion_date] = []
                tasks_by_date[completion_date].append(task)

        # Sort dates in descending order (newest first)
        sorted_dates = sorted(tasks_by_date.keys(), reverse=True)

        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'completedTasks': tasks_data,
                'tasksByDate': tasks_by_date,
                'sortedDates': sorted_dates,
                'totalCompleted': len(tasks_data),
                'limit': limit
            })
        }

    except ValueError:
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({'error': 'Invalid limit parameter'})
        }
    except Exception as e:
        print(f"Error in get_completed_tasks handler: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': 'Internal server error'})
        }

import json
import re
import sys
import os
from datetime import datetime

# Add the src directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from services.dynamodb_service import DynamoDBService

MAX_DESCRIPTION_LENGTH = 1000
VALID_PRIORITIES = ('high', 'medium', 'low')


def strip_html_tags(text):
    """Remove HTML and script tags from input text."""
    clean = re.sub(r'<script[^>]*>.*?</script>', '', text, flags=re.DOTALL | re.IGNORECASE)
    clean = re.sub(r'<[^>]+>', '', clean)
    return clean.strip()


def handler(event, context):
    """Lambda handler for updating a task"""

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
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': 'Task ID is required'})
            }

        # Parse request body
        if 'body' not in event or not event['body']:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': 'Request body is required'})
            }

        body = json.loads(event['body'])

        # Prepare updates
        updates = {}

        if 'description' in body:
            description = body['description']
            if not isinstance(description, str):
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({'error': 'Description must be a string'})
                }
            description = strip_html_tags(description)
            if len(description) > MAX_DESCRIPTION_LENGTH:
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({'error': f'Description must not exceed {MAX_DESCRIPTION_LENGTH} characters'})
                }
            if not description:
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({'error': 'Description cannot be empty'})
                }
            updates['description'] = description

        if 'priority' in body:
            priority = body['priority']
            if not isinstance(priority, str):
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({'error': 'Priority must be high, medium, or low'})
                }
            priority = priority.lower()
            if priority not in VALID_PRIORITIES:
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
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': 'No valid fields to update'})
            }

        # Update task in DynamoDB
        db_service = DynamoDBService()
        result = db_service.update_task(task_id, updates)

        if result['success']:
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'message': 'Task updated successfully',
                    'task': result['task']
                })
            }
        else:
            return {
                'statusCode': 500,
                'headers': headers,
                'body': json.dumps({'error': 'Failed to update task'})
            }

    except json.JSONDecodeError:
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({'error': 'Invalid JSON in request body'})
        }
    except Exception as e:
        print(f"Error in update_task handler: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': 'Internal server error'})
        }

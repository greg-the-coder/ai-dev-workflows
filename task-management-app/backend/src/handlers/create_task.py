import json
import re
import sys
import os

# Add the src directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from services.dynamodb_service import DynamoDBService
from models.task import Task

MAX_DESCRIPTION_LENGTH = 1000
VALID_PRIORITIES = ['high', 'medium', 'low']


def strip_html_tags(text):
    """Remove HTML and script tags from input text."""
    clean = re.sub(r'<script[^>]*>.*?</script>', '', text, flags=re.DOTALL | re.IGNORECASE)
    clean = re.sub(r'<[^>]+>', '', clean)
    return clean.strip()


def handler(event, context):
    """Lambda handler for creating a new task"""

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
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': 'Request body is required'})
            }

        body = json.loads(event['body'])

        # Validate required fields
        if 'description' not in body:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': 'Description is required'})
            }

        # Sanitize description: strip HTML/script tags
        description = strip_html_tags(str(body['description']))

        # Validate description length
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

        # Validate priority strictly
        priority = str(body.get('priority', 'medium')).lower()
        if priority not in VALID_PRIORITIES:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': 'Priority must be high, medium, or low'})
            }

        # Create task object
        task = Task(
            task_id='',  # Will be auto-generated
            description=description,
            priority=priority
        )

        # Save to DynamoDB
        db_service = DynamoDBService()
        result = db_service.create_task(task)

        if result['success']:
            return {
                'statusCode': 201,
                'headers': headers,
                'body': json.dumps({
                    'message': 'Task created successfully',
                    'task': result['task']
                })
            }
        else:
            return {
                'statusCode': 500,
                'headers': headers,
                'body': json.dumps({'error': 'Failed to create task'})
            }

    except json.JSONDecodeError:
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({'error': 'Invalid JSON in request body'})
        }
    except Exception as e:
        print(f"Error in create_task handler: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': 'Internal server error'})
        }

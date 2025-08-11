import json
import sys
import os

# Add the src directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from services.dynamodb_service import DynamoDBService
from models.task import Task

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
        
        # Create task object
        task = Task(
            task_id='',  # Will be auto-generated
            description=body['description'],
            priority=body.get('priority', 'medium').lower()
        )
        
        # Validate priority
        if task.priority not in ['high', 'medium', 'low']:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': 'Priority must be high, medium, or low'})
            }
        
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
                'body': json.dumps({'error': f'Failed to create task: {result["error"]}'})
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

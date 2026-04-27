import json
import sys
import os
from datetime import datetime

# Add the src directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from services.dynamodb_service import DynamoDBService
from utils.validation import validate_task_input

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
        
        # Validate and sanitize input using validation module
        validated_data, error_msg = validate_task_input(body)
        
        if error_msg:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': error_msg})
            }
        
        # Prepare updates with validated and sanitized data
        updates = {}
        
        if 'description' in validated_data:
            updates['description'] = validated_data['description']
        
        if 'priority' in validated_data:
            updates['priority'] = validated_data['priority']
        
        if 'completed' in validated_data:
            completed = validated_data['completed']
            if completed:
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
                'body': json.dumps({'error': f'Failed to update task: {result["error"]}'})
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

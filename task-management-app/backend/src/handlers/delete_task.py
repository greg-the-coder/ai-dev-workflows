import json
import sys
import os

# Add the src directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from services.dynamodb_service import DynamoDBService

def handler(event, context):
    """Lambda handler for deleting a task"""
    
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
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': 'Task ID is required'})
            }
        
        # Delete task from DynamoDB
        db_service = DynamoDBService()
        result = db_service.delete_task(task_id)
        
        if result['success']:
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'message': 'Task deleted successfully',
                    'taskId': task_id
                })
            }
        else:
            return {
                'statusCode': 500,
                'headers': headers,
                'body': json.dumps({'error': f'Failed to delete task: {result["error"]}'})
            }
    
    except Exception as e:
        print(f"Error in delete_task handler: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': 'Internal server error'})
        }

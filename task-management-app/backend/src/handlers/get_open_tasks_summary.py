import json
import sys
import os

# Add the src directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from services.dynamodb_service import DynamoDBService

def handler(event, context):
    """Lambda handler for getting open tasks summary by priority"""
    
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
        
        # Get open tasks grouped by priority
        db_service = DynamoDBService()
        tasks_by_priority = db_service.get_open_tasks_by_priority()
        
        # Create summary with counts and task details
        summary = {}
        total_open_tasks = 0
        
        for priority in ['high', 'medium', 'low']:
            tasks = tasks_by_priority.get(priority, [])
            task_count = len(tasks)
            total_open_tasks += task_count
            
            summary[priority] = {
                'count': task_count,
                'tasks': [task.to_dict() for task in tasks]
            }
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'summary': summary,
                'totalOpenTasks': total_open_tasks,
                'priorityBreakdown': {
                    'high': summary['high']['count'],
                    'medium': summary['medium']['count'],
                    'low': summary['low']['count']
                }
            })
        }
    
    except Exception as e:
        print(f"Error in get_open_tasks_summary handler: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': 'Internal server error'})
        }

import json
import boto3
import os
from typing import List, Dict, Optional
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError
from models.task import Task
from services.logger import structured_log

class DynamoDBService:
    def __init__(self):
        self.dynamodb = boto3.resource('dynamodb')
        self.table_name = os.environ['TASKS_TABLE_NAME']
        self.table = self.dynamodb.Table(self.table_name)
        self.completion_status_index = os.environ['COMPLETION_STATUS_INDEX']
        self.completion_date_index = os.environ['COMPLETION_DATE_INDEX']

    def create_task(self, task: Task) -> Dict:
        """Create a new task in DynamoDB"""
        try:
            item = task.to_dict()
            self.table.put_item(Item=item)
            return {'success': True, 'task': item}
        except ClientError as e:
            structured_log('ERROR', 'DynamoDB create_task failed', error=str(e))
            return {'success': False, 'error': str(e)}

    def get_task(self, task_id: str) -> Optional[Task]:
        """Get a single task by ID"""
        try:
            response = self.table.get_item(Key={'taskId': task_id})
            if 'Item' in response:
                return Task.from_dict(response['Item'])
            return None
        except ClientError as e:
            structured_log('ERROR', 'DynamoDB get_task failed', task_id=task_id, error=str(e))
            return None

    def get_all_tasks(self, limit: int = 50, exclusive_start_key: Optional[str] = None) -> Dict:
        """Get tasks with pagination support (SEC-3.2)"""
        try:
            scan_kwargs = {
                'Limit': limit,
            }
            if exclusive_start_key:
                scan_kwargs['ExclusiveStartKey'] = json.loads(exclusive_start_key)

            response = self.table.scan(**scan_kwargs)
            tasks = [Task.from_dict(item) for item in response.get('Items', [])]

            result = {'tasks': tasks}
            if 'LastEvaluatedKey' in response:
                result['next_token'] = json.dumps(response['LastEvaluatedKey'])

            return result
        except ClientError as e:
            structured_log('ERROR', 'DynamoDB get_all_tasks failed', error=str(e))
            return {'tasks': []}

    def update_task(self, task_id: str, updates: Dict) -> Dict:
        """Update a task with provided fields"""
        try:
            # Build update expression
            update_expression = "SET "
            expression_values = {}
            expression_names = {}

            for key, value in updates.items():
                if key == 'task_id':  # Skip task_id as it's the partition key
                    continue

                # Map Python field names to DynamoDB attribute names
                field_mapping = {
                    'description': 'description',
                    'priority': 'priority',
                    'completion_date': 'completionDate',
                    'completion_status': 'completionStatus',
                    'updated_date': 'updatedDate'
                }

                db_field = field_mapping.get(key, key)
                update_expression += f"#{db_field} = :{db_field}, "
                expression_names[f"#{db_field}"] = db_field
                expression_values[f":{db_field}"] = value

            # Handle completionDateSort for completed tasks
            if 'completion_status' in updates and updates['completion_status'] == 'completed':
                if 'completion_date' in updates and updates['completion_date']:
                    update_expression += "#completionDateSort = :completionDateSort, "
                    expression_names["#completionDateSort"] = "completionDateSort"
                    expression_values[":completionDateSort"] = updates['completion_date']
            elif 'completion_status' in updates and updates['completion_status'] == 'open':
                # Remove completionDateSort for open tasks
                update_expression += "#completionDateSort = :completionDateSort, "
                expression_names["#completionDateSort"] = "completionDateSort"
                expression_values[":completionDateSort"] = None

            # Remove trailing comma and space
            update_expression = update_expression.rstrip(', ')

            response = self.table.update_item(
                Key={'taskId': task_id},
                UpdateExpression=update_expression,
                ExpressionAttributeNames=expression_names,
                ExpressionAttributeValues=expression_values,
                ReturnValues='ALL_NEW'
            )

            return {'success': True, 'task': response['Attributes']}
        except ClientError as e:
            structured_log('ERROR', 'DynamoDB update_task failed', task_id=task_id, error=str(e))
            return {'success': False, 'error': str(e)}

    def delete_task(self, task_id: str) -> Dict:
        """Delete a task"""
        try:
            self.table.delete_item(Key={'taskId': task_id})
            return {'success': True}
        except ClientError as e:
            structured_log('ERROR', 'DynamoDB delete_task failed', task_id=task_id, error=str(e))
            return {'success': False, 'error': str(e)}

    def get_open_tasks_by_priority(self) -> Dict[str, List[Task]]:
        """Get open tasks grouped by priority"""
        try:
            response = self.table.query(
                IndexName=self.completion_status_index,
                KeyConditionExpression=Key('completionStatus').eq('open')
            )

            tasks_by_priority = {'high': [], 'medium': [], 'low': []}

            for item in response.get('Items', []):
                task = Task.from_dict(item)
                priority = task.priority.lower()
                if priority in tasks_by_priority:
                    tasks_by_priority[priority].append(task)

            return tasks_by_priority
        except ClientError as e:
            structured_log('ERROR', 'DynamoDB get_open_tasks_by_priority failed', error=str(e))
            return {'high': [], 'medium': [], 'low': []}

    def get_completed_tasks_by_date(self, limit: int = 50) -> List[Task]:
        """Get completed tasks sorted by completion date (newest first)"""
        try:
            response = self.table.query(
                IndexName=self.completion_date_index,
                KeyConditionExpression=Key('completionStatus').eq('completed'),
                ScanIndexForward=False,  # Sort in descending order (newest first)
                Limit=limit
            )

            tasks = []
            for item in response.get('Items', []):
                tasks.append(Task.from_dict(item))

            return tasks
        except ClientError as e:
            structured_log('ERROR', 'DynamoDB get_completed_tasks_by_date failed', error=str(e))
            return []

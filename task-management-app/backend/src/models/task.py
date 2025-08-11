from dataclasses import dataclass
from typing import Optional
from datetime import datetime
import uuid

@dataclass
class Task:
    task_id: str
    description: str
    priority: str  # 'high', 'medium', 'low'
    completion_date: Optional[str] = None
    completion_status: str = 'open'  # 'open' or 'completed'
    created_date: Optional[str] = None
    updated_date: Optional[str] = None
    
    def __post_init__(self):
        if not self.task_id:
            self.task_id = str(uuid.uuid4())
        
        current_time = datetime.utcnow().isoformat()
        if not self.created_date:
            self.created_date = current_time
        if not self.updated_date:
            self.updated_date = current_time
    
    def to_dict(self) -> dict:
        """Convert task to dictionary for DynamoDB storage"""
        item = {
            'taskId': self.task_id,
            'description': self.description,
            'priority': self.priority,
            'completionDate': self.completion_date,
            'completionStatus': self.completion_status,
            'createdDate': self.created_date,
            'updatedDate': self.updated_date
        }
        
        # Add completionDateSort only for completed tasks
        if self.completion_status == 'completed' and self.completion_date:
            item['completionDateSort'] = self.completion_date
            
        return item
    
    @classmethod
    def from_dict(cls, data: dict) -> 'Task':
        """Create task from DynamoDB item"""
        return cls(
            task_id=data.get('taskId', ''),
            description=data.get('description', ''),
            priority=data.get('priority', 'medium'),
            completion_date=data.get('completionDate'),
            completion_status=data.get('completionStatus', 'open'),
            created_date=data.get('createdDate'),
            updated_date=data.get('updatedDate')
        )
    
    def mark_completed(self):
        """Mark task as completed with current timestamp"""
        self.completion_status = 'completed'
        self.completion_date = datetime.utcnow().isoformat()
        self.updated_date = datetime.utcnow().isoformat()
    
    def mark_open(self):
        """Mark task as open (incomplete)"""
        self.completion_status = 'open'
        self.completion_date = None
        self.updated_date = datetime.utcnow().isoformat()

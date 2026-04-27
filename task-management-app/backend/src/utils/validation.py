import re
from typing import Dict, Any, Tuple


class InputValidationError(Exception):
    """Exception raised for invalid input data"""
    pass


class InputSanitizer:
    @staticmethod
    def sanitize_string(input_str: str, max_length: int = 1000) -> str:
        """Sanitize a string input to prevent XSS and injection attacks"""
        if not input_str or not isinstance(input_str, str):
            return str(input_str or "")
        
        # Prevent XSS by removing script tags and event handlers
        sanitized = re.sub(r'<script.*?>.*?</script>', '', input_str, flags=re.IGNORECASE | re.DOTALL)
        sanitized = re.sub(r'on\w+\s*=', '', sanitized, flags=re.IGNORECASE)
        
        # Trim excessive whitespace
        sanitized = sanitized.strip()
        
        # Prevent excessively long strings
        if len(sanitized) > max_length:
            raise InputValidationError(f"Input exceeds maximum length of {max_length} characters")
        
        # Remove potentially dangerous characters
        sanitized = re.sub(r'[\x00-\x1F\x7F-\x9F]', '', sanitized)
        
        return sanitized
    
    @staticmethod
    def validate_task_priority(priority: str) -> str:
        """Validate task priority value"""
        if not priority or not isinstance(priority, str):
            raise InputValidationError("Priority must be a non-empty string")
        
        priority_lower = priority.lower()
        if priority_lower not in ['high', 'medium', 'low']:
            raise InputValidationError("Priority must be 'high', 'medium', or 'low'")
        
        return priority_lower
    
    @staticmethod
    def validate_task_fields(data: Dict[str, Any]) -> Tuple[Dict[str, Any], str]:
        """Validate and sanitize task creation/update fields"""
        errors = []
        validated_data = {}
        
        # Validate and sanitize description
        if 'description' in data:
            try:
                description = data['description']
                if not description or description == "":
                    errors.append("Description cannot be empty")
                else:
                    validated_data['description'] = InputSanitizer.sanitize_string(description, max_length=1000)
            except InputValidationError as e:
                errors.append(f"Invalid description: {str(e)}")
        
        # Validate priority
        if 'priority' in data:
            try:
                priority = data['priority']
                if priority and priority != "":
                    validated_data['priority'] = InputSanitizer.validate_task_priority(priority)
            except InputValidationError as e:
                errors.append(f"Invalid priority: {str(e)}")
        
        # Validate completion status
        if 'completed' in data:
            completed = data['completed']
            if not isinstance(completed, bool):
                errors.append("Completed must be a boolean value")
            else:
                validated_data['completed'] = completed
        
        if errors:
            return None, ", ".join(errors)
        
        return validated_data, ""


def validate_task_input(data: Dict[str, Any]) -> Tuple[Dict[str, Any], str]:
    """Main function to validate and sanitize task input data"""
    return InputSanitizer.validate_task_fields(data)

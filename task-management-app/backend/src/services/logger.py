import json
import logging
import os

logger = logging.getLogger()
logger.setLevel(os.environ.get('LOG_LEVEL', 'INFO'))


def structured_log(level: str, message: str, correlation_id: str = '', **kwargs):
    """Emit a structured JSON log entry with correlation ID."""
    entry = {
        'level': level,
        'message': message,
        'correlation_id': correlation_id,
    }
    entry.update(kwargs)
    log_line = json.dumps(entry, default=str)
    getattr(logger, level.lower(), logger.info)(log_line)


def get_correlation_id(event: dict) -> str:
    """Extract the API Gateway request ID for use as a correlation ID."""
    request_context = event.get('requestContext', {})
    return request_context.get('requestId', '')

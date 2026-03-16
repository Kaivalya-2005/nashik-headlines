"""
tools/retry_helper.py
--------------------
Retry utility for handling transient failures (API errors, rate limiting, etc.)
Used across all agents for consistent error handling.
"""

import time
import logging
from functools import wraps
from typing import Callable, Any

log = logging.getLogger("manus-agents")


def retry(max_attempts: int = 3, delay: float = 2.0, backoff: float = 2.0):
    """
    Decorator for retrying functions with exponential backoff.
    
    Args:
        max_attempts: Number of times to retry (default: 3)
        delay: Initial delay in seconds between retries (default: 2.0)
        backoff: Multiplier for delay on each retry (default: 2.0)
    
    Usage:
        @retry(max_attempts=3, delay=1.0)
        def some_function():
            ...
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            attempt = 1
            current_delay = delay
            
            while attempt <= max_attempts:
                try:
                    return func(*args, **kwargs)
                except Exception as exc:
                    if attempt >= max_attempts:
                        log.error(f"{func.__name__} failed after {max_attempts} attempts: {exc}")
                        raise
                    
                    log.warning(
                        f"{func.__name__} attempt {attempt}/{max_attempts} failed: {exc}. "
                        f"Retrying in {current_delay:.1f}s..."
                    )
                    time.sleep(current_delay)
                    current_delay *= backoff
                    attempt += 1
        
        return wrapper
    return decorator


def retry_with_fallback(
    max_attempts: int = 3, 
    delay: float = 2.0, 
    backoff: float = 2.0,
    fallback_value: Any = None
):
    """
    Similar to retry, but returns fallback_value on final failure instead of raising.
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            attempt = 1
            current_delay = delay
            
            while attempt <= max_attempts:
                try:
                    return func(*args, **kwargs)
                except Exception as exc:
                    if attempt >= max_attempts:
                        log.error(
                            f"{func.__name__} failed after {max_attempts} attempts: {exc}. "
                            f"Returning fallback value."
                        )
                        return fallback_value
                    
                    log.warning(
                        f"{func.__name__} attempt {attempt}/{max_attempts} failed: {exc}. "
                        f"Retrying in {current_delay:.1f}s..."
                    )
                    time.sleep(current_delay)
                    current_delay *= backoff
                    attempt += 1
        
        return wrapper
    return decorator

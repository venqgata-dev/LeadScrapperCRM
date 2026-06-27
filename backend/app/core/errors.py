"""Shared error handling utilities for FastAPI route handlers."""
from __future__ import annotations

import functools
import logging
from collections.abc import Callable
from typing import Any, TypeVar

from fastapi import HTTPException, status
from sqlalchemy.exc import SQLAlchemyError

logger = logging.getLogger(__name__)

F = TypeVar("F", bound=Callable[..., Any])


def db_error_handler(label: str = "operation") -> Callable[[F], F]:
    """
    Decorator that catches SQLAlchemyError and converts it to HTTP 503.

    Usage::

        @router.get("/things")
        @db_error_handler("list things")
        def list_things(db: Session = Depends(get_db)):
            ...
    """
    def decorator(fn: F) -> F:
        @functools.wraps(fn)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            try:
                return fn(*args, **kwargs)
            except HTTPException:
                raise
            except SQLAlchemyError as exc:
                logger.exception("Database error during %s", label)
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Database is temporarily unavailable.",
                ) from exc
        return wrapper  # type: ignore[return-value]
    return decorator


class AppError(Exception):
    """Base application error with HTTP status and user-facing message."""

    def __init__(self, message: str, status_code: int = status.HTTP_400_BAD_REQUEST) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code

    def to_http(self) -> HTTPException:
        return HTTPException(status_code=self.status_code, detail=self.message)

"""
app/api/__init__.py
===================
API paketini dışa açar.
"""

from .client import api_client, ApiClient
from .exceptions import (
    ApiException,
    UnauthorizedException,
    ForbiddenException,
    NotFoundException,
    ValidationException,
    ServerException,
    TimeoutException,
    ConnectionException,
    UnexpectedException,
)

__all__ = [
    "api_client",
    "ApiClient",
    "ApiException",
    "UnauthorizedException",
    "ForbiddenException",
    "NotFoundException",
    "ValidationException",
    "ServerException",
    "TimeoutException",
    "ConnectionException",
    "UnexpectedException",
]

"""
app/dialogs/__init__.py
=======================
Dialogs paketini dışa açar.
"""

from .error_dialog import ErrorDialog
from .property_create_dialog import PropertyCreateDialog

__all__ = [
    "ErrorDialog",
    "PropertyCreateDialog",
]

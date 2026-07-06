"""
app/widgets/styled_input.py
============================
Amaç:
    Uygulamada tutarlı form input görünümü için QLineEdit ve QComboBox
    wrapper'ları. Hata durumunda kırmızı çerçeve gösterir.

Neden bu şekilde tasarlandı:
    - Form alanları için tek tip görünüm sağlar.
    - show_error() / clear_error() metodları: View'ın inline CSS yazmasını engeller.
    - QComboBox için de aynı dark theme uygulanır.

Mimari içindeki görevi:
    Widget katmanı — dialog ve form view'ları bu widget'ları kullanır.
"""

from PySide6.QtWidgets import QLineEdit, QComboBox, QTextEdit
from PySide6.QtCore import Qt

from app.config.constants import Colors, Dimensions


_INPUT_BASE = f"""
    background-color: {Colors.SURFACE_2};
    color: {Colors.TEXT_PRIMARY};
    border: 1px solid {Colors.BORDER};
    border-radius: 6px;
    padding: 6px 10px;
    font-size: 11pt;
    selection-background-color: {Colors.PRIMARY};
"""

_INPUT_FOCUS = f"""
    border: 1px solid {Colors.PRIMARY};
    outline: none;
"""

_INPUT_ERROR = f"""
    border: 1px solid {Colors.DANGER};
"""


class StyledLineEdit(QLineEdit):
    """
    Özelleştirilmiş tek satırlı metin girdi alanı.

    Args:
        placeholder: Placeholder metin.
        password: True ise şifre modunda gösterir.
        parent: Üst widget.
    """

    def __init__(
        self,
        placeholder: str = "",
        password: bool = False,
        parent=None,
    ) -> None:
        super().__init__(parent)
        self.setPlaceholderText(placeholder)
        self.setMinimumHeight(Dimensions.INPUT_HEIGHT)
        if password:
            self.setEchoMode(QLineEdit.EchoMode.Password)
        self._apply_base_style()

    def _apply_base_style(self) -> None:
        self.setStyleSheet(f"""
            QLineEdit {{
                {_INPUT_BASE}
            }}
            QLineEdit:focus {{
                {_INPUT_FOCUS}
            }}
            QLineEdit::placeholder {{
                color: {Colors.TEXT_MUTED};
            }}
        """)

    def show_error(self) -> None:
        """Kırmızı çerçeve gösterir (validasyon hatası)."""
        self.setStyleSheet(f"""
            QLineEdit {{
                {_INPUT_BASE}
                {_INPUT_ERROR}
            }}
            QLineEdit:focus {{
                {_INPUT_ERROR}
            }}
        """)

    def clear_error(self) -> None:
        """Normal görünüme geri döner."""
        self._apply_base_style()


class StyledComboBox(QComboBox):
    """
    Özelleştirilmiş açılır liste (dropdown).

    Args:
        parent: Üst widget.
    """

    def __init__(self, parent=None) -> None:
        super().__init__(parent)
        self.setMinimumHeight(Dimensions.INPUT_HEIGHT)
        self.setStyleSheet(f"""
            QComboBox {{
                {_INPUT_BASE}
            }}
            QComboBox:focus {{
                {_INPUT_FOCUS}
            }}
            QComboBox::drop-down {{
                border: none;
                width: 28px;
            }}
            QComboBox::down-arrow {{
                width: 12px;
                height: 12px;
            }}
            QComboBox QAbstractItemView {{
                background-color: {Colors.SURFACE_2};
                color: {Colors.TEXT_PRIMARY};
                border: 1px solid {Colors.BORDER};
                selection-background-color: {Colors.PRIMARY};
                outline: none;
            }}
        """)


class StyledTextEdit(QTextEdit):
    """
    Özelleştirilmiş çok satırlı metin girdi alanı.

    Args:
        placeholder: Placeholder metin.
        parent: Üst widget.
    """

    def __init__(self, placeholder: str = "", parent=None) -> None:
        super().__init__(parent)
        self.setPlaceholderText(placeholder)
        self.setStyleSheet(f"""
            QTextEdit {{
                {_INPUT_BASE}
            }}
            QTextEdit:focus {{
                {_INPUT_FOCUS}
            }}
        """)

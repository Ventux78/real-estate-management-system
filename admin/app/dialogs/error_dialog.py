"""
app/dialogs/error_dialog.py
============================
Amaç:
    API ve sistem hatalarını kullanıcıya gösterecek modal dialog.
    exception tipine göre başlık ve ikon otomatik belirlenir.

Neden bu şekilde tasarlandı:
    - View katmanı her hata türü için ayrı dialog kodu yazmaz;
      show_error() statik metodunu çağırır.
    - ApiException alt sınıfları için özelleşmiş başlık ve renk.
    - Debug modda teknik detay (stack trace) gösterilebilir.

Mimari içindeki görevi:
    Dialog katmanı — View'lar exception bloklarında bu dialog'u kullanır.
"""

from PySide6.QtWidgets import (
    QDialog,
    QVBoxLayout,
    QHBoxLayout,
    QLabel,
    QWidget,
)
from PySide6.QtCore import Qt

from app.api.exceptions import (
    ApiException,
    UnauthorizedException,
    ForbiddenException,
    NotFoundException,
    ServerException,
    TimeoutException,
    ConnectionException,
    ValidationException,
)
from app.config.constants import Colors, FontSizes
from app.config.settings import settings
from app.widgets.styled_button import StyledButton
from app.services.auth_service import auth_service


class ErrorDialog(QDialog):
    """
    Hata gösterim dialog'u.

    Args:
        title: Dialog başlığı.
        message: Ana hata mesajı.
        detail: Teknik detay (opsiyonel, debug modda gösterilir).
        parent: Üst widget.
    """

    def __init__(
        self,
        title: str,
        message: str,
        detail: str | None = None,
        parent=None,
    ) -> None:
        super().__init__(parent)
        self.setWindowTitle(title)
        self.setModal(True)
        self.setMinimumWidth(400)
        self.setMaximumWidth(600)
        self.setStyleSheet(f"""
            QDialog {{
                background-color: {Colors.SURFACE};
                border: 1px solid {Colors.BORDER};
                border-radius: 12px;
            }}
        """)
        self._setup_ui(title, message, detail)

    def _setup_ui(self, title: str, message: str, detail: str | None) -> None:
        layout = QVBoxLayout(self)
        layout.setSpacing(16)
        layout.setContentsMargins(24, 24, 24, 24)

        # Başlık
        title_label = QLabel(f"⚠ {title}")
        title_label.setStyleSheet(f"""
            color: {Colors.DANGER};
            font-size: {FontSizes.LARGE}pt;
            font-weight: 700;
        """)
        layout.addWidget(title_label)

        # Ana mesaj
        msg_label = QLabel(message)
        msg_label.setWordWrap(True)
        msg_label.setStyleSheet(f"""
            color: {Colors.TEXT_PRIMARY};
            font-size: {FontSizes.NORMAL}pt;
            line-height: 1.5;
        """)
        layout.addWidget(msg_label)

        # Debug detay (sadece debug modda göster)
        if detail and settings.debug:
            detail_label = QLabel(detail)
            detail_label.setWordWrap(True)
            detail_label.setStyleSheet(f"""
                color: {Colors.TEXT_MUTED};
                font-size: {FontSizes.SMALL}pt;
                font-family: 'Courier New', monospace;
                background-color: {Colors.BACKGROUND};
                border: 1px solid {Colors.BORDER};
                border-radius: 6px;
                padding: 8px;
            """)
            layout.addWidget(detail_label)

        # Kapat butonu
        btn_layout = QHBoxLayout()
        btn_layout.addStretch()
        close_btn = StyledButton("Tamam", variant="secondary")
        close_btn.setMinimumWidth(100)
        close_btn.clicked.connect(self.accept)
        btn_layout.addWidget(close_btn)
        layout.addLayout(btn_layout)

    @staticmethod
    def show_error(
        exception: Exception | None = None,
        message: str | None = None,
        parent=None,
    ) -> None:
        """
        Hata dialog'unu gösterir.

        ApiException türüne göre başlık otomatik belirlenir.

        Args:
            exception: Fırlatılan exception (ApiException veya genel Exception).
            message: Özel mesaj (exception yoksa kullanılır).
            parent: Üst widget.
        """
        title = "Hata"
        detail: str | None = None

        if isinstance(exception, UnauthorizedException):
            title = "Oturum Hatası"
        elif isinstance(exception, ForbiddenException):
            title = "Yetki Hatası"
        elif isinstance(exception, NotFoundException):
            title = "Bulunamadı"
        elif isinstance(exception, ValidationException):
            title = "Doğrulama Hatası"
        elif isinstance(exception, ServerException):
            title = "Sunucu Hatası"
        elif isinstance(exception, TimeoutException):
            title = "Bağlantı Zaman Aşımı"
        elif isinstance(exception, ConnectionException):
            title = "Bağlantı Hatası"

        if isinstance(exception, ApiException):
            msg = exception.message
            detail = exception.detail
        elif exception:
            msg = str(exception)
        else:
            msg = message or "Bilinmeyen bir hata oluştu."

        dialog = ErrorDialog(title, msg, detail, parent)
        dialog.exec()

        if isinstance(exception, UnauthorizedException):
            auth_service.logout()
            auth_service.session_expired.emit()

    @staticmethod
    def show_message(title: str, message: str, parent=None) -> None:
        """Genel bilgi veya hata mesajı gösterir."""
        dialog = ErrorDialog(title, message, parent=parent)
        dialog.exec()

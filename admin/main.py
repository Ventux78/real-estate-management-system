"""
main.py
=======
Amaç:
    Gayrimenkul Admin uygulamasının giriş noktası.
    QApplication oluşturur, global stylesheet uygular,
    LoginView ile uygulamayı başlatır.

Neden bu şekilde tasarlandı:
    - Tüm view geçişleri (Login → MainWindow → Login) sinyal/slot ile yönetilir.
      View'lar birbirini doğrudan örneklemez; gevşek bağımlılık.
    - Global QFont: uygulamanın tamamında tutarlı tipografi.
    - Global exception handler: beklenmedik hatalar loglanır, kullanıcıya gösterilir.
    - QApplication.setStyle('Fusion'): cross-platform tutarlı temel stil.

Mimari içindeki görevi:
    Uygulama entry point — bootstrap ve view yaşam döngüsü yönetimi.
    Business logic veya UI kodu içermez.
"""

import sys
import logging
from typing import Optional

from PySide6.QtWidgets import QApplication, QMessageBox
from PySide6.QtGui import QFont, QFontDatabase
from PySide6.QtCore import Qt

from app.config.settings import settings
from app.config.constants import Colors


# ─── Logging Konfigürasyonu ──────────────────────────────────────────────────

logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

logger = logging.getLogger(__name__)


# ─── Global Stylesheet ───────────────────────────────────────────────────────

GLOBAL_STYLESHEET = f"""
    * {{
        font-family: 'Segoe UI', 'SF Pro Display', 'Inter', -apple-system, sans-serif;
    }}
    QToolTip {{
        background-color: {Colors.SURFACE_2};
        color: {Colors.TEXT_PRIMARY};
        border: 1px solid {Colors.BORDER};
        border-radius: 4px;
        padding: 4px 8px;
        font-size: 10pt;
    }}
    QScrollBar:vertical {{
        background: {Colors.SURFACE};
        width: 8px;
        margin: 0;
        border-radius: 4px;
    }}
    QScrollBar::handle:vertical {{
        background: {Colors.BORDER};
        min-height: 40px;
        border-radius: 4px;
    }}
    QScrollBar::add-line:vertical,
    QScrollBar::sub-line:vertical {{
        height: 0;
    }}
    QMessageBox {{
        background-color: {Colors.SURFACE};
        color: {Colors.TEXT_PRIMARY};
    }}
    QMessageBox QLabel {{
        color: {Colors.TEXT_PRIMARY};
        font-size: 11pt;
    }}
    QMessageBox QPushButton {{
        background-color: {Colors.PRIMARY};
        color: white;
        border: none;
        border-radius: 6px;
        padding: 6px 16px;
        min-width: 80px;
        font-size: 10pt;
        font-weight: 600;
    }}
    QMessageBox QPushButton:hover {{
        background-color: {Colors.PRIMARY_DARK};
    }}
"""


# ─── Uygulama Yöneticisi ─────────────────────────────────────────────────────

class AppController:
    """
    Uygulama view yaşam döngüsünü yönetir.

    LoginView ve MainWindow arasındaki geçişleri sinyal/slot ile koordine eder.
    View'lar birbirini örneklemez; AppController bu işi yapar.
    """

    def __init__(self) -> None:
        from app.views.login.login_view import LoginView
        from app.views.main.main_window import MainWindow

        self._login_view: Optional[LoginView] = None
        self._main_window: Optional[MainWindow] = None
        self._LoginView = LoginView
        self._MainWindow = MainWindow

        from app.services.auth_service import auth_service
        auth_service.session_expired.connect(self._on_logout)

    def start(self) -> None:
        """Login ekranını göstererek uygulamayı başlatır."""
        self._show_login()

    def _show_login(self) -> None:
        """Login ekranını gösterir; Main Window varsa kapatır."""
        if self._main_window:
            self._main_window.close()
            self._main_window = None

        self._login_view = self._LoginView()
        self._login_view.login_successful.connect(self._on_login_success)
        self._login_view.show()
        logger.info("LoginView gösteriliyor.")

    def _on_login_success(self) -> None:
        """Login başarılı → MainWindow göster."""
        if self._login_view:
            self._login_view.close()
            self._login_view = None

        self._main_window = self._MainWindow()
        self._main_window.logout_requested.connect(self._on_logout)
        self._main_window.show()
        logger.info("MainWindow gösteriliyor.")

    def _on_logout(self) -> None:
        """Logout → Login ekranına dön."""
        logger.info("Logout: LoginView'a dönülüyor.")
        self._show_login()


# ─── Entry Point ─────────────────────────────────────────────────────────────

def main() -> int:
    """
    Uygulamayı başlatır.

    Returns:
        Exit code (0=başarı).
    """
    app = QApplication(sys.argv)
    app.setApplicationName(settings.app_name)
    app.setApplicationVersion(settings.app_version)
    app.setOrganizationName("Gayrimenkul")

    # Fusion style: cross-platform tutarlı görünüm
    app.setStyle("Fusion")

    # Global stylesheet
    app.setStyleSheet(GLOBAL_STYLESHEET)

    # Default font
    default_font = QFont("Segoe UI", 10)
    default_font.setHintingPreference(QFont.HintingPreference.PreferDefaultHinting)
    app.setFont(default_font)

    logger.info(f"Uygulama başlatılıyor: {settings.app_name} v{settings.app_version}")
    logger.info(f"API URL: {settings.api_url}")
    logger.info(f"Debug modu: {settings.debug}")

    # AppController aracılığıyla view yönetimi
    controller = AppController()
    controller.start()

    return app.exec()


if __name__ == "__main__":
    sys.exit(main())

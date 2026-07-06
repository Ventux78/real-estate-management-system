"""
app/views/login/login_view.py
==============================
Amaç:
    Uygulama açıldığında gösterilen kimlik doğrulama ekranı.
    Kullanıcı adı ve şifre alır; başarılı girişte MainWindow'u açar.

Neden bu şekilde tasarlandı:
    - QWidget tabanlı (QDialog değil): standalone window olarak kullanılır.
    - AuthService.login() çağrısını kendisi tetikler; HTTP kodunu bilmez.
    - Giriş başarılıysa 'login_successful' sinyali yayar →
      main.py bu sinyali dinler ve MainWindow'u açar.
    - UI ile iş mantığı birbirinden ayrılmış: validasyon → service → sinyal.
    - Glassmorphism tarzı koyu tasarım; premium görünüm.

Mimari içindeki görevi:
    View katmanı — giriş noktası.
    AuthService → ApiClient → Backend zincirini başlatır.
"""

from PySide6.QtWidgets import (
    QWidget,
    QVBoxLayout,
    QHBoxLayout,
    QLabel,
    QFrame,
    QSpacerItem,
    QSizePolicy,
)
from PySide6.QtCore import Qt, Signal, QPropertyAnimation, QEasingCurve, QPoint
from PySide6.QtGui import QFont, QColor

from app.services.auth_service import auth_service
from app.api.exceptions import ApiException, UnauthorizedException
from app.config.constants import Colors, FontSizes, Dimensions
from app.config.settings import settings
from app.widgets.styled_button import StyledButton
from app.widgets.styled_input import StyledLineEdit
from app.utils.validators import validate_login_form


class LoginView(QWidget):
    """
    Giriş ekranı.

    Signals:
        login_successful: Kimlik doğrulama başarılı olduğunda yayılır.
    """

    login_successful = Signal()

    def __init__(self) -> None:
        super().__init__()
        self.setWindowTitle(f"{settings.app_name} — Giriş")
        self.setFixedSize(Dimensions.LOGIN_WINDOW_WIDTH, Dimensions.LOGIN_WINDOW_HEIGHT)
        self.setStyleSheet(f"background-color: {Colors.BACKGROUND};")
        self._setup_ui()

    def _setup_ui(self) -> None:
        """Giriş ekranı UI bileşenlerini oluşturur."""
        main_layout = QVBoxLayout(self)
        main_layout.setContentsMargins(0, 0, 0, 0)
        main_layout.setSpacing(0)

        # Tam ekran dikey/yatay ortalama
        main_layout.addStretch(1)

        center_layout = QHBoxLayout()
        center_layout.addStretch(1)

        # ── Kart Paneli ────────────────────────────────────────────────────
        card = QFrame()
        card.setFixedWidth(360)
        card.setStyleSheet(f"""
            QFrame {{
                background-color: {Colors.SURFACE};
                border: 1px solid {Colors.BORDER};
                border-radius: 16px;
            }}
        """)

        card_layout = QVBoxLayout(card)
        card_layout.setContentsMargins(36, 40, 36, 40)
        card_layout.setSpacing(20)

        # Logo / Başlık
        logo_label = QLabel("🏠")
        logo_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        logo_label.setStyleSheet("font-size: 42pt; background: transparent; border: none;")
        card_layout.addWidget(logo_label)

        title_label = QLabel(settings.app_name)
        title_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        title_label.setStyleSheet(f"""
            color: {Colors.TEXT_PRIMARY};
            font-size: {FontSizes.XLARGE}pt;
            font-weight: 800;
            background: transparent;
            border: none;
            letter-spacing: -0.5px;
        """)
        card_layout.addWidget(title_label)

        subtitle_label = QLabel("Yönetim Paneli")
        subtitle_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        subtitle_label.setStyleSheet(f"""
            color: {Colors.TEXT_MUTED};
            font-size: {FontSizes.NORMAL}pt;
            background: transparent;
            border: none;
            margin-bottom: 8px;
        """)
        card_layout.addWidget(subtitle_label)

        # ── Ayırıcı ───────────────────────────────────────────────────────
        separator = QFrame()
        separator.setFrameShape(QFrame.Shape.HLine)
        separator.setFixedHeight(1)
        separator.setStyleSheet(f"background-color: {Colors.BORDER}; border: none;")
        card_layout.addWidget(separator)

        # ── Form Alanları ─────────────────────────────────────────────────
        # Kullanıcı adı
        username_label = QLabel("Kullanıcı Adı")
        username_label.setStyleSheet(f"""
            color: {Colors.TEXT_SECONDARY};
            font-size: {FontSizes.SMALL}pt;
            font-weight: 600;
            background: transparent;
            border: none;
        """)
        card_layout.addWidget(username_label)

        self._username_input = StyledLineEdit(placeholder="Kullanıcı adınızı girin")
        self._username_input.returnPressed.connect(self._on_login)
        card_layout.addWidget(self._username_input)

        # Şifre
        password_label = QLabel("Şifre")
        password_label.setStyleSheet(f"""
            color: {Colors.TEXT_SECONDARY};
            font-size: {FontSizes.SMALL}pt;
            font-weight: 600;
            background: transparent;
            border: none;
        """)
        card_layout.addWidget(password_label)

        self._password_input = StyledLineEdit(
            placeholder="Şifrenizi girin",
            password=True,
        )
        self._password_input.returnPressed.connect(self._on_login)
        card_layout.addWidget(self._password_input)

        # Hata mesajı
        self._error_label = QLabel("")
        self._error_label.setWordWrap(True)
        self._error_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self._error_label.setStyleSheet(f"""
            color: {Colors.DANGER};
            font-size: {FontSizes.SMALL}pt;
            background-color: {Colors.DANGER_LIGHT}22;
            border: 1px solid {Colors.DANGER}44;
            border-radius: 6px;
            padding: 8px;
            background: transparent;
        """)
        self._error_label.hide()
        card_layout.addWidget(self._error_label)

        # Giriş butonu
        self._login_btn = StyledButton("Giriş Yap", variant="primary")
        self._login_btn.setMinimumHeight(44)
        self._login_btn.setStyleSheet(self._login_btn.styleSheet() + """
            QPushButton { font-size: 12pt; }
        """)
        self._login_btn.clicked.connect(self._on_login)
        card_layout.addWidget(self._login_btn)

        # Versiyon bilgisi
        version_label = QLabel(f"v{settings.app_version}")
        version_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        version_label.setStyleSheet(f"""
            color: {Colors.TEXT_MUTED};
            font-size: {FontSizes.TINY}pt;
            background: transparent;
            border: none;
        """)
        card_layout.addWidget(version_label)

        center_layout.addWidget(card)
        center_layout.addStretch(1)
        main_layout.addLayout(center_layout)
        main_layout.addStretch(1)

    def _on_login(self) -> None:
        """
        Giriş butonuna basıldığında veya Enter'a basıldığında çalışır.

        1. Form validasyonu
        2. AuthService.login() çağrısı
        3. Başarıysa login_successful sinyali
        4. Başarısızsa hata mesajı
        """
        self._hide_error()
        username = self._username_input.text().strip()
        password = self._password_input.text().strip()

        # Client-side validasyon
        is_valid, errors = validate_login_form(username, password)
        if not is_valid:
            self._show_error("\n".join(errors))
            return

        # UI'ı yükleme moduna al
        self._set_loading(True)

        try:
            auth_service.login(username, password)
            self.login_successful.emit()
        except UnauthorizedException:
            self._show_error("Kullanıcı adı veya şifre hatalı.")
            self._password_input.clear()
            self._password_input.show_error()
            self._username_input.show_error()
        except ApiException as e:
            self._show_error(e.message)
        except Exception as e:
            self._show_error(f"Beklenmeyen hata: {e}")
        finally:
            self._set_loading(False)

    def _set_loading(self, loading: bool) -> None:
        """Giriş sırasında butonu devre dışı bırakır."""
        self._login_btn.setEnabled(not loading)
        self._login_btn.setText("Giriş yapılıyor..." if loading else "Giriş Yap")
        self._username_input.setEnabled(not loading)
        self._password_input.setEnabled(not loading)

    def _show_error(self, message: str) -> None:
        """Hata mesajı gösterir."""
        self._error_label.setText(f"⚠ {message}")
        self._error_label.show()

    def _hide_error(self) -> None:
        """Hata mesajını gizler ve input'ları sıfırlar."""
        self._error_label.hide()
        self._username_input.clear_error()
        self._password_input.clear_error()

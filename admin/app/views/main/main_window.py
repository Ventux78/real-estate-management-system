"""
app/views/main/main_window.py
==============================
Amaç:
    Başarılı girişten sonra açılan ana uygulama penceresi.
    Sol tarafta navigasyon sidebar, sağda içerik paneli bulunur.

Neden bu şekilde tasarlandı:
    - QMainWindow değil QWidget tercih edildi: Sidebar ve content area için
      QHBoxLayout ile daha temiz bir layout yönetimi sağlanır.
    - Navigasyon öğeleri tıklandığında QStackedWidget ile ilgili view aktif olur.
      Bu sayede her sekme ayrı bir widget olarak izole kalır.
    - Sidebar sabit genişlikte (220px); içerik paneli stretch.
    - Logout: AuthService.logout() çağrısı + logout_requested sinyali.
      main.py bu sinyali dinler ve LoginView'ı yeniden gösterir.

Mimari içindeki görevi:
    View katmanı — tüm alt view'ların container'ı.
    Navigasyon state'ini yönetir.
    AuthService.logout() üzerinden çıkış yapılır.
"""

from PySide6.QtWidgets import (
    QWidget,
    QHBoxLayout,
    QVBoxLayout,
    QLabel,
    QStackedWidget,
    QPushButton,
    QFrame,
    QSizePolicy,
    QSpacerItem,
)
from PySide6.QtCore import Qt, Signal
from PySide6.QtGui import QFont

from app.config.constants import Colors, FontSizes, Dimensions
from app.config.settings import settings
from app.services.auth_service import auth_service
from app.views.main.dashboard_view import DashboardView
from app.views.properties.property_list_view import PropertyListView


class SidebarButton(QPushButton):
    """
    Sol navigasyon sidebar'ındaki menü butonu.

    Args:
        text: Buton etiketi.
        icon: Emoji ikon.
        parent: Üst widget.
    """

    def __init__(self, text: str, icon: str, parent=None) -> None:
        super().__init__(f"  {icon}  {text}", parent)
        self.setCheckable(True)
        self.setCursor(Qt.CursorShape.PointingHandCursor)
        self.setFixedHeight(46)
        self._apply_style()

    def _apply_style(self) -> None:
        self.setStyleSheet(f"""
            QPushButton {{
                background-color: transparent;
                color: {Colors.TEXT_SECONDARY};
                border: none;
                border-radius: 8px;
                text-align: left;
                padding: 0 12px;
                font-size: {FontSizes.NORMAL}pt;
                font-weight: 500;
                margin: 1px 8px;
            }}
            QPushButton:hover {{
                background-color: {Colors.SURFACE_2};
                color: {Colors.TEXT_PRIMARY};
            }}
            QPushButton:checked {{
                background-color: {Colors.SIDEBAR_ACTIVE};
                color: {Colors.PRIMARY};
                font-weight: 700;
                border-left: 3px solid {Colors.PRIMARY};
            }}
        """)


class MainWindow(QWidget):
    """
    Ana uygulama penceresi.

    Sol sidebar + sağ içerik paneli.
    Navigasyon: Dashboard, İlanlar, Çıkış.

    Signals:
        logout_requested: Kullanıcı çıkış yaptığında yayılır.
    """

    logout_requested = Signal()

    def __init__(self) -> None:
        super().__init__()
        self.setWindowTitle(settings.app_name)
        self.setMinimumSize(
            Dimensions.WINDOW_MIN_WIDTH,
            Dimensions.WINDOW_MIN_HEIGHT,
        )
        self.resize(
            Dimensions.WINDOW_DEFAULT_WIDTH,
            Dimensions.WINDOW_DEFAULT_HEIGHT,
        )
        self.setStyleSheet(f"background-color: {Colors.BACKGROUND};")
        self._setup_ui()

    def _setup_ui(self) -> None:
        """Ana pencere UI bileşenlerini oluşturur."""
        main_layout = QHBoxLayout(self)
        main_layout.setContentsMargins(0, 0, 0, 0)
        main_layout.setSpacing(0)

        # ── Sol Sidebar ────────────────────────────────────────────────────
        sidebar = self._create_sidebar()
        main_layout.addWidget(sidebar)

        # ── Dikey Ayırıcı ──────────────────────────────────────────────────
        divider = QFrame()
        divider.setFrameShape(QFrame.Shape.VLine)
        divider.setFixedWidth(1)
        divider.setStyleSheet(f"background-color: {Colors.BORDER}; border: none;")
        main_layout.addWidget(divider)

        # ── İçerik Paneli ─────────────────────────────────────────────────
        self._stack = QStackedWidget()
        self._stack.setStyleSheet(f"background-color: {Colors.BACKGROUND};")

        self._dashboard_view = DashboardView()
        self._property_view = PropertyListView()

        self._stack.addWidget(self._dashboard_view)   # index 0
        self._stack.addWidget(self._property_view)    # index 1

        main_layout.addWidget(self._stack, stretch=1)

        # Dashboard aktif başlat
        self._navigate_to(0)

    def _create_sidebar(self) -> QWidget:
        """Sol navigasyon sidebar'ını oluşturur."""
        sidebar = QWidget()
        sidebar.setFixedWidth(Dimensions.SIDEBAR_WIDTH)
        sidebar.setStyleSheet(f"background-color: {Colors.SIDEBAR_BG};")

        layout = QVBoxLayout(sidebar)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(0)

        # ── Logo / Başlık ──────────────────────────────────────────────────
        logo_widget = QWidget()
        logo_widget.setFixedHeight(72)
        logo_widget.setStyleSheet(f"""
            QWidget {{
                background-color: {Colors.SIDEBAR_BG};
                border-bottom: 1px solid {Colors.BORDER};
            }}
        """)
        logo_layout = QHBoxLayout(logo_widget)
        logo_layout.setContentsMargins(16, 0, 16, 0)

        logo_icon = QLabel("🏠")
        logo_icon.setStyleSheet("font-size: 22pt; background: transparent; border: none;")
        logo_layout.addWidget(logo_icon)

        logo_text_layout = QVBoxLayout()
        app_name_label = QLabel("Gayrimenkul")
        app_name_label.setStyleSheet(f"""
            color: {Colors.TEXT_PRIMARY};
            font-size: {FontSizes.MEDIUM}pt;
            font-weight: 800;
            background: transparent;
            border: none;
            letter-spacing: -0.3px;
        """)
        logo_text_layout.addWidget(app_name_label)

        admin_label = QLabel("Admin Panel")
        admin_label.setStyleSheet(f"""
            color: {Colors.TEXT_MUTED};
            font-size: {FontSizes.TINY}pt;
            background: transparent;
            border: none;
        """)
        logo_text_layout.addWidget(admin_label)
        logo_layout.addLayout(logo_text_layout)
        layout.addWidget(logo_widget)

        # ── Navigasyon Başlığı ─────────────────────────────────────────────
        nav_title = QLabel("MENÜ")
        nav_title.setContentsMargins(20, 16, 0, 8)
        nav_title.setStyleSheet(f"""
            color: {Colors.TEXT_MUTED};
            font-size: {FontSizes.TINY}pt;
            font-weight: 700;
            letter-spacing: 1px;
            background: transparent;
        """)
        layout.addWidget(nav_title)

        # ── Menü Butonları ─────────────────────────────────────────────────
        self._dashboard_btn = SidebarButton("Dashboard", "📊")
        self._dashboard_btn.clicked.connect(lambda: self._navigate_to(0))
        layout.addWidget(self._dashboard_btn)

        self._properties_btn = SidebarButton("İlanlar", "🏠")
        self._properties_btn.clicked.connect(lambda: self._navigate_to(1))
        layout.addWidget(self._properties_btn)

        # ── Alt Alan — Kullanıcı Bilgisi + Çıkış ──────────────────────────
        layout.addStretch()

        bottom_divider = QFrame()
        bottom_divider.setFrameShape(QFrame.Shape.HLine)
        bottom_divider.setFixedHeight(1)
        bottom_divider.setStyleSheet(f"background-color: {Colors.BORDER}; border: none;")
        layout.addWidget(bottom_divider)

        # Kullanıcı bilgisi
        user = auth_service.get_current_user()
        if user:
            user_widget = QWidget()
            user_widget.setFixedHeight(60)
            user_widget.setStyleSheet("background: transparent;")
            user_layout = QHBoxLayout(user_widget)
            user_layout.setContentsMargins(16, 0, 16, 0)

            user_icon = QLabel("👤")
            user_icon.setStyleSheet("font-size: 18pt; background: transparent; border: none;")
            user_layout.addWidget(user_icon)

            user_text = QVBoxLayout()
            uname_label = QLabel(user.username)
            uname_label.setStyleSheet(f"""
                color: {Colors.TEXT_PRIMARY};
                font-size: {FontSizes.SMALL}pt;
                font-weight: 700;
                background: transparent;
                border: none;
            """)
            user_text.addWidget(uname_label)

            role_label = QLabel("Yönetici")
            role_label.setStyleSheet(f"""
                color: {Colors.TEXT_MUTED};
                font-size: {FontSizes.TINY}pt;
                background: transparent;
                border: none;
            """)
            user_text.addWidget(role_label)
            user_layout.addLayout(user_text)
            layout.addWidget(user_widget)

        # Çıkış butonu
        logout_btn = SidebarButton("Çıkış Yap", "🚪")
        logout_btn.clicked.connect(self._on_logout)
        layout.addWidget(logout_btn)

        layout.addSpacing(8)
        return sidebar

    def _nav_buttons(self) -> list[SidebarButton]:
        """Tüm navigasyon butonlarını döndürür."""
        return [self._dashboard_btn, self._properties_btn]

    def _navigate_to(self, index: int) -> None:
        """
        İlgili view'a geçiş yapar.

        Args:
            index: QStackedWidget index'i (0=Dashboard, 1=Properties).
        """
        self._stack.setCurrentIndex(index)

        # Buton state'lerini güncelle
        buttons = self._nav_buttons()
        for i, btn in enumerate(buttons):
            btn.setChecked(i == index)

        # Properties açıldığında verileri yenile
        if index == 1:
            self._property_view.load_data()

    def _on_logout(self) -> None:
        """Çıkış yapar ve login ekranına dönüş sinyali yayar."""
        auth_service.logout()
        self.logout_requested.emit()

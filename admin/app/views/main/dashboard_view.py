"""
app/views/main/dashboard_view.py
=================================
Amaç:
    Ana penceredeki Dashboard ekranı.
    Backend'den GET /api/v1/properties/stats ile istatistikleri çeker
    ve istatistik kartlarında gösterir.

Neden bu şekilde tasarlandı:
    - QThread ile arka planda veri çekilir; UI thread bloklanmaz.
    - StatCard widget'ı güncelleme destekli tasarlandı: set_value() metodu var.
    - Hata durumunda kartlar "—" gösterir, hata mesajı loglanır.
    - Yenile butonu ile manuel refresh yapılabilir.

Mimari içindeki görevi:
    View katmanı — PropertyService.get_stats() üzerinden backend'e bağlanır.
    MainWindow'un içindeki bir panel olarak çalışır.
"""

from PySide6.QtWidgets import (
    QWidget,
    QVBoxLayout,
    QHBoxLayout,
    QLabel,
    QFrame,
    QGridLayout,
)
from PySide6.QtCore import Qt, QThread, Signal, QObject

from app.config.constants import Colors, FontSizes
from app.services.auth_service import auth_service
from app.services.property_service import property_service
from app.models.property import PropertyStats
from app.api.exceptions import ApiException
from app.widgets.styled_button import StyledButton


# ─── Stats Worker Thread ──────────────────────────────────────────────────────

class StatsWorker(QObject):
    """
    İstatistikleri arka planda yükleyen worker.

    Signals:
        data_loaded: İstatistikler başarıyla yüklendi.
        error_occurred: Yükleme sırasında hata oluştu.
    """

    data_loaded = Signal(object)    # PropertyStats
    error_occurred = Signal(str)    # hata mesajı

    def run(self) -> None:
        """Backend'den stats çeker."""
        try:
            stats = property_service.get_stats()
            self.data_loaded.emit(stats)
        except ApiException as e:
            self.error_occurred.emit(e.message)
        except Exception as e:
            self.error_occurred.emit(str(e))


# ─── StatCard ─────────────────────────────────────────────────────────────────

class StatCard(QFrame):
    """
    Güncellenebilir istatistik kartı.

    Args:
        title: Kart başlığı.
        icon: Emoji ikon.
        color: Sol kenarlık rengi.
    """

    def __init__(self, title: str, icon: str, color: str) -> None:
        super().__init__()
        self.setFixedHeight(100)
        self.setStyleSheet(f"""
            QFrame {{
                background-color: {Colors.SURFACE_2};
                border: 1px solid {Colors.BORDER};
                border-radius: 12px;
                border-left: 4px solid {color};
            }}
        """)
        layout = QHBoxLayout(self)
        layout.setContentsMargins(16, 16, 16, 16)

        # İkon
        icon_label = QLabel(icon)
        icon_label.setStyleSheet("""
            font-size: 28pt;
            background: transparent;
            border: none;
        """)
        layout.addWidget(icon_label)
        layout.addSpacing(12)

        # Metin
        text_layout = QVBoxLayout()

        self._val_label = QLabel("—")
        self._val_label.setStyleSheet(f"""
            color: {Colors.TEXT_PRIMARY};
            font-size: {FontSizes.XLARGE}pt;
            font-weight: 800;
            background: transparent;
            border: none;
        """)
        text_layout.addWidget(self._val_label)

        title_label = QLabel(title)
        title_label.setStyleSheet(f"""
            color: {Colors.TEXT_MUTED};
            font-size: {FontSizes.SMALL}pt;
            background: transparent;
            border: none;
        """)
        text_layout.addWidget(title_label)
        layout.addLayout(text_layout)
        layout.addStretch()

    def set_value(self, value: int | str) -> None:
        """Kart değerini günceller."""
        self._val_label.setText(str(value))

    def set_loading(self) -> None:
        """Yükleniyor durumuna geçer."""
        self._val_label.setText("...")

    def set_error(self) -> None:
        """Hata durumuna geçer."""
        self._val_label.setText("—")


# ─── DashboardView ────────────────────────────────────────────────────────────

class DashboardView(QWidget):
    """
    Dashboard ekranı — gerçek istatistikleri backend'den çeker.

    İstatistik kartları:
        - Toplam İlan       (soft-delete olmayan)
        - Yayındaki İlan    (isPublished = true)
        - Taslak İlan       (isPublished = false)
        - Silinen İlan      (deletedAt IS NOT NULL)
    """

    def __init__(self) -> None:
        super().__init__()
        self.setStyleSheet(f"background-color: {Colors.BACKGROUND};")
        self._thread: QThread | None = None
        self._worker: StatsWorker | None = None
        self._setup_ui()
        self.load_stats()

    def _setup_ui(self) -> None:
        layout = QVBoxLayout(self)
        layout.setContentsMargins(32, 32, 32, 32)
        layout.setSpacing(24)

        # ── Karşılama + Yenile Butonu ──────────────────────────────────────
        header_row = QHBoxLayout()

        user = auth_service.get_current_user()
        username = user.username if user else "Kullanıcı"

        welcome_label = QLabel(f"Merhaba, {username} 👋")
        welcome_label.setStyleSheet(f"""
            color: {Colors.TEXT_PRIMARY};
            font-size: {FontSizes.XLARGE}pt;
            font-weight: 800;
            background: transparent;
        """)
        header_row.addWidget(welcome_label)
        header_row.addStretch()

        self._refresh_btn = StyledButton("↻  Yenile", variant="ghost", small=True)
        self._refresh_btn.setMinimumWidth(90)
        self._refresh_btn.clicked.connect(self.load_stats)
        header_row.addWidget(self._refresh_btn)

        layout.addLayout(header_row)

        subtitle = QLabel("Gayrimenkul Yönetim Panelinize Hoş Geldiniz")
        subtitle.setStyleSheet(f"""
            color: {Colors.TEXT_MUTED};
            font-size: {FontSizes.NORMAL}pt;
            background: transparent;
        """)
        layout.addWidget(subtitle)

        # ── İstatistik Kartları ────────────────────────────────────────────
        cards_grid = QGridLayout()
        cards_grid.setSpacing(16)

        self._card_total = StatCard("Toplam İlan", "🏠", Colors.PRIMARY)
        self._card_published = StatCard("Yayındaki İlan", "✅", Colors.SUCCESS)
        self._card_unpublished = StatCard("Taslak İlan", "📝", Colors.WARNING)
        self._card_deleted = StatCard("Silinen İlan", "🗑️", Colors.DANGER)

        cards_grid.addWidget(self._card_total, 0, 0)
        cards_grid.addWidget(self._card_published, 0, 1)
        cards_grid.addWidget(self._card_unpublished, 0, 2)
        cards_grid.addWidget(self._card_deleted, 0, 3)

        layout.addLayout(cards_grid)

        # ── Hata / Durum Mesajı ────────────────────────────────────────────
        self._status_label = QLabel("")
        self._status_label.setStyleSheet(f"""
            color: {Colors.TEXT_MUTED};
            font-size: {FontSizes.SMALL}pt;
            background: transparent;
        """)
        self._status_label.hide()
        layout.addWidget(self._status_label)

        # ── Bilgi Notu ─────────────────────────────────────────────────────
        info_frame = QFrame()
        info_frame.setStyleSheet(f"""
            QFrame {{
                background-color: {Colors.SURFACE};
                border: 1px solid {Colors.BORDER};
                border-radius: 12px;
            }}
        """)
        info_layout = QVBoxLayout(info_frame)
        info_layout.setContentsMargins(20, 20, 20, 20)

        info_title = QLabel("📊 Hızlı Özet")
        info_title.setStyleSheet(f"""
            color: {Colors.TEXT_SECONDARY};
            font-size: {FontSizes.MEDIUM}pt;
            font-weight: 700;
            background: transparent;
        """)
        info_layout.addWidget(info_title)

        self._summary_label = QLabel("İstatistikler yükleniyor...")
        self._summary_label.setStyleSheet(f"""
            color: {Colors.TEXT_MUTED};
            font-size: {FontSizes.NORMAL}pt;
            line-height: 1.8;
            background: transparent;
        """)
        info_layout.addWidget(self._summary_label)
        layout.addWidget(info_frame)

        layout.addStretch()

    def load_stats(self) -> None:
        """
        İstatistikleri backend'den arka planda yükler.

        QThread kullanarak UI thread bloklanmaz.
        Yükleme sırasında kartlar "..." gösterir.
        """
        self._set_loading()

        # Önceki thread'i temizle
        if self._thread and self._thread.isRunning():
            self._thread.quit()
            self._thread.wait()

        self._thread = QThread()
        self._worker = StatsWorker()
        self._worker.moveToThread(self._thread)

        self._thread.started.connect(self._worker.run)
        self._worker.data_loaded.connect(self._on_stats_loaded)
        self._worker.error_occurred.connect(self._on_stats_error)
        self._worker.data_loaded.connect(self._thread.quit)
        self._worker.error_occurred.connect(self._thread.quit)

        self._refresh_btn.setEnabled(False)
        self._thread.start()

    def _on_stats_loaded(self, stats: PropertyStats) -> None:
        """İstatistikler yüklenince kartları günceller."""
        self._card_total.set_value(stats.total)
        self._card_published.set_value(stats.published)
        self._card_unpublished.set_value(stats.unpublished)
        self._card_deleted.set_value(stats.deleted)

        # Yayın oranı hesapla
        rate = 0
        if stats.total > 0:
            rate = round((stats.published / stats.total) * 100)

        self._summary_label.setText(
            f"Toplam {stats.total} aktif ilan bulunuyor.\n"
            f"• {stats.published} ilan yayında ({rate}%)\n"
            f"• {stats.unpublished} ilan taslak durumunda\n"
            f"• {stats.deleted} ilan silinmiş (veritabanında tutuluyor)"
        )

        self._status_label.hide()
        self._refresh_btn.setEnabled(True)

    def _on_stats_error(self, message: str) -> None:
        """Yükleme hatası."""
        self._card_total.set_error()
        self._card_published.set_error()
        self._card_unpublished.set_error()
        self._card_deleted.set_error()

        self._status_label.setText(f"⚠ Veriler yüklenemedi: {message}")
        self._status_label.show()
        self._summary_label.setText("İstatistikler alınamadı.")
        self._refresh_btn.setEnabled(True)

    def _set_loading(self) -> None:
        """Tüm kartları yükleniyor moduna geçirir."""
        self._card_total.set_loading()
        self._card_published.set_loading()
        self._card_unpublished.set_loading()
        self._card_deleted.set_loading()
        self._summary_label.setText("İstatistikler yükleniyor...")

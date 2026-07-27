"""
app/dialogs/draft_restore_dialog.py
=====================================
Amaç:
    Kullanıcı Yeni İlan Oluştur penceresini açtığında
    kaydedilmemiş bir taslak mevcutsa gösterilen seçim dialogu.

    Kullanıcıya iki seçenek sunar:
      - Taslağı Geri Yükle  → dialog.exec() == QDialog.DialogCode.Accepted
      - Yeni İlan Oluştur   → dialog.exec() == QDialog.DialogCode.Rejected
                              (taslak bu seçimde silinir)

Neden bu şekilde tasarlandı:
    - Karar mantığı (restore/delete) bu dialog'da değil,
      çağıran PropertyCreateDialog'da yönetilir.
    - QDialog.exec() dönüş değeriyle iki dal ayrılır; özel signal
      eklenmez, standart Qt yaklaşımı kullanılır.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from PySide6.QtWidgets import (
    QDialog,
    QVBoxLayout,
    QHBoxLayout,
    QLabel,
    QWidget,
)
from PySide6.QtCore import Qt

from app.config.constants import Colors, FontSizes
from app.widgets.styled_button import StyledButton


class DraftRestoreDialog(QDialog):
    """
    Taslak bulunduğunda açılan seçim dialogu.

    Kabul (Accepted)  → Taslağı geri yükle
    Red    (Rejected) → Yeni ilan oluştur (taslak silinir)
    """

    def __init__(
        self,
        last_saved_at: Optional[str] = None,
        parent: Optional[QWidget] = None,
    ) -> None:
        """
        Args:
            last_saved_at: ISO 8601 formatında taslak kayıt zamanı.
                           None veya parse edilemezse gösterilmez.
            parent:        Ebeveyn widget.
        """
        super().__init__(parent)
        self.setWindowTitle("Kaydedilmemiş Taslak Bulundu")
        self.setModal(True)
        self.setFixedWidth(440)
        self.setStyleSheet(f"""
            QDialog {{
                background-color: {Colors.BACKGROUND};
            }}
            QLabel {{
                color: {Colors.TEXT_PRIMARY};
                background: transparent;
                border: none;
            }}
        """)

        self._last_saved_at = self._parse_datetime(last_saved_at)
        self._setup_ui()

    # ─── Kurulum ──────────────────────────────────────────────────────────────

    def _setup_ui(self) -> None:
        """Dialog içeriğini oluşturur."""
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(0)

        # ── Başlık Alanı ──────────────────────────────────────────────────
        header = QWidget()
        header.setStyleSheet(f"""
            QWidget {{
                background-color: {Colors.SURFACE};
                border-bottom: 1px solid {Colors.BORDER};
            }}
        """)
        header_layout = QVBoxLayout(header)
        header_layout.setContentsMargins(28, 24, 28, 20)
        header_layout.setSpacing(8)

        icon_label = QLabel("📄")
        icon_label.setStyleSheet(f"font-size: 32pt; background: transparent; border: none;")
        icon_label.setAlignment(Qt.AlignmentFlag.AlignLeft)
        header_layout.addWidget(icon_label)

        title_label = QLabel("Kaydedilmemiş Taslak Bulundu")
        title_label.setStyleSheet(f"""
            color: {Colors.TEXT_PRIMARY};
            font-size: {FontSizes.LARGE}pt;
            font-weight: 700;
        """)
        header_layout.addWidget(title_label)

        layout.addWidget(header)

        # ── İçerik Alanı ──────────────────────────────────────────────────
        body = QWidget()
        body.setStyleSheet(f"background-color: {Colors.BACKGROUND};")
        body_layout = QVBoxLayout(body)
        body_layout.setContentsMargins(28, 20, 28, 20)
        body_layout.setSpacing(12)

        desc_label = QLabel(
            "Önceki oturumda tamamlanmamış bir ilan taslağı bulundu.\n"
            "Ne yapmak istiyorsunuz?"
        )
        desc_label.setWordWrap(True)
        desc_label.setStyleSheet(f"""
            color: {Colors.TEXT_SECONDARY};
            font-size: {FontSizes.NORMAL}pt;
            line-height: 1.5;
        """)
        body_layout.addWidget(desc_label)

        # Son Kaydedilme bilgisi
        if self._last_saved_at:
            saved_label = QLabel(f"🕐  Son Kaydedilme: {self._last_saved_at}")
            saved_label.setStyleSheet(f"""
                color: {Colors.TEXT_MUTED};
                font-size: {FontSizes.SMALL}pt;
                background-color: {Colors.SURFACE};
                border: 1px solid {Colors.BORDER};
                border-radius: 6px;
                padding: 8px 12px;
            """)
            body_layout.addWidget(saved_label)

        layout.addWidget(body)

        # ── Alt Butonlar ──────────────────────────────────────────────────
        footer = QWidget()
        footer.setStyleSheet(f"""
            QWidget {{
                background-color: {Colors.SURFACE};
                border-top: 1px solid {Colors.BORDER};
            }}
        """)
        footer_layout = QHBoxLayout(footer)
        footer_layout.setContentsMargins(28, 16, 28, 16)
        footer_layout.setSpacing(12)

        # Yeni İlan Oluştur — taslağı sil, boş form aç
        new_btn = StyledButton("🗑  Yeni İlan Oluştur", variant="ghost")
        new_btn.setMinimumWidth(170)
        new_btn.setToolTip("Mevcut taslak silinir ve boş form açılır")
        new_btn.clicked.connect(self.reject)
        footer_layout.addWidget(new_btn)

        footer_layout.addStretch()

        # Taslağı Geri Yükle — form doldurulur
        restore_btn = StyledButton("↩  Taslağı Geri Yükle", variant="primary")
        restore_btn.setMinimumWidth(170)
        restore_btn.setToolTip("Taslak form alanlarına yüklenir")
        restore_btn.clicked.connect(self.accept)
        footer_layout.addWidget(restore_btn)

        layout.addWidget(footer)

    # ─── Yardımcı ─────────────────────────────────────────────────────────────

    @staticmethod
    def _parse_datetime(raw: Optional[str]) -> Optional[str]:
        """
        ISO 8601 string'ini kullanıcı dostu yerel saat formatına çevirir.

        Parse başarısız olursa None döndürür; dialog yine de açılır.

        Args:
            raw: ISO 8601 string (ör. "2026-07-27T08:18:00+00:00").

        Returns:
            "27.07.2026 11:18" gibi yerel saat string'i veya None.
        """
        if not raw:
            return None
        try:
            dt_utc = datetime.fromisoformat(raw)
            # UTC → yerel saat
            dt_local = dt_utc.astimezone()
            return dt_local.strftime("%d.%m.%Y %H:%M")
        except (ValueError, TypeError):
            return None

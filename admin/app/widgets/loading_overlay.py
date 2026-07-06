"""
app/widgets/loading_overlay.py
===============================
Amaç:
    API çağrıları süresince ekranı kaplayan yükleme göstergesi.
    Kullanıcının çift tıklama ile beklenmedik işlemler tetiklemesini engeller.

Neden bu şekilde tasarlandı:
    - Yarı saydam overlay: kullanıcı arka planı görebilir ama etkileşime giremez.
    - Ana pencereye parent olarak set edilir; boyutu dinamik güncellenir.
    - show() / hide() ile toggle edilir.

Mimari içindeki görevi:
    Widget katmanı — View'lar uzun süren işlemlerde bu overlay'i gösterir.
"""

from PySide6.QtWidgets import QWidget, QVBoxLayout, QLabel
from PySide6.QtCore import Qt
from PySide6.QtGui import QColor

from app.config.constants import Colors


class LoadingOverlay(QWidget):
    """
    Yarı saydam yükleme göstergesi overlay'i.

    Args:
        parent: Üst widget (boyutu eşleştirilir).
        message: Gösterilecek yükleme mesajı.
    """

    def __init__(self, parent: QWidget, message: str = "Yükleniyor...") -> None:
        super().__init__(parent)
        self.setGeometry(parent.rect())
        self.setWindowFlags(Qt.WindowType.FramelessWindowHint)
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)

        layout = QVBoxLayout(self)
        layout.setAlignment(Qt.AlignmentFlag.AlignCenter)

        # Arka plan panel
        container = QWidget()
        container.setFixedSize(220, 90)
        container.setStyleSheet(f"""
            QWidget {{
                background-color: {Colors.SURFACE};
                border: 1px solid {Colors.BORDER};
                border-radius: 12px;
            }}
        """)

        container_layout = QVBoxLayout(container)
        container_layout.setAlignment(Qt.AlignmentFlag.AlignCenter)

        self._label = QLabel(message)
        self._label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self._label.setStyleSheet(f"""
            QLabel {{
                color: {Colors.TEXT_PRIMARY};
                font-size: 12pt;
                font-weight: 600;
                background: transparent;
                border: none;
            }}
        """)
        container_layout.addWidget(self._label)

        layout.addWidget(container)
        self.hide()

    def set_message(self, message: str) -> None:
        """Yükleme mesajını günceller."""
        self._label.setText(message)

    def resizeEvent(self, event) -> None:
        """Parent resize olduğunda overlay'in boyutunu güncelle."""
        if self.parent():
            self.setGeometry(self.parent().rect())  # type: ignore
        super().resizeEvent(event)

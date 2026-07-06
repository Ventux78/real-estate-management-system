"""
app/widgets/styled_button.py
============================
Amaç:
    Uygulamada tutarlı görünüm için özelleştirilmiş QPushButton sınıfı.
    Primary, secondary, danger ve success variant'ları destekler.

Neden bu şekilde tasarlandı:
    - Tüm butonlar tek sınıftan türer → görünüm değişikliği tek yerden yapılır.
    - Variant parametresi ile farklı buton türleri kolayca oluşturulur.
    - Magic string ve inline style tekrarından kaçınılır.

Mimari içindeki görevi:
    Widget katmanı — View dosyaları bu widget'ları kullanır.
    Görünüm mantığı View içinde tekrar edilmez.
"""

from PySide6.QtWidgets import QPushButton
from PySide6.QtCore import Qt, QSize
from PySide6.QtGui import QCursor

from app.config.constants import Colors, Dimensions


class StyledButton(QPushButton):
    """
    Uygulama genelinde kullanılan özelleştirilmiş buton.

    Args:
        text: Buton etiketi.
        variant: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost'
        small: True ise küçük buton boyutu.
        parent: Üst widget.
    """

    def __init__(
        self,
        text: str = "",
        variant: str = "primary",
        small: bool = False,
        parent=None,
    ) -> None:
        super().__init__(text, parent)
        self._variant = variant
        self._small = small
        self._apply_style()
        self.setCursor(QCursor(Qt.CursorShape.PointingHandCursor))

    def _apply_style(self) -> None:
        """Variant'a göre stylesheet uygular."""
        height = 28 if self._small else Dimensions.BUTTON_HEIGHT
        padding = "4px 10px" if self._small else "6px 18px"
        font_size = 10 if self._small else 11
        radius = 6

        base_style = f"""
            QPushButton {{
                height: {height}px;
                padding: {padding};
                font-size: {font_size}pt;
                font-weight: 600;
                border-radius: {radius}px;
                border: none;
                letter-spacing: 0.2px;
            }}
            QPushButton:disabled {{
                opacity: 0.5;
            }}
        """

        variant_styles = {
            "primary": f"""
                QPushButton {{
                    background-color: {Colors.PRIMARY};
                    color: #FFFFFF;
                }}
                QPushButton:hover {{
                    background-color: {Colors.PRIMARY_DARK};
                }}
                QPushButton:pressed {{
                    background-color: #1e40af;
                }}
            """,
            "secondary": f"""
                QPushButton {{
                    background-color: {Colors.SURFACE_2};
                    color: {Colors.TEXT_PRIMARY};
                    border: 1px solid {Colors.BORDER};
                }}
                QPushButton:hover {{
                    background-color: {Colors.BORDER};
                }}
                QPushButton:pressed {{
                    background-color: {Colors.SURFACE_2};
                }}
            """,
            "danger": f"""
                QPushButton {{
                    background-color: {Colors.DANGER};
                    color: #FFFFFF;
                }}
                QPushButton:hover {{
                    background-color: #b91c1c;
                }}
                QPushButton:pressed {{
                    background-color: #991b1b;
                }}
            """,
            "success": f"""
                QPushButton {{
                    background-color: {Colors.SUCCESS};
                    color: #FFFFFF;
                }}
                QPushButton:hover {{
                    background-color: #15803d;
                }}
                QPushButton:pressed {{
                    background-color: #166534;
                }}
            """,
            "ghost": f"""
                QPushButton {{
                    background-color: transparent;
                    color: {Colors.TEXT_SECONDARY};
                    border: 1px solid {Colors.BORDER};
                }}
                QPushButton:hover {{
                    color: {Colors.TEXT_PRIMARY};
                    border-color: {Colors.TEXT_SECONDARY};
                    background-color: {Colors.SURFACE};
                }}
            """,
            "warning": f"""
                QPushButton {{
                    background-color: {Colors.WARNING};
                    color: #FFFFFF;
                }}
                QPushButton:hover {{
                    background-color: #b45309;
                }}
                QPushButton:pressed {{
                    background-color: #92400e;
                }}
            """,
        }

        variant_style = variant_styles.get(self._variant, variant_styles["primary"])
        self.setStyleSheet(base_style + variant_style)

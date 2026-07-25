"""
app/dialogs/property_detail_dialog.py
======================================
Amaç:
    Seçilen ilan detaylarını salt okunur (read-only) ve güzel bir düzenle gösteren önizleme penceresi.
"""

from PySide6.QtWidgets import (
    QDialog,
    QVBoxLayout,
    QHBoxLayout,
    QLabel,
    QWidget,
    QScrollArea,
    QFrame,
    QGridLayout,
)
from PySide6.QtCore import Qt
from PySide6.QtGui import QFont

from app.models.property import Property
from app.config.constants import Colors, FontSizes, ListingType, PropertyType
from app.widgets.styled_button import StyledButton
from app.utils.formatters import format_price


class PropertyDetailDialog(QDialog):
    """İlan detaylarını gösteren önizleme penceresi."""

    def __init__(self, property_data: Property, parent=None) -> None:
        super().__init__(parent)
        self.property = property_data
        
        self.setWindowTitle(f"İlan Detayları: {self.property.title}")
        self.setModal(True)
        self.setMinimumWidth(680)
        self.setMinimumHeight(650)
        self.setStyleSheet(f"""
            QDialog {{
                background-color: {Colors.BACKGROUND};
            }}
            QLabel {{
                color: {Colors.TEXT_PRIMARY};
            }}
            QScrollArea {{
                border: none;
                background-color: transparent;
            }}
        """)
        
        self._setup_ui()

    def _setup_ui(self) -> None:
        main_layout = QVBoxLayout(self)
        main_layout.setSpacing(0)
        main_layout.setContentsMargins(0, 0, 0, 0)

        # ── Üst Başlık Banner'ı ──────────────────────────────────────────────
        header = QWidget()
        header.setFixedHeight(64)
        header.setStyleSheet(f"""
            QWidget {{
                background-color: {Colors.PRIMARY};
                border-bottom: 1px solid {Colors.BORDER};
            }}
        """)
        header_layout = QHBoxLayout(header)
        header_layout.setContentsMargins(24, 0, 24, 0)

        title_label = QLabel(f"🏠 {self.property.title}")
        title_label.setStyleSheet(f"""
            color: white;
            font-size: {FontSizes.LARGE}pt;
            font-weight: 700;
            background: transparent;
        """)
        header_layout.addWidget(title_label)
        header_layout.addStretch()
        main_layout.addWidget(header)

        # ── Kaydırılabilir Gövde Alanı ─────────────────────────────────────────
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)
        
        container = QWidget()
        container.setStyleSheet(f"background-color: {Colors.SURFACE};")
        layout = QVBoxLayout(container)
        layout.setSpacing(24)
        layout.setContentsMargins(24, 24, 24, 24)

        # ── 1. TEMEL BİLGİLER ──────────────────────────────────────────────────
        self._add_section_title(layout, "TEMEL BİLGİLER")
        basic_grid = QGridLayout()
        basic_grid.setSpacing(14)
        
        # Yayın Durumu
        status_text = "✓ Yayında" if self.property.is_published else "✕ Yayında Değil"
        status_color = Colors.SUCCESS if self.property.is_published else Colors.TEXT_MUTED
        self._add_grid_row(basic_grid, 0, 0, "İlan Durumu:", status_text, value_color=status_color, is_bold=True)
        
        # İlan Tipi
        listing_type_display = "Satılık" if self.property.listing_type == "FOR_SALE" else "Kiralık"
        self._add_grid_row(basic_grid, 0, 1, "İlan Tipi:", listing_type_display)
        
        # Mülk Tipi
        try:
            pt = PropertyType(self.property.property_type)
            pt_display = pt.display()
        except Exception:
            pt_display = self.property.property_type
        self._add_grid_row(basic_grid, 1, 0, "Mülk Tipi:", pt_display)
        
        # Fiyat
        self._add_grid_row(basic_grid, 1, 1, "Fiyat:", format_price(self.property.price), is_bold=True)
        
        layout.addLayout(basic_grid)

        # ── 2. KONUM ──────────────────────────────────────────────────────────
        self._add_section_title(layout, "KONUM")
        loc_grid = QGridLayout()
        loc_grid.setSpacing(14)
        
        self._add_grid_row(loc_grid, 0, 0, "Şehir:", self.property.city)
        self._add_grid_row(loc_grid, 0, 1, "İlçe:", self.property.district)
        self._add_grid_row(loc_grid, 1, 0, "Mahalle:", self.property.neighborhood or "—")
        self._add_grid_row(loc_grid, 1, 1, "Adres:", self.property.address)
        
        # Enlem / Boylam
        lat_val = f"{self.property.latitude}" if self.property.latitude is not None else "—"
        lon_val = f"{self.property.longitude}" if self.property.longitude is not None else "—"
        self._add_grid_row(loc_grid, 2, 0, "Enlem (Lat):", lat_val)
        self._add_grid_row(loc_grid, 2, 1, "Boylam (Lon):", lon_val)
        
        layout.addLayout(loc_grid)

        # ── 3. AÇIKLAMA ────────────────────────────────────────────────────────
        self._add_section_title(layout, "AÇIKLAMA")
        desc_label = QLabel(self.property.description or "Açıklama girilmemiş.")
        desc_label.setWordWrap(True)
        desc_label.setStyleSheet(f"""
            color: {Colors.TEXT_PRIMARY};
            font-size: {FontSizes.NORMAL}pt;
            background-color: {Colors.SURFACE_2};
            border-radius: 6px;
            padding: 12px;
        """)
        layout.addWidget(desc_label)

        # ── 4. KONUT DETAYLARI ─────────────────────────────────────────────────
        self._add_section_title(layout, "KONUT DETAYLARI")
        details_grid = QGridLayout()
        details_grid.setSpacing(14)
        
        self._add_grid_row(details_grid, 0, 0, "Brüt Alan:", f"{self.property.gross_area} m²" if self.property.gross_area is not None else "—")
        self._add_grid_row(details_grid, 0, 1, "Net Alan:", f"{self.property.net_area} m²" if self.property.net_area is not None else "—")
        
        self._add_grid_row(details_grid, 1, 0, "Oda Sayısı:", f"{self.property.room_count}" if self.property.room_count is not None else "—")
        self._add_grid_row(details_grid, 1, 1, "Salon Sayısı:", f"{self.property.living_room_count}" if self.property.living_room_count is not None else "—")
        
        self._add_grid_row(details_grid, 2, 0, "Banyo Sayısı:", f"{self.property.bathroom_count}" if self.property.bathroom_count is not None else "—")
        self._add_grid_row(details_grid, 2, 1, "Bulunduğu Kat:", f"{self.property.floor}" if self.property.floor is not None else "—")
        
        self._add_grid_row(details_grid, 3, 0, "Toplam Kat:", f"{self.property.total_floor}" if self.property.total_floor is not None else "—")
        self._add_grid_row(details_grid, 3, 1, "Bina Yaşı:", f"{self.property.building_age}" if self.property.building_age is not None else "—")
        
        # Isıtma Tipi Eşleme
        heating_map = {
            "NATURAL_GAS": "Doğalgaz",
            "ELECTRIC": "Elektrik",
            "FLOOR_HEATING": "Yerden Isıtma",
            "COAL": "Kömür / Soba",
            "NONE": "Yok",
            "OTHER": "Diğer"
        }
        heating_val = heating_map.get(self.property.heating_type, self.property.heating_type) if self.property.heating_type else "—"
        self._add_grid_row(details_grid, 4, 0, "Isıtma:", heating_val)
        
        # Aidat
        dues_val = f"{self.property.dues} ₺" if self.property.dues is not None else "—"
        self._add_grid_row(details_grid, 4, 1, "Aidat:", dues_val)
        
        # Tapu Durumu Eşleme
        deed_map = {
            "FREEHOLD": "Kat İrtifakı",
            "CONDOMINIUM": "Kat Mülkiyeti",
            "FLOOR_EASEMENT": "Kat İrtifakı",
            "SHARED": "Hisseli Tapu",
            "OTHER": "Diğer"
        }
        deed_val = deed_map.get(self.property.deed_status, self.property.deed_status) if self.property.deed_status else "—"
        self._add_grid_row(details_grid, 5, 0, "Tapu Durumu:", deed_val)
        
        layout.addLayout(details_grid)

        # ── 5. ÖZELLİKLER ──────────────────────────────────────────────────────
        self._add_section_title(layout, "İLAN ÖZELLİKLERİ")
        features_layout = QGridLayout()
        features_layout.setSpacing(10)
        
        features_list = [
            ("Eşyalı", self.property.furnished),
            ("Balkon", self.property.balcony),
            ("Asansör", self.property.elevator),
            ("Otopark / Garaj", self.property.parking),
            ("Krediye Uygun", self.property.eligible_for_credit),
            ("Takas Yapılabilir", self.property.exchange_available),
            ("Öne Çıkan İlan", self.property.is_featured),
        ]
        
        row = 0
        col = 0
        for name, is_active in features_list:
            status_symbol = "✓" if is_active else "✕"
            status_color = Colors.SUCCESS if is_active else Colors.TEXT_MUTED
            
            lbl_symbol = QLabel(status_symbol)
            lbl_symbol.setStyleSheet(f"color: {status_color}; font-weight: bold; font-size: {FontSizes.MEDIUM}pt;")
            lbl_text = QLabel(name)
            lbl_text.setStyleSheet(f"color: {Colors.TEXT_PRIMARY if is_active else Colors.TEXT_MUTED}; font-size: {FontSizes.NORMAL}pt;")
            
            item_widget = QWidget()
            item_layout = QHBoxLayout(item_widget)
            item_layout.setContentsMargins(0, 0, 0, 0)
            item_layout.setSpacing(8)
            item_layout.addWidget(lbl_symbol)
            item_layout.addWidget(lbl_text)
            item_layout.addStretch()
            
            features_layout.addWidget(item_widget, row, col)
            col += 1
            if col > 1:
                col = 0
                row += 1
                
        layout.addLayout(features_layout)

        layout.addStretch()
        scroll.setWidget(container)
        main_layout.addWidget(scroll)

        # ── Alt Buton (Kapat) ────────────────────────────────────────────────
        footer = QWidget()
        footer.setFixedHeight(68)
        footer.setStyleSheet(f"""
            QWidget {{
                background-color: {Colors.BACKGROUND};
                border-top: 1px solid {Colors.BORDER};
            }}
        """)
        footer_layout = QHBoxLayout(footer)
        footer_layout.setContentsMargins(24, 0, 24, 0)
        footer_layout.addStretch()

        close_btn = StyledButton("Kapat", variant="secondary")
        close_btn.setMinimumWidth(100)
        close_btn.clicked.connect(self.accept)
        footer_layout.addWidget(close_btn)

        main_layout.addWidget(footer)

    def _add_section_title(self, layout: QVBoxLayout, title: str) -> None:
        """Bölüm başlığı ekler."""
        label = QLabel(title)
        label.setStyleSheet(f"""
            color: {Colors.TEXT_MUTED};
            font-size: {FontSizes.SMALL}pt;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            padding-top: 8px;
            border-bottom: 1px solid {Colors.BORDER};
            padding-bottom: 8px;
        """)
        layout.addWidget(label)

    def _add_grid_row(
        self,
        grid: QGridLayout,
        row: int,
        col: int,
        label_text: str,
        value_text: str,
        value_color: str | None = None,
        is_bold: bool = False,
    ) -> None:
        """Görseldeki gibi Grid düzenine İsim-Değer çifti ekler."""
        container = QWidget()
        layout = QHBoxLayout(container)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(10)

        lbl = QLabel(label_text)
        lbl.setStyleSheet(f"color: {Colors.TEXT_SECONDARY}; font-size: {FontSizes.NORMAL}pt; font-weight: 600;")
        lbl.setFixedWidth(130)
        
        val = QLabel(value_text)
        val_style = f"font-size: {FontSizes.NORMAL}pt;"
        if value_color:
            val_style += f" color: {value_color};"
        else:
            val_style += f" color: {Colors.TEXT_PRIMARY};"
        if is_bold:
            val_style += " font-weight: bold;"
        val.setStyleSheet(val_style)

        layout.addWidget(lbl)
        layout.addWidget(val)
        layout.addStretch()

        grid.addWidget(container, row, col)

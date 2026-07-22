"""
app/dialogs/property_create_dialog.py
======================================
Amaç:
    Yeni gayrimenkul ilanı oluşturma formu dialog'u.
    Kullanıcı formu sekmeli yapıda doldurup kaydet butonuna bastığında
    POST /api/v1/properties çağrısı yapılır.
"""

import webbrowser
from typing import Any
from PySide6.QtWidgets import (
    QDialog,
    QVBoxLayout,
    QHBoxLayout,
    QLabel,
    QWidget,
    QScrollArea,
    QFrame,
    QRadioButton,
    QButtonGroup,
    QTabWidget,
    QCheckBox,
    QGridLayout,
)
from PySide6.QtCore import Qt, Signal

from app.services.property_service import property_service
from app.services.location_service import location_service
from app.services.maps_url_service import maps_url_service
from app.models.property import CreatePropertyRequest
from app.api.exceptions import ApiException
from app.config.constants import Colors, FontSizes, ListingType, PropertyType
from app.widgets.styled_button import StyledButton
from app.widgets.styled_input import StyledLineEdit, StyledComboBox, SearchableComboBox, StyledTextEdit
from app.utils.validators import validate_create_property_form
from app.dialogs.error_dialog import ErrorDialog


def safe_float(val_str: str) -> float | None:
    if not val_str or not val_str.strip():
        return None
    try:
        return float(val_str.replace(",", "."))
    except ValueError:
        return None


def safe_int(val_str: str) -> int | None:
    if not val_str or not val_str.strip():
        return None
    try:
        return int(val_str)
    except ValueError:
        return None


class PropertyCreateDialog(QDialog):
    """
    Yeni ilan oluşturma dialog'u (Sekmeli Yapı).

    Signals:
        property_created: Oluşturma başarılı olduğunda yayılır.
    """

    property_created = Signal()

    def __init__(self, parent=None) -> None:
        super().__init__(parent)
        self.setWindowTitle("Yeni İlan Oluştur")
        self.setModal(True)
        self.setMinimumWidth(720)
        self.setMinimumHeight(600)
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
        self._update_auto_map_url()

    def _setup_ui(self) -> None:
        """Dialog UI bileşenlerini oluşturur."""
        main_layout = QVBoxLayout(self)
        main_layout.setSpacing(0)
        main_layout.setContentsMargins(0, 0, 0, 0)

        # ── Başlık Çubuğu ──────────────────────────────────────────────────
        header = QWidget()
        header.setFixedHeight(64)
        header.setStyleSheet(f"""
            QWidget {{
                background-color: {Colors.BACKGROUND};
                border-bottom: 1px solid {Colors.BORDER};
            }}
        """)
        header_layout = QHBoxLayout(header)
        header_layout.setContentsMargins(24, 0, 24, 0)

        title_label = QLabel("🏠 Yeni İlan Oluştur")
        title_label.setStyleSheet(f"""
            color: {Colors.TEXT_PRIMARY};
            font-size: {FontSizes.LARGE}pt;
            font-weight: 700;
            background: transparent;
            border: none;
        """)
        header_layout.addWidget(title_label)
        header_layout.addStretch()
        main_layout.addWidget(header)

        # ── Sekmeli Yapı (QTabWidget) ───────────────────────────────────────
        self.tabs = QTabWidget()
        self.tabs.setStyleSheet(f"""
            QTabWidget::pane {{
                border: 1px solid {Colors.BORDER};
                background-color: {Colors.SURFACE};
                border-radius: 6px;
            }}
            QTabBar::tab {{
                background: {Colors.SURFACE_2};
                color: {Colors.TEXT_SECONDARY};
                padding: 10px 20px;
                margin-right: 4px;
                border-top-left-radius: 6px;
                border-top-right-radius: 6px;
                font-weight: bold;
            }}
            QTabBar::tab:selected {{
                background: {Colors.PRIMARY};
                color: white;
            }}
        """)

        self._setup_basic_info_tab()
        self._setup_details_tab()
        self._setup_features_tab()
        self._setup_location_media_tab()

        main_layout.addWidget(self.tabs)

        # Hata mesajı alanı
        self._error_label = QLabel("")
        self._error_label.setWordWrap(True)
        self._error_label.setStyleSheet(f"""
            color: {Colors.DANGER};
            font-size: {FontSizes.SMALL}pt;
            padding: 8px 24px;
        """)
        self._error_label.hide()
        main_layout.addWidget(self._error_label)

        # ── Alt Butonlar ───────────────────────────────────────────────────
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
        footer_layout.setSpacing(12)

        footer_layout.addStretch()

        cancel_btn = StyledButton("İptal", variant="ghost")
        cancel_btn.setMinimumWidth(100)
        cancel_btn.clicked.connect(self.reject)
        footer_layout.addWidget(cancel_btn)

        self._save_btn = StyledButton("💾  Kaydet", variant="primary")
        self._save_btn.setMinimumWidth(140)
        self._save_btn.clicked.connect(self._on_save)
        footer_layout.addWidget(self._save_btn)

        main_layout.addWidget(footer)

    # ─── Sekme Kurulumları ─────────────────────────────────────────────────────

    def _setup_basic_info_tab(self) -> None:
        """1. Temel Bilgiler Sekmesi"""
        tab = QWidget()
        layout = QVBoxLayout(tab)
        layout.setContentsMargins(20, 20, 20, 20)
        layout.setSpacing(16)

        self._title_input = StyledLineEdit(placeholder="İlan başlığını girin (En az 3 karakter)")
        self._add_form_row(layout, "Başlık *", self._title_input)

        self._price_input = StyledLineEdit(placeholder="Örn: 2500000")
        self._add_form_row(layout, "Fiyat (₺) *", self._price_input)

        self._listing_type_combo = StyledComboBox()
        for lt in ListingType:
            self._listing_type_combo.addItem(lt.display(), lt.value)
        self._add_form_row(layout, "İlan Tipi *", self._listing_type_combo)

        self._property_type_combo = StyledComboBox()
        for pt in PropertyType:
            self._property_type_combo.addItem(pt.display(), pt.value)
        self._add_form_row(layout, "Mülk Tipi *", self._property_type_combo)

        self._description_input = StyledTextEdit(placeholder="İlan açıklamasını girin (opsiyonel)")
        self._description_input.setFixedHeight(120)
        self._add_form_row(layout, "Açıklama", self._description_input)

        layout.addStretch()
        self.tabs.addTab(tab, "📄 Temel Bilgiler")

    def _setup_details_tab(self) -> None:
        """2. Konut Detayları Sekmesi"""
        tab = QWidget()
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        
        container = QWidget()
        layout = QVBoxLayout(container)
        layout.setContentsMargins(20, 20, 20, 20)
        layout.setSpacing(16)

        # Alan Bilgileri
        self._add_section_title(layout, "ALAN BİLGİLERİ")
        self._gross_area_input = StyledLineEdit(placeholder="m² (opsiyonel)")
        self._add_form_row(layout, "Brüt Alan (m²)", self._gross_area_input)

        self._net_area_input = StyledLineEdit(placeholder="m² (opsiyonel)")
        self._add_form_row(layout, "Net Alan (m²)", self._net_area_input)

        # Oda & Kat Bilgileri
        self._add_section_title(layout, "ODA & KAT BİLGİLERİ")
        grid = QGridLayout()
        grid.setSpacing(14)
        
        self._room_count_input = StyledLineEdit(placeholder="Örn: 3")
        self._add_grid_form_row(grid, 0, 0, "Oda Sayısı", self._room_count_input)

        self._living_room_count_input = StyledLineEdit(placeholder="Örn: 1")
        self._add_grid_form_row(grid, 0, 1, "Salon Sayısı", self._living_room_count_input)

        self._bathroom_count_input = StyledLineEdit(placeholder="Örn: 1")
        self._add_grid_form_row(grid, 1, 0, "Banyo Sayısı", self._bathroom_count_input)

        self._floor_input = StyledLineEdit(placeholder="Örn: 4 (-1 = bodrum)")
        self._add_grid_form_row(grid, 1, 1, "Bulunduğu Kat", self._floor_input)

        self._total_floor_input = StyledLineEdit(placeholder="Örn: 8")
        self._add_grid_form_row(grid, 2, 0, "Toplam Kat", self._total_floor_input)

        self._building_age_input = StyledLineEdit(placeholder="Örn: 5")
        self._add_grid_form_row(grid, 2, 1, "Bina Yaşı", self._building_age_input)
        
        layout.addLayout(grid)

        # Diğer Bilgiler
        self._add_section_title(layout, "DİĞER BİLGİLER")
        self._heating_type_combo = StyledComboBox()
        self._heating_type_combo.addItem("-- Seçiniz --", "")
        self._heating_type_combo.addItem("Doğalgaz", "NATURAL_GAS")
        self._heating_type_combo.addItem("Elektrik", "ELECTRIC")
        self._heating_type_combo.addItem("Yerden Isıtma", "FLOOR_HEATING")
        self._heating_type_combo.addItem("Kömür / Soba", "COAL")
        self._heating_type_combo.addItem("Yok", "NONE")
        self._heating_type_combo.addItem("Diğer", "OTHER")
        self._add_form_row(layout, "Isıtma Tipi", self._heating_type_combo)

        self._dues_input = StyledLineEdit(placeholder="Aylık aidat (₺, opsiyonel)")
        self._add_form_row(layout, "Aidat (₺/ay)", self._dues_input)

        self._deed_status_combo = StyledComboBox()
        self._deed_status_combo.addItem("-- Seçiniz --", "")
        self._deed_status_combo.addItem("Kat İrtifakı", "FREEHOLD")
        self._deed_status_combo.addItem("Kat Mülkiyeti", "CONDOMINIUM")
        self._deed_status_combo.addItem("Kat İrtifakı (Floor Easement)", "FLOOR_EASEMENT")
        self._deed_status_combo.addItem("Hisseli Tapu", "SHARED")
        self._deed_status_combo.addItem("Diğer", "OTHER")
        self._add_form_row(layout, "Tapu Durumu", self._deed_status_combo)

        layout.addStretch()
        scroll.setWidget(container)
        
        # Sekmeye QScrollArea ekliyoruz
        tab_layout = QVBoxLayout(tab)
        tab_layout.setContentsMargins(0, 0, 0, 0)
        tab_layout.addWidget(scroll)
        self.tabs.addTab(tab, "🏢 Konut Detayları")

    def _setup_features_tab(self) -> None:
        """3. Özellikler Sekmesi"""
        tab = QWidget()
        layout = QVBoxLayout(tab)
        layout.setContentsMargins(24, 24, 24, 24)
        layout.setSpacing(20)

        self._add_section_title(layout, "İLAN ÖZELLİKLERİ")
        
        lbl_info = QLabel("Özellik varsa işaretleyin. İşaretlenmeyenler 'Yok' olarak gönderilir.")
        lbl_info.setStyleSheet(f"color: {Colors.TEXT_SECONDARY}; font-size: {FontSizes.SMALL}pt;")
        layout.addWidget(lbl_info)

        grid = QGridLayout()
        grid.setSpacing(20)

        self._furnished_check = QCheckBox("Eşyalı")
        self._balcony_check = QCheckBox("Balkon")
        self._elevator_check = QCheckBox("Asansör")
        self._parking_check = QCheckBox("Otopark / Garaj")
        self._eligible_for_credit_check = QCheckBox("Krediye Uygun")
        self._exchange_available_check = QCheckBox("Takas Yapılabilir")
        self._is_featured_check = QCheckBox("⭐ Öne Çıkan İlan")

        checkbox_style = f"color: {Colors.TEXT_PRIMARY}; font-size: {FontSizes.NORMAL}pt;"
        self._furnished_check.setStyleSheet(checkbox_style)
        self._balcony_check.setStyleSheet(checkbox_style)
        self._elevator_check.setStyleSheet(checkbox_style)
        self._parking_check.setStyleSheet(checkbox_style)
        self._eligible_for_credit_check.setStyleSheet(checkbox_style)
        self._exchange_available_check.setStyleSheet(checkbox_style)
        self._is_featured_check.setStyleSheet(checkbox_style)

        # Sol Kolon
        grid.addWidget(self._furnished_check, 0, 0)
        grid.addWidget(self._elevator_check, 1, 0)
        grid.addWidget(self._eligible_for_credit_check, 2, 0)
        grid.addWidget(self._is_featured_check, 3, 0)

        # Sağ Kolon
        grid.addWidget(self._balcony_check, 0, 1)
        grid.addWidget(self._parking_check, 1, 1)
        grid.addWidget(self._exchange_available_check, 2, 1)

        layout.addLayout(grid)
        layout.addStretch()
        self.tabs.addTab(tab, "✔ Özellikler")

    def _setup_location_media_tab(self) -> None:
        """4. Konum & Harita Sekmesi"""
        tab = QWidget()
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)

        container = QWidget()
        layout = QVBoxLayout(container)
        layout.setContentsMargins(20, 20, 20, 20)
        layout.setSpacing(16)

        self._add_section_title(layout, "Adres")

        # İl ComboBox
        self._province_combo = SearchableComboBox(placeholder="-- İl Seçin --")
        self._province_combo.addItem("-- İl Seçin --", "")
        for p in location_service.get_provinces():
            self._province_combo.addItem(p, p)
        self._province_combo.currentIndexChanged.connect(self._on_province_changed)
        self._add_form_row(layout, "İl *", self._province_combo)

        # İlçe ComboBox
        self._district_combo = SearchableComboBox(placeholder="-- İlçe Seçin --")
        self._district_combo.setEnabled(False)
        self._district_combo.currentIndexChanged.connect(self._on_district_changed)
        self._add_form_row(layout, "İlçe *", self._district_combo)

        # Mahalle ComboBox
        self._neighborhood_combo = SearchableComboBox(placeholder="-- Mahalle Seçin --")
        self._neighborhood_combo.setEnabled(False)
        self._neighborhood_combo.currentIndexChanged.connect(self._on_location_field_changed)
        self._add_form_row(layout, "Mahalle *", self._neighborhood_combo)

        # Serbest Metin Adres Detayı
        self._address_input = StyledLineEdit(placeholder="Sokak, Bina No, Daire No vb.")
        self._address_input.textChanged.connect(self._on_location_field_changed)
        self._add_form_row(layout, "Adres Detayı *", self._address_input)

        # Google Maps Konumu
        self._add_section_title(layout, "Google Maps Konumu")

        radio_layout = QHBoxLayout()
        radio_layout.setSpacing(20)

        self._map_auto_radio = QRadioButton("Otomatik Oluştur")
        self._map_manual_radio = QRadioButton("Manuel Gir")
        self._map_auto_radio.setChecked(True)

        radio_style = f"color: {Colors.TEXT_PRIMARY}; font-size: {FontSizes.NORMAL}pt;"
        self._map_auto_radio.setStyleSheet(radio_style)
        self._map_manual_radio.setStyleSheet(radio_style)

        self._map_mode_group = QButtonGroup(self)
        self._map_mode_group.addButton(self._map_auto_radio, 1)
        self._map_mode_group.addButton(self._map_manual_radio, 2)
        self._map_auto_radio.toggled.connect(self._on_map_mode_changed)

        radio_layout.addWidget(self._map_auto_radio)
        radio_layout.addWidget(self._map_manual_radio)
        radio_layout.addStretch()
        layout.addLayout(radio_layout)

        url_row = QWidget()
        url_layout = QHBoxLayout(url_row)
        url_layout.setContentsMargins(0, 0, 0, 0)
        url_layout.setSpacing(10)

        self._map_url_input = StyledLineEdit(placeholder="https://www.google.com/maps/...")
        self._map_url_input.setReadOnly(True)
        self._map_url_input.textChanged.connect(self._update_map_button_state)

        self._view_map_btn = StyledButton("📍 Haritada Gör", variant="secondary")
        self._view_map_btn.setEnabled(False)
        self._view_map_btn.clicked.connect(self._on_view_map_clicked)

        url_layout.addWidget(self._map_url_input, stretch=1)
        url_layout.addWidget(self._view_map_btn)

        self._add_form_row(layout, "Google Maps URL", url_row)

        layout.addStretch()
        scroll.setWidget(container)

        tab_layout = QVBoxLayout(tab)
        tab_layout.setContentsMargins(0, 0, 0, 0)
        tab_layout.addWidget(scroll)
        self.tabs.addTab(tab, "📍 Konum _ Medya")

    # ─── Yardımcı Arayüz Metodları ─────────────────────────────────────────────

    def _add_section_title(self, layout: QVBoxLayout, title: str) -> None:
        """Bölüm başlığı ekler."""
        label = QLabel(title)
        label.setStyleSheet(f"""
            color: {Colors.TEXT_SECONDARY};
            font-size: {FontSizes.SMALL}pt;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            padding-top: 8px;
            border-bottom: 1px solid {Colors.BORDER};
            padding-bottom: 8px;
        """)
        layout.addWidget(label)

    def _add_form_row(self, layout: QVBoxLayout, label_text: str, widget: QWidget) -> None:
        """Etiket + input çifti ekler."""
        row = QWidget()
        row_layout = QVBoxLayout(row)
        row_layout.setSpacing(6)
        row_layout.setContentsMargins(0, 0, 0, 0)

        label = QLabel(label_text)
        label.setStyleSheet(f"""
            color: {Colors.TEXT_SECONDARY};
            font-size: {FontSizes.SMALL}pt;
            font-weight: 600;
        """)
        row_layout.addWidget(label)
        row_layout.addWidget(widget)
        layout.addWidget(row)

    def _add_grid_form_row(self, grid: QGridLayout, row: int, col: int, label_text: str, widget: QWidget) -> None:
        """Etiket + input çiftini QGridLayout'a ekler."""
        container = QWidget()
        layout = QVBoxLayout(container)
        layout.setSpacing(6)
        layout.setContentsMargins(0, 0, 0, 0)

        label = QLabel(label_text)
        label.setStyleSheet(f"""
            color: {Colors.TEXT_SECONDARY};
            font-size: {FontSizes.SMALL}pt;
            font-weight: 600;
        """)
        layout.addWidget(label)
        layout.addWidget(widget)
        grid.addWidget(container, row, col)

    # ─── Harita & Konum Olay Yöneticileri ───────────────────────────────────────

    def _on_province_changed(self) -> None:
        """İl değiştiğinde İlçe ve Mahalle seçimlerini sıfırlar ve günceller."""
        province = self._province_combo.currentData()
        self._district_combo.blockSignals(True)
        self._neighborhood_combo.blockSignals(True)

        self._district_combo.clear()
        self._neighborhood_combo.clear()

        if province:
            self._district_combo.addItem("-- İlçe Seçin --", "")
            for d in location_service.get_districts(province):
                self._district_combo.addItem(d, d)
            self._district_combo.setEnabled(True)
        else:
            self._district_combo.setEnabled(False)

        self._neighborhood_combo.setEnabled(False)
        self._district_combo.blockSignals(False)
        self._neighborhood_combo.blockSignals(False)

        self._on_location_field_changed()

    def _on_district_changed(self) -> None:
        """İlçe değiştiğinde Mahalle seçimlerini sıfırlar ve günceller."""
        province = self._province_combo.currentData()
        district = self._district_combo.currentData()
        self._neighborhood_combo.blockSignals(True)

        self._neighborhood_combo.clear()

        if province and district:
            self._neighborhood_combo.addItem("-- Mahalle Seçin --", "")
            for n in location_service.get_neighborhoods(province, district):
                self._neighborhood_combo.addItem(n, n)
            self._neighborhood_combo.setEnabled(True)
        else:
            self._neighborhood_combo.setEnabled(False)

        self._neighborhood_combo.blockSignals(False)

        self._on_location_field_changed()

    def _on_location_field_changed(self) -> None:
        """Konum alanlarından biri değiştiğinde otomatik mod aktifse URL'yi günceller."""
        if self._map_auto_radio.isChecked():
            self._update_auto_map_url()

    def _on_map_mode_changed(self) -> None:
        """Mod değiştğinde URL alanının editlenebilirliğini ayarlar."""
        is_auto = self._map_auto_radio.isChecked()
        if is_auto:
            self._map_url_input.setReadOnly(True)
            self._update_auto_map_url()
        else:
            self._map_url_input.setReadOnly(False)
        self._update_map_button_state()

    def _update_auto_map_url(self) -> None:
        """Konum bilgilerinden otomatik URL üretir."""
        province = self._province_combo.currentData() or ""
        district = self._district_combo.currentData() or ""
        neighborhood = self._neighborhood_combo.currentData() or ""
        address = self._address_input.text().strip()

        url = maps_url_service.generate_url(address, neighborhood, district, province)
        self._map_url_input.setText(url)
        self._update_map_button_state()

    def _update_map_button_state(self) -> None:
        """'Haritada Gör' butonunu URL validasyonuna göre aktif/pasif yapar."""
        url = self._map_url_input.text().strip()
        is_valid = maps_url_service.is_valid_url(url)
        self._view_map_btn.setEnabled(is_valid)

    def _on_view_map_clicked(self) -> None:
        """'Haritada Gör' butonuna basıldığında URL'yi varsayılan tarayıcıda açar."""
        url = self._map_url_input.text().strip()
        if maps_url_service.is_valid_url(url):
            if not (url.startswith("http://") or url.startswith("https://")):
                url = "https://" + url
            webbrowser.open(url)

    # ─── Kaydetme İşlemi ───────────────────────────────────────────────────────

    def _on_save(self) -> None:
        """
        Kaydet butonuna basıldığında çalışır.
        """
        self._error_label.hide()
        self._save_btn.setEnabled(False)
        self._save_btn.setText("Kaydediliyor...")

        # 1. Temel Bilgiler Form Değerleri
        title = self._title_input.text().strip()
        price_str = self._price_input.text().strip()
        listing_type = self._listing_type_combo.currentData()
        property_type = self._property_type_combo.currentData()
        description = self._description_input.toPlainText().strip() or None

        # 2. Konum Form Değerleri
        province = self._province_combo.currentData() or ""
        district = self._district_combo.currentData() or ""
        neighborhood = self._neighborhood_combo.currentData() or ""
        address = self._address_input.text().strip()
        is_map_manual = self._map_manual_radio.isChecked()
        map_url = self._map_url_input.text().strip()

        # 3. Konut Detayları Form Değerleri
        gross_area = safe_float(self._gross_area_input.text().strip())
        net_area = safe_float(self._net_area_input.text().strip())
        room_count = safe_int(self._room_count_input.text().strip())
        living_room_count = safe_int(self._living_room_count_input.text().strip())
        bathroom_count = safe_int(self._bathroom_count_input.text().strip())
        floor = safe_int(self._floor_input.text().strip())
        total_floor = safe_int(self._total_floor_input.text().strip())
        building_age = safe_int(self._building_age_input.text().strip())
        heating_type = self._heating_type_combo.currentData() or None
        dues = safe_float(self._dues_input.text().strip())
        deed_status = self._deed_status_combo.currentData() or None

        # 4. Özellikler Form Değerleri
        furnished = self._furnished_check.isChecked()
        balcony = self._balcony_check.isChecked()
        elevator = self._elevator_check.isChecked()
        parking = self._parking_check.isChecked()
        eligible_for_credit = self._eligible_for_credit_check.isChecked()
        exchange_available = self._exchange_available_check.isChecked()
        is_featured = self._is_featured_check.isChecked()

        # Temel Bilgiler Validasyonu
        is_valid, errors = validate_create_property_form(
            title, price_str, province, district, neighborhood, address, map_url, is_map_manual
        )

        if not is_valid:
            self._show_form_error("\n".join(errors))
            return

        try:
            price = float(price_str.replace(",", "."))
            request = CreatePropertyRequest(
                title=title,
                listing_type=listing_type,
                property_type=property_type,
                price=price,
                city=province,
                province=province,
                district=district,
                neighborhood=neighborhood,
                address=address,
                description=description,
                map_url=map_url,
                is_map_url_manual=is_map_manual,
                gross_area=gross_area,
                net_area=net_area,
                room_count=room_count,
                living_room_count=living_room_count,
                bathroom_count=bathroom_count,
                floor=floor,
                total_floor=total_floor,
                building_age=building_age,
                heating_type=heating_type,
                dues=dues,
                deed_status=deed_status,
                furnished=furnished,
                balcony=balcony,
                elevator=elevator,
                parking=parking,
                eligible_for_credit=eligible_for_credit,
                exchange_available=exchange_available,
                is_featured=is_featured,
            )
            property_service.create_property(request)
            self.property_created.emit()
            self.accept()
        except ApiException as e:
            self._show_form_error(e.message)
        except Exception as e:
            self._show_form_error(f"Beklenmeyen hata: {e}")
        finally:
            self._save_btn.setEnabled(True)
            self._save_btn.setText("💾  Kaydet")

    def _show_form_error(self, message: str) -> None:
        """Form altında hata mesajı gösterir."""
        self._error_label.setText(f"⚠ {message}")
        self._error_label.show()
        self._save_btn.setEnabled(True)
        self._save_btn.setText("💾  Kaydet")

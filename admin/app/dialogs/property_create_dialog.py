"""
app/dialogs/property_create_dialog.py
======================================
Amaç:
    Yeni gayrimenkul ilanı oluşturma formu dialog'u.
    Kullanıcı formu doldurup kaydet butonuna bastığında
    POST /api/v1/properties çağrısı yapılır.

Neden bu şekilde tasarlandı:
    - Dialog kendi içinde validasyon yapar; servis çağrısını tetikler.
    - İş mantığı (API çağrısı) doğrudan dialog'da değil PropertyService'de.
    - Dialog başarılı kayıt sonrası accepted() sinyali yayar →
      Property listesi otomatik yenilenir.
    - Form alanları StyledLineEdit/StyledComboBox kullanır → tutarlı görünüm.

Mimari içindeki görevi:
    Dialog katmanı — PropertyListView tarafından açılır.
    Service → ApiClient → Backend zincirini tetikler.
    View içinde HTTP kodu veya JSON bulunmaz.
"""

import webbrowser
from PySide6.QtWidgets import (
    QDialog,
    QVBoxLayout,
    QHBoxLayout,
    QLabel,
    QFormLayout,
    QWidget,
    QScrollArea,
    QFrame,
    QRadioButton,
    QButtonGroup,
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


class PropertyCreateDialog(QDialog):
    """
    Yeni ilan oluşturma dialog'u.

    Signals:
        property_created: Oluşturma başarılı olduğunda yayılır.
    """

    property_created = Signal()

    def __init__(self, parent=None) -> None:
        super().__init__(parent)
        self.setWindowTitle("Yeni İlan Oluştur")
        self.setModal(True)
        self.setMinimumWidth(560)
        self.setMinimumHeight(620)
        self.setStyleSheet(f"""
            QDialog {{
                background-color: {Colors.SURFACE};
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

        # ── Kaydırılabilir Form Alanı ───────────────────────────────────────
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)
        scroll.setStyleSheet("background-color: transparent;")

        form_container = QWidget()
        form_container.setStyleSheet(f"background-color: {Colors.SURFACE};")
        form_layout = QVBoxLayout(form_container)
        form_layout.setSpacing(20)
        form_layout.setContentsMargins(24, 24, 24, 16)

        # ── Temel Bilgiler ─────────────────────────────────────────────────
        self._add_section_title(form_layout, "Temel Bilgiler")

        # Başlık
        self._title_input = StyledLineEdit(placeholder="İlan başlığını girin")
        self._add_form_row(form_layout, "Başlık *", self._title_input)

        # Fiyat
        self._price_input = StyledLineEdit(placeholder="Örn: 2500000")
        self._add_form_row(form_layout, "Fiyat (₺) *", self._price_input)

        # İlan Tipi
        self._listing_type_combo = StyledComboBox()
        for lt in ListingType:
            self._listing_type_combo.addItem(lt.display(), lt.value)
        self._add_form_row(form_layout, "İlan Tipi *", self._listing_type_combo)

        # Mülk Tipi
        self._property_type_combo = StyledComboBox()
        for pt in PropertyType:
            self._property_type_combo.addItem(pt.display(), pt.value)
        self._add_form_row(form_layout, "Mülk Tipi *", self._property_type_combo)

        # ── Konum ──────────────────────────────────────────────────────────
        self._add_section_title(form_layout, "Konum")

        # İl ComboBox
        self._province_combo = SearchableComboBox(placeholder="-- İl Seçin --")
        self._province_combo.addItem("-- İl Seçin --", "")
        for p in location_service.get_provinces():
            self._province_combo.addItem(p, p)
        self._province_combo.currentIndexChanged.connect(self._on_province_changed)
        self._add_form_row(form_layout, "İl *", self._province_combo)

        # İlçe ComboBox
        self._district_combo = SearchableComboBox(placeholder="-- İlçe Seçin --")
        self._district_combo.setEnabled(False)
        self._district_combo.currentIndexChanged.connect(self._on_district_changed)
        self._add_form_row(form_layout, "İlçe *", self._district_combo)

        # Mahalle ComboBox
        self._neighborhood_combo = SearchableComboBox(placeholder="-- Mahalle Seçin --")
        self._neighborhood_combo.setEnabled(False)
        self._neighborhood_combo.currentIndexChanged.connect(self._on_location_field_changed)
        self._add_form_row(form_layout, "Mahalle *", self._neighborhood_combo)

        # Serbest Metin Adres Detayı
        self._address_input = StyledLineEdit(placeholder="Sokak, Bina No, Daire No vb.")
        self._address_input.textChanged.connect(self._on_location_field_changed)
        self._add_form_row(form_layout, "Adres Detayı *", self._address_input)

        # ── Google Maps Konumu ──────────────────────────────────────────────
        self._add_section_title(form_layout, "Google Maps Konumu")

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
        form_layout.addLayout(radio_layout)

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

        self._add_form_row(form_layout, "Google Maps URL", url_row)

        # ── Açıklama ───────────────────────────────────────────────────────
        self._add_section_title(form_layout, "Açıklama")

        self._description_input = StyledTextEdit(
            placeholder="İlan açıklamasını girin (isteğe bağlı)"
        )
        self._description_input.setFixedHeight(100)
        self._add_form_row(form_layout, "Açıklama", self._description_input)

        # Hata mesajı alanı
        self._error_label = QLabel("")
        self._error_label.setWordWrap(True)
        self._error_label.setStyleSheet(f"""
            color: {Colors.DANGER};
            font-size: {FontSizes.SMALL}pt;
            padding: 4px 0;
        """)
        self._error_label.hide()
        form_layout.addWidget(self._error_label)

        form_layout.addStretch()
        scroll.setWidget(form_container)
        main_layout.addWidget(scroll)

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

    def _on_save(self) -> None:
        """
        Kaydet butonuna basıldığında çalışır.
        """
        self._error_label.hide()
        self._save_btn.setEnabled(False)
        self._save_btn.setText("Kaydediliyor...")

        # Form değerlerini al
        title = self._title_input.text().strip()
        price_str = self._price_input.text().strip()
        province = self._province_combo.currentData() or ""
        district = self._district_combo.currentData() or ""
        neighborhood = self._neighborhood_combo.currentData() or ""
        address = self._address_input.text().strip()
        description = self._description_input.toPlainText().strip() or None
        listing_type = self._listing_type_combo.currentData()
        property_type = self._property_type_combo.currentData()
        is_map_manual = self._map_manual_radio.isChecked()
        map_url = self._map_url_input.text().strip()

        # Validasyon
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

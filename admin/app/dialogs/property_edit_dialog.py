"""
app/dialogs/property_edit_dialog.py
====================================
Amaç:
    İlan düzenleme formu ve resim yönetimi.

Neden bu şekilde tasarlandı:
    - Sekmeli yapı (QTabWidget) ile formu ve resimleri ayırdık.
    - Worker thread'ler kullanılarak resim yükleme UI'ı bloklamadan yapılır.
    - Resimlerin asenkron indirilmesi için QNetworkAccessManager kullanılır.
"""

import os
import webbrowser
from PySide6.QtWidgets import (
    QDialog, QVBoxLayout, QHBoxLayout, QLabel, QWidget, QScrollArea,
    QTabWidget, QFileDialog, QListWidget, QListWidgetItem, QProgressBar, QMessageBox, QFrame,
    QGridLayout, QSizePolicy, QRadioButton, QButtonGroup
)
from PySide6.QtCore import Qt, Signal, QThread, QObject, QSize, QUrl
from PySide6.QtGui import QPixmap
from PySide6.QtNetwork import QNetworkAccessManager, QNetworkRequest, QNetworkReply

from app.services.property_service import property_service
from app.services.location_service import location_service
from app.services.maps_url_service import maps_url_service
from app.models.property import Property, PropertyImage
from app.api.exceptions import ApiException
from app.config.constants import Colors, FontSizes, ListingType, PropertyType
from app.widgets.styled_button import StyledButton
from app.widgets.styled_input import StyledLineEdit, StyledComboBox, SearchableComboBox, StyledTextEdit
from app.utils.validators import validate_create_property_form

# ─── Image Upload Worker ───────────────────────────────────────────────────────

class ImageUploadWorker(QObject):
    finished = Signal(list) # List of PropertyImage
    error = Signal(str)

    def __init__(self, property_id: str, file_paths: list[str]) -> None:
        super().__init__()
        self.property_id = property_id
        self.file_paths = file_paths

    def run(self) -> None:
        try:
            images = property_service.upload_images(self.property_id, self.file_paths)
            self.finished.emit(images)
        except Exception as e:
            msg = str(e)
            if hasattr(e, 'message'):
                msg = e.message
            self.error.emit(msg)

# ─── Image List Item Widget ────────────────────────────────────────────────────

class ImageItemWidget(QWidget):
    delete_requested = Signal(str)
    cover_requested = Signal(str)
    move_up_requested = Signal(str)
    move_down_requested = Signal(str)

    def __init__(self, image: PropertyImage, network_manager: QNetworkAccessManager) -> None:
        super().__init__()
        self.image = image
        self.network_manager = network_manager
        self.setFixedHeight(120)
        self.setStyleSheet(f"""
            QWidget {{
                background-color: {Colors.SURFACE_2};
                border: 1px solid {Colors.BORDER};
                border-radius: 8px;
            }}
        """)
        self._setup_ui()
        self._load_image()

    def _setup_ui(self) -> None:
        layout = QHBoxLayout(self)
        layout.setContentsMargins(12, 12, 12, 12)
        layout.setSpacing(16)

        # Image preview
        self.image_label = QLabel()
        self.image_label.setFixedSize(120, 90)
        self.image_label.setStyleSheet("background-color: #E2E8F0; border-radius: 4px;")
        self.image_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.image_label.setText("Yükleniyor...")
        layout.addWidget(self.image_label)

        # Details
        details_layout = QVBoxLayout()
        cover_text = "⭐ KAPAK FOTOĞRAFI" if self.image.is_cover else ""
        self.info_label = QLabel(f"<b>{cover_text}</b><br/>Sıra: {self.image.display_order} | Format: {self.image.format} | Boyut: {self.image.width}x{self.image.height}")
        self.info_label.setStyleSheet("border: none; background: transparent;")
        details_layout.addWidget(self.info_label)
        details_layout.addStretch()
        layout.addLayout(details_layout)

        # Actions
        actions_layout = QVBoxLayout()
        actions_layout.setSpacing(4)
        
        btn_layout = QHBoxLayout()
        
        up_btn = StyledButton("↑", variant="secondary", small=True)
        up_btn.clicked.connect(lambda: self.move_up_requested.emit(self.image.id))
        
        down_btn = StyledButton("↓", variant="secondary", small=True)
        down_btn.clicked.connect(lambda: self.move_down_requested.emit(self.image.id))
        
        cover_btn = StyledButton("Kapak Yap", variant="primary", small=True)
        cover_btn.clicked.connect(lambda: self.cover_requested.emit(self.image.id))
        if self.image.is_cover:
            cover_btn.setEnabled(False)
            
        del_btn = StyledButton("Sil", variant="danger", small=True)
        del_btn.clicked.connect(lambda: self.delete_requested.emit(self.image.id))
        
        btn_layout.addWidget(up_btn)
        btn_layout.addWidget(down_btn)
        btn_layout.addWidget(cover_btn)
        btn_layout.addWidget(del_btn)
        
        actions_layout.addLayout(btn_layout)
        actions_layout.addStretch()
        
        layout.addLayout(actions_layout)

    def _load_image(self) -> None:
        url = QUrl(self.image.url)
        request = QNetworkRequest(url)
        self.reply = self.network_manager.get(request)
        self.reply.finished.connect(self._on_image_loaded)

    def _on_image_loaded(self) -> None:
        if self.reply.error() == QNetworkReply.NetworkError.NoError:
            data = self.reply.readAll()
            pixmap = QPixmap()
            pixmap.loadFromData(data)
            self.image_label.setPixmap(pixmap.scaled(self.image_label.size(), Qt.AspectRatioMode.KeepAspectRatioByExpanding, Qt.TransformationMode.SmoothTransformation))
        else:
            self.image_label.setText("Hata")
        self.reply.deleteLater()


# ─── Property Edit Dialog ──────────────────────────────────────────────────────

class PropertyEditDialog(QDialog):
    property_updated = Signal()

    def __init__(self, property_data: Property, parent=None) -> None:
        super().__init__(parent)
        self.property = property_data
        self.network_manager = QNetworkAccessManager(self)
        self.upload_thread = None
        self.upload_worker = None
        self.images = list(property_data.images)
        self.images.sort(key=lambda x: x.display_order)
        
        self.setWindowTitle(f"İlanı Düzenle: {self.property.title}")
        self.setModal(True)
        self.setMinimumWidth(800)
        self.setMinimumHeight(650)
        self.setStyleSheet(f"""
            QDialog {{ background-color: {Colors.BACKGROUND}; }}
            QLabel {{ color: {Colors.TEXT_PRIMARY}; }}
            QScrollArea {{ border: none; background-color: transparent; }}
        """)
        self._setup_ui()

    def _setup_ui(self) -> None:
        layout = QVBoxLayout(self)
        layout.setContentsMargins(16, 16, 16, 16)

        self.tabs = QTabWidget()
        self.tabs.setStyleSheet(f"""
            QTabWidget::pane {{ border: 1px solid {Colors.BORDER}; border-radius: 4px; }}
            QTabBar::tab {{ background: {Colors.SURFACE}; padding: 8px 16px; margin-right: 2px; border-top-left-radius: 4px; border-top-right-radius: 4px; }}
            QTabBar::tab:selected {{ background: {Colors.PRIMARY}; color: white; }}
        """)
        
        self._setup_info_tab()
        self._setup_images_tab()
        
        layout.addWidget(self.tabs)
        
        # Footer
        footer = QHBoxLayout()
        footer.addStretch()
        close_btn = StyledButton("Kapat", variant="secondary")
        close_btn.clicked.connect(self.accept)
        footer.addWidget(close_btn)
        layout.addLayout(footer)

    def _setup_info_tab(self) -> None:
        tab = QWidget()
        tab_layout = QVBoxLayout(tab)
        tab_layout.setContentsMargins(0, 0, 0, 0)

        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)
        scroll.setStyleSheet("background-color: transparent;")

        form_container = QWidget()
        form_container.setStyleSheet(f"background-color: {Colors.SURFACE};")
        form_layout = QVBoxLayout(form_container)
        form_layout.setSpacing(16)
        form_layout.setContentsMargins(20, 20, 20, 16)

        # ── Temel Bilgiler ─────────────────────────────────────────────────
        self._add_section_title(form_layout, "Temel Bilgiler")

        self._title_input = StyledLineEdit(placeholder="İlan başlığını girin")
        self._title_input.setText(self.property.title)
        self._add_form_row(form_layout, "Başlık *", self._title_input)

        self._price_input = StyledLineEdit(placeholder="Örn: 2500000")
        self._price_input.setText(str(self.property.price))
        self._add_form_row(form_layout, "Fiyat (₺) *", self._price_input)

        self._listing_type_combo = StyledComboBox()
        for lt in ListingType:
            self._listing_type_combo.addItem(lt.display(), lt.value)
        idx_lt = self._listing_type_combo.findData(self.property.listing_type)
        if idx_lt != -1:
            self._listing_type_combo.setCurrentIndex(idx_lt)
        self._add_form_row(form_layout, "İlan Tipi *", self._listing_type_combo)

        self._property_type_combo = StyledComboBox()
        for pt in PropertyType:
            self._property_type_combo.addItem(pt.display(), pt.value)
        idx_pt = self._property_type_combo.findData(self.property.property_type)
        if idx_pt != -1:
            self._property_type_combo.setCurrentIndex(idx_pt)
        self._add_form_row(form_layout, "Mülk Tipi *", self._property_type_combo)

        # ── Konum ──────────────────────────────────────────────────────────
        self._add_section_title(form_layout, "Konum")

        self._province_combo = SearchableComboBox(placeholder="-- İl Seçin --")
        self._province_combo.addItem("-- İl Seçin --", "")
        for p in location_service.get_provinces():
            self._province_combo.addItem(p, p)
        self._add_form_row(form_layout, "İl *", self._province_combo)

        self._district_combo = SearchableComboBox(placeholder="-- İlçe Seçin --")
        self._district_combo.setEnabled(False)
        self._add_form_row(form_layout, "İlçe *", self._district_combo)

        self._neighborhood_combo = SearchableComboBox(placeholder="-- Mahalle Seçin --")
        self._neighborhood_combo.setEnabled(False)
        self._neighborhood_combo.currentIndexChanged.connect(self._on_location_field_changed)
        self._add_form_row(form_layout, "Mahalle *", self._neighborhood_combo)

        self._address_input = StyledLineEdit(placeholder="Sokak, Bina No, Daire No vb.")
        self._address_input.setText(self.property.address)
        self._address_input.textChanged.connect(self._on_location_field_changed)
        self._add_form_row(form_layout, "Adres Detayı *", self._address_input)

        # ── Google Maps Konumu ──────────────────────────────────────────────
        self._add_section_title(form_layout, "Google Maps Konumu")

        radio_layout = QHBoxLayout()
        radio_layout.setSpacing(20)

        self._map_auto_radio = QRadioButton("Otomatik Oluştur")
        self._map_manual_radio = QRadioButton("Manuel Gir")

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
        self._map_url_input.textChanged.connect(self._update_map_button_state)

        self._view_map_btn = StyledButton("📍 Haritada Gör", variant="secondary")
        self._view_map_btn.setEnabled(False)
        self._view_map_btn.clicked.connect(self._on_view_map_clicked)

        url_layout.addWidget(self._map_url_input, stretch=1)
        url_layout.addWidget(self._view_map_btn)

        self._add_form_row(form_layout, "Google Maps URL", url_row)

        # ── Açıklama ───────────────────────────────────────────────────────
        self._add_section_title(form_layout, "Açıklama")

        self._description_input = StyledTextEdit(placeholder="İlan açıklaması")
        if self.property.description:
            self._description_input.setPlainText(self.property.description)
        self._description_input.setFixedHeight(90)
        self._add_form_row(form_layout, "Açıklama", self._description_input)

        # Hata mesajı
        self._info_error_label = QLabel("")
        self._info_error_label.setWordWrap(True)
        self._info_error_label.setStyleSheet(f"color: {Colors.DANGER}; font-size: {FontSizes.SMALL}pt; padding: 4px 0;")
        self._info_error_label.hide()
        form_layout.addWidget(self._info_error_label)

        # Kaydet butonu
        save_btn_layout = QHBoxLayout()
        save_btn_layout.addStretch()
        self._save_info_btn = StyledButton("💾  Değişiklikleri Kaydet", variant="primary")
        self._save_info_btn.clicked.connect(self._on_save_info)
        save_btn_layout.addWidget(self._save_info_btn)
        form_layout.addLayout(save_btn_layout)

        form_layout.addStretch()
        scroll.setWidget(form_container)
        tab_layout.addWidget(scroll)

        # Mevcut konum seçimlerini ve Google Maps modunu hiyerarşik yükle
        self._load_location_data()

        # Sinyal bağlantıları
        self._province_combo.currentIndexChanged.connect(self._on_province_changed)
        self._district_combo.currentIndexChanged.connect(self._on_district_changed)

        self.tabs.addTab(tab, "Temel Bilgiler")

    def _load_location_data(self) -> None:
        """İlanın mevcut İl → İlçe → Mahalle ve Google Maps URL seçimlerini doldurur."""
        current_province = self.property.province or self.property.city
        current_district = self.property.district
        current_neighborhood = self.property.neighborhood

        # 1. İl Seçimi
        idx_p = self._province_combo.findData(current_province)
        if idx_p != -1:
            self._province_combo.setCurrentIndex(idx_p)

            # 2. İlçeleri Doldur & Seç
            self._district_combo.clear()
            self._district_combo.addItem("-- İlçe Seçin --", "")
            districts = location_service.get_districts(current_province)
            for d in districts:
                self._district_combo.addItem(d, d)

            idx_d = self._district_combo.findData(current_district)
            if idx_d != -1:
                self._district_combo.setCurrentIndex(idx_d)
                self._district_combo.setEnabled(True)

                # 3. Mahalleleri Doldur & Seç
                self._neighborhood_combo.clear()
                self._neighborhood_combo.addItem("-- Mahalle Seçin --", "")
                neighborhoods = location_service.get_neighborhoods(current_province, current_district)
                for n in neighborhoods:
                    self._neighborhood_combo.addItem(n, n)

                if current_neighborhood:
                    idx_n = self._neighborhood_combo.findData(current_neighborhood)
                    if idx_n != -1:
                        self._neighborhood_combo.setCurrentIndex(idx_n)
                self._neighborhood_combo.setEnabled(True)

        # 4. Google Maps Modunu ve URL'yi Yükle
        if self.property.is_map_url_manual:
            self._map_manual_radio.setChecked(True)
            self._map_url_input.setReadOnly(False)
            self._map_url_input.setText(self.property.map_url or "")
        else:
            self._map_auto_radio.setChecked(True)
            self._map_url_input.setReadOnly(True)
            if self.property.map_url:
                self._map_url_input.setText(self.property.map_url)
            else:
                self._update_auto_map_url()
        self._update_map_button_state()

    def _on_province_changed(self) -> None:
        """İl değiştiğinde İlçe ve Mahalle seçimlerini sıfırlar."""
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
        """İlçe değiştiğinde Mahalle seçimlerini sıfırlar."""
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
        """Mod değiştiğinde URL alanının editlenebilirliğini ayarlar."""
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

    def _on_save_info(self) -> None:
        self._info_error_label.hide()
        self._save_info_btn.setEnabled(False)

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

        is_valid, errors = validate_create_property_form(
            title, price_str, province, district, neighborhood, address, map_url, is_map_manual
        )

        if not is_valid:
            self._info_error_label.setText("⚠ " + "\n".join(errors))
            self._info_error_label.show()
            self._save_info_btn.setEnabled(True)
            return

        try:
            price = float(price_str.replace(",", "."))
            fields = {
                "title": title,
                "listingType": listing_type,
                "propertyType": property_type,
                "price": price,
                "city": province,
                "province": province,
                "district": district,
                "neighborhood": neighborhood,
                "address": address,
                "description": description,
                "mapUrl": map_url,
                "isMapUrlManual": is_map_manual,
            }
            updated = property_service.update_property(self.property.id, fields)
            self.property = updated
            self.property_updated.emit()
            QMessageBox.information(self, "Başarılı", "İlan bilgileri güncellendi.")
        except ApiException as e:
            self._info_error_label.setText(f"⚠ {e.message}")
            self._info_error_label.show()
        except Exception as e:
            self._info_error_label.setText(f"⚠ Beklenmeyen hata: {e}")
            self._info_error_label.show()
        finally:
            self._save_info_btn.setEnabled(True)


    def _setup_images_tab(self) -> None:
        tab = QWidget()
        layout = QVBoxLayout(tab)

        # Header with Upload Button
        header_layout = QHBoxLayout()
        header_label = QLabel("Fotoğraflar")
        header_label.setStyleSheet(f"font-size: {FontSizes.LARGE}pt; font-weight: bold;")
        header_layout.addWidget(header_label)
        
        self.progress_bar = QProgressBar()
        self.progress_bar.setRange(0, 0)
        self.progress_bar.hide()
        header_layout.addWidget(self.progress_bar)
        
        header_layout.addStretch()
        
        self.upload_btn = StyledButton("Resim Yükle", variant="primary")
        self.upload_btn.clicked.connect(self._on_upload_clicked)
        header_layout.addWidget(self.upload_btn)
        
        layout.addLayout(header_layout)

        # List Widget
        self.list_widget = QListWidget()
        self.list_widget.setStyleSheet(f"background-color: {Colors.SURFACE}; border: none;")
        self.list_widget.setSelectionMode(QListWidget.SelectionMode.NoSelection)
        layout.addWidget(self.list_widget)

        self._render_images()
        self.tabs.addTab(tab, "Fotoğraflar")

    def _render_images(self) -> None:
        self.list_widget.clear()
        self.images.sort(key=lambda x: x.display_order)
        
        for img in self.images:
            item = QListWidgetItem(self.list_widget)
            widget = ImageItemWidget(img, self.network_manager)
            
            # Connect signals
            widget.delete_requested.connect(self._on_delete_image)
            widget.cover_requested.connect(self._on_set_cover)
            widget.move_up_requested.connect(self._on_move_up)
            widget.move_down_requested.connect(self._on_move_down)
            
            item.setSizeHint(widget.sizeHint())
            self.list_widget.addItem(item)
            self.list_widget.setItemWidget(item, widget)

    def _on_upload_clicked(self) -> None:
        file_paths, _ = QFileDialog.getOpenFileNames(
            self,
            "Resim Seç",
            "",
            "Images (*.png *.jpg *.jpeg *.webp)"
        )
        
        if not file_paths:
            return
            
        if len(self.images) + len(file_paths) > 20:
            QMessageBox.warning(self, "Hata", "Bir ilanda en fazla 20 resim olabilir.")
            return

        self.upload_btn.setEnabled(False)
        self.progress_bar.show()
        
        self.upload_thread = QThread()
        self.upload_worker = ImageUploadWorker(self.property.id, file_paths)
        self.upload_worker.moveToThread(self.upload_thread)
        
        self.upload_thread.started.connect(self.upload_worker.run)
        self.upload_worker.finished.connect(self._on_upload_finished)
        self.upload_worker.error.connect(self._on_upload_error)
        self.upload_worker.finished.connect(self.upload_thread.quit)
        self.upload_worker.error.connect(self.upload_thread.quit)
        
        self.upload_thread.start()

    def _on_upload_finished(self, updated_images: list[PropertyImage]) -> None:
        self.images = updated_images
        self._render_images()
        self._reset_upload_ui()
        self.property_updated.emit()

    def _on_upload_error(self, message: str) -> None:
        QMessageBox.critical(self, "Yükleme Hatası", message)
        self._reset_upload_ui()

    def _reset_upload_ui(self) -> None:
        self.upload_btn.setEnabled(True)
        self.progress_bar.hide()
        self.upload_thread = None
        self.upload_worker = None

    def _on_delete_image(self, image_id: str) -> None:
        reply = QMessageBox.question(self, "Onay", "Bu resmi silmek istediğinize emin misiniz?", QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No)
        if reply == QMessageBox.StandardButton.Yes:
            try:
                property_service.delete_image(image_id)
                self.images = [img for img in self.images if img.id != image_id]
                # Kapak silindiyse ilk resmi kapak yap UI'da
                if not any(img.is_cover for img in self.images) and self.images:
                    self.images[0] = PropertyImage(
                        id=self.images[0].id, url=self.images[0].url, public_id=self.images[0].public_id,
                        width=self.images[0].width, height=self.images[0].height, format=self.images[0].format,
                        bytes=self.images[0].bytes, display_order=self.images[0].display_order, is_cover=True
                    )
                self._render_images()
                self.property_updated.emit()
            except ApiException as e:
                QMessageBox.critical(self, "Hata", e.message)

    def _on_set_cover(self, image_id: str) -> None:
        try:
            property_service.set_cover_image(image_id)
            for i, img in enumerate(self.images):
                self.images[i] = PropertyImage(
                    id=img.id, url=img.url, public_id=img.public_id,
                    width=img.width, height=img.height, format=img.format,
                    bytes=img.bytes, display_order=img.display_order, is_cover=(img.id == image_id)
                )
            self._render_images()
            self.property_updated.emit()
        except ApiException as e:
            QMessageBox.critical(self, "Hata", e.message)

    def _on_move_up(self, image_id: str) -> None:
        idx = next((i for i, img in enumerate(self.images) if img.id == image_id), -1)
        if idx > 0:
            self._swap_orders(idx, idx - 1)

    def _on_move_down(self, image_id: str) -> None:
        idx = next((i for i, img in enumerate(self.images) if img.id == image_id), -1)
        if idx < len(self.images) - 1 and idx != -1:
            self._swap_orders(idx, idx + 1)

    def _swap_orders(self, idx1: int, idx2: int) -> None:
        # Swap memory
        self.images[idx1], self.images[idx2] = self.images[idx2], self.images[idx1]
        # Update display orders
        for i, img in enumerate(self.images):
            self.images[i] = PropertyImage(
                id=img.id, url=img.url, public_id=img.public_id,
                width=img.width, height=img.height, format=img.format,
                bytes=img.bytes, display_order=i+1, is_cover=img.is_cover
            )
        self._render_images()
        
        # Send API request
        orders = [{"id": img.id, "displayOrder": img.display_order} for img in self.images]
        try:
            property_service.reorder_images(self.property.id, orders)
            self.property_updated.emit()
        except ApiException as e:
            QMessageBox.critical(self, "Hata", f"Sıralama kaydedilemedi: {e.message}")

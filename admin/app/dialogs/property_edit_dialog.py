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
from PySide6.QtWidgets import (
    QDialog, QVBoxLayout, QHBoxLayout, QLabel, QWidget, QScrollArea,
    QTabWidget, QFileDialog, QListWidget, QListWidgetItem, QProgressBar, QMessageBox, QFrame,
    QGridLayout, QSizePolicy
)
from PySide6.QtCore import Qt, Signal, QThread, QObject, QSize, QUrl
from PySide6.QtGui import QPixmap
from PySide6.QtNetwork import QNetworkAccessManager, QNetworkRequest, QNetworkReply

from app.services.property_service import property_service
from app.models.property import Property, PropertyImage
from app.api.exceptions import ApiException
from app.config.constants import Colors, FontSizes, ListingType, PropertyType
from app.widgets.styled_button import StyledButton
from app.widgets.styled_input import StyledLineEdit, StyledComboBox, StyledTextEdit
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
        # Şimdilik sadece salt okunur gösterim veya sprint 5'teki gibi formu doldurabiliriz.
        # Sprint 6 odağı Image Management olduğu için formu basit tutuyorum.
        tab = QWidget()
        layout = QVBoxLayout(tab)
        
        title_label = QLabel(f"<h2>{self.property.title}</h2>")
        layout.addWidget(title_label)
        
        layout.addWidget(QLabel(f"<b>Fiyat:</b> {self.property.price} ₺"))
        layout.addWidget(QLabel(f"<b>Şehir/İlçe:</b> {self.property.city} / {self.property.district}"))
        layout.addWidget(QLabel(f"<b>Adres:</b> {self.property.address}"))
        
        layout.addStretch()
        self.tabs.addTab(tab, "Temel Bilgiler")

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

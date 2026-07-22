"""
app/views/properties/property_list_view.py
==========================================
Amaç:
    Backend'den property listesini çekip tabloda gösteren ana yönetim ekranı.
    Her satırda Edit, Delete, Publish, Unpublish butonları bulunur.

Neden bu şekilde tasarlandı:
    - QTableWidget: satır/kolon bazlı widget ekleme kolaylığı sağlar.
      Küçük/orta ölçekli listeler için QTableView'dan daha pratik.
    - PropertyService üzerinden veri çekilir; view'da HTTP kodu yok.
    - load_data() metodunu çağırmak yeterli; sinyal veya callback yok.
    - Buton sinyalleri lambda ile satır ID'sini yakalar.
    - Yükleme sırasında LoadingOverlay gösterilir; kullanıcı çift tıklamaz.
    - pagination: basit "Önceki / Sonraki" navigasyonu.

Mimari içindeki görevi:
    View katmanı — PropertyService'i tüketir.
    PropertyCreateDialog'u açar; başarılı oluşturma sonrası listeyi yeniler.
    MainWindow içinde bir panel olarak çalışır.
"""

from PySide6.QtWidgets import (
    QWidget,
    QVBoxLayout,
    QHBoxLayout,
    QLabel,
    QTableWidget,
    QTableWidgetItem,
    QHeaderView,
    QFrame,
    QAbstractItemView,
    QMessageBox,
)
from PySide6.QtCore import Qt, QThread, Signal, QObject
from PySide6.QtGui import QColor, QFont

from app.services.property_service import property_service
from app.api.exceptions import ApiException
from app.config.constants import Colors, FontSizes, Dimensions, PROPERTY_TABLE_COLUMNS
from app.models.property import Property, PaginatedPropertyResult
from app.widgets.styled_button import StyledButton
from app.widgets.loading_overlay import LoadingOverlay
from app.dialogs.property_create_dialog import PropertyCreateDialog
from app.dialogs.error_dialog import ErrorDialog
from app.utils.formatters import (
    format_price,
    format_datetime,
    format_listing_type,
    format_published_status,
)


# ─── Worker Thread ────────────────────────────────────────────────────────────

class PropertyLoaderWorker(QObject):
    """
    Property listesini arka planda yükleyen worker.

    QThread üzerinde çalışır; UI thread'i bloklamaz.

    Signals:
        data_loaded: Veri başarıyla yüklendi.
        error_occurred: Hata oluştu.
    """

    data_loaded = Signal(object)   # PaginatedPropertyResult
    error_occurred = Signal(object)  # ApiException

    def __init__(self, page: int, limit: int) -> None:
        super().__init__()
        self._page = page
        self._limit = limit

    def run(self) -> None:
        """Arka planda API çağrısı yapar."""
        try:
            result = property_service.get_properties(
                page=self._page,
                limit=self._limit,
            )
            self.data_loaded.emit(result)
        except ApiException as e:
            self.error_occurred.emit(e)
        except Exception as e:
            self.error_occurred.emit(e)


# ─── Property List View ───────────────────────────────────────────────────────

class PropertyListView(QWidget):
    """
    Property listesi ekranı.

    Backend'den property listesini çeker ve tabloda gösterir.
    Her satırda işlem butonları bulunur.
    """

    def __init__(self) -> None:
        super().__init__()
        self.setStyleSheet(f"background-color: {Colors.BACKGROUND};")
        self._current_page = 1
        self._page_size = 20
        self._total_pages = 1
        self._properties: list[Property] = []
        self._thread: QThread | None = None
        self._worker: PropertyLoaderWorker | None = None

        self._setup_ui()
        self.load_data()

    def _setup_ui(self) -> None:
        """UI bileşenlerini oluşturur."""
        layout = QVBoxLayout(self)
        layout.setContentsMargins(28, 28, 28, 28)
        layout.setSpacing(20)

        # ── Üst Çubuk ──────────────────────────────────────────────────────
        top_bar = QHBoxLayout()

        title_label = QLabel("İlanlar")
        title_label.setStyleSheet(f"""
            color: {Colors.TEXT_PRIMARY};
            font-size: {FontSizes.XLARGE}pt;
            font-weight: 800;
            background: transparent;
        """)
        top_bar.addWidget(title_label)

        self._count_label = QLabel("")
        self._count_label.setStyleSheet(f"""
            color: {Colors.TEXT_MUTED};
            font-size: {FontSizes.NORMAL}pt;
            background: transparent;
        """)
        top_bar.addWidget(self._count_label)
        top_bar.addStretch()

        self._new_btn = StyledButton("＋  Yeni İlan", variant="primary")
        self._new_btn.setMinimumWidth(140)
        self._new_btn.clicked.connect(self._open_create_dialog)
        top_bar.addWidget(self._new_btn)

        refresh_btn = StyledButton("↻  Yenile", variant="ghost")
        refresh_btn.setMinimumWidth(100)
        refresh_btn.clicked.connect(self.load_data)
        top_bar.addWidget(refresh_btn)

        layout.addLayout(top_bar)

        # ── Tablo ──────────────────────────────────────────────────────────
        self._table = QTableWidget()
        self._table.setColumnCount(len(PROPERTY_TABLE_COLUMNS))
        self._table.setHorizontalHeaderLabels(PROPERTY_TABLE_COLUMNS)
        self._table.setEditTriggers(QAbstractItemView.EditTrigger.NoEditTriggers)
        self._table.setSelectionBehavior(QAbstractItemView.SelectionBehavior.SelectRows)
        self._table.setAlternatingRowColors(True)
        self._table.verticalHeader().setVisible(False)
        self._table.setShowGrid(False)
        self._table.setFocusPolicy(Qt.FocusPolicy.NoFocus)

        # Kolon genişlikleri
        header = self._table.horizontalHeader()
        header.setSectionResizeMode(0, QHeaderView.ResizeMode.Stretch)          # Başlık
        header.setSectionResizeMode(1, QHeaderView.ResizeMode.Fixed)            # Şehir
        header.setSectionResizeMode(2, QHeaderView.ResizeMode.Fixed)            # Fiyat
        header.setSectionResizeMode(3, QHeaderView.ResizeMode.Fixed)            # İlan Tipi
        header.setSectionResizeMode(4, QHeaderView.ResizeMode.Fixed)            # Yayın
        header.setSectionResizeMode(5, QHeaderView.ResizeMode.Fixed)            # Tarih
        header.setSectionResizeMode(6, QHeaderView.ResizeMode.Fixed)            # İşlemler
        self._table.setColumnWidth(1, 110)
        self._table.setColumnWidth(2, 140)
        self._table.setColumnWidth(3, 100)
        self._table.setColumnWidth(4, 110)
        self._table.setColumnWidth(5, 130)
        self._table.setColumnWidth(6, 270)

        self._table.setRowHeight(0, Dimensions.TABLE_ROW_HEIGHT)
        self._table.setStyleSheet(f"""
            QTableWidget {{
                background-color: {Colors.SURFACE};
                alternate-background-color: {Colors.BACKGROUND};
                border: 1px solid {Colors.BORDER};
                border-radius: 10px;
                gridline-color: transparent;
                color: {Colors.TEXT_PRIMARY};
                font-size: {FontSizes.NORMAL}pt;
                outline: none;
            }}
            QTableWidget::item {{
                padding: 10px 12px;
                border: none;
            }}
            QTableWidget::item:selected {{
                background-color: {Colors.PRIMARY}33;
                color: {Colors.TEXT_PRIMARY};
            }}
            QHeaderView::section {{
                background-color: {Colors.SURFACE_2};
                color: {Colors.TEXT_SECONDARY};
                font-size: {FontSizes.SMALL}pt;
                font-weight: 700;
                padding: 10px 12px;
                border: none;
                border-bottom: 1px solid {Colors.BORDER};
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }}
            QScrollBar:vertical {{
                background: {Colors.SURFACE_2};
                width: 8px;
                border-radius: 4px;
            }}
            QScrollBar::handle:vertical {{
                background: {Colors.BORDER};
                border-radius: 4px;
            }}
        """)

        layout.addWidget(self._table)

        # ── Sayfalama ───────────────────────────────────────────────────────
        pagination_layout = QHBoxLayout()
        pagination_layout.addStretch()

        self._prev_btn = StyledButton("← Önceki", variant="ghost", small=True)
        self._prev_btn.clicked.connect(self._prev_page)
        self._prev_btn.setEnabled(False)
        pagination_layout.addWidget(self._prev_btn)

        self._page_label = QLabel("Sayfa 1")
        self._page_label.setStyleSheet(f"""
            color: {Colors.TEXT_SECONDARY};
            font-size: {FontSizes.SMALL}pt;
            padding: 0 12px;
            background: transparent;
        """)
        pagination_layout.addWidget(self._page_label)

        self._next_btn = StyledButton("Sonraki →", variant="ghost", small=True)
        self._next_btn.clicked.connect(self._next_page)
        self._next_btn.setEnabled(False)
        pagination_layout.addWidget(self._next_btn)

        layout.addLayout(pagination_layout)

        # ── Loading Overlay ─────────────────────────────────────────────────
        self._loading = LoadingOverlay(self, "İlanlar yükleniyor...")

    def load_data(self) -> None:
        """
        Property listesini backend'den yükler.

        QThread kullanarak UI thread'i bloklamaz.
        """
        self._loading.show()
        self._new_btn.setEnabled(False)

        # Önceki thread'i temizle
        if self._thread and self._thread.isRunning():
            self._thread.quit()
            self._thread.wait()

        self._thread = QThread()
        self._worker = PropertyLoaderWorker(self._current_page, self._page_size)
        self._worker.moveToThread(self._thread)

        self._thread.started.connect(self._worker.run)
        self._worker.data_loaded.connect(self._on_data_loaded)
        self._worker.error_occurred.connect(self._on_load_error)
        self._worker.data_loaded.connect(self._thread.quit)
        self._worker.error_occurred.connect(self._thread.quit)

        self._thread.start()

    def _on_data_loaded(self, result: PaginatedPropertyResult) -> None:
        """Veri yüklendiğinde tabloyu doldurur."""
        self._loading.hide()
        self._new_btn.setEnabled(True)
        self._properties = result.data

        # Sayfalama güncelle
        if result.pagination:
            self._total_pages = result.pagination.pages
            total = result.pagination.total
            self._count_label.setText(f"Toplam {total} ilan")
        else:
            self._total_pages = 1

        self._update_pagination_controls()
        self._populate_table(result.data)

    def _on_load_error(self, error: Exception) -> None:
        """Yükleme hatası."""
        self._loading.hide()
        self._new_btn.setEnabled(True)
        ErrorDialog.show_error(error, parent=self)

    def _populate_table(self, properties: list[Property]) -> None:
        """Tabloyu property listesiyle doldurur."""
        self._table.setRowCount(0)

        for prop in properties:
            row = self._table.rowCount()
            self._table.insertRow(row)
            self._table.setRowHeight(row, Dimensions.TABLE_ROW_HEIGHT)

            # Kolonlar
            self._set_cell(row, 0, prop.title)
            self._set_cell(row, 1, prop.city)
            self._set_cell(row, 2, format_price(prop.price))
            self._set_cell(row, 3, format_listing_type(prop.listing_type))

            # Yayın durumu (renkli)
            status_text = format_published_status(prop.is_published)
            status_item = QTableWidgetItem(status_text)
            status_item.setForeground(
                QColor(Colors.SUCCESS) if prop.is_published else QColor(Colors.TEXT_MUTED)
            )
            status_item.setTextAlignment(Qt.AlignmentFlag.AlignCenter | Qt.AlignmentFlag.AlignVCenter)
            self._table.setItem(row, 4, status_item)

            self._set_cell(row, 5, format_datetime(prop.created_at))

            # İşlem butonları
            btn_widget = self._create_action_buttons(prop)
            self._table.setCellWidget(row, 6, btn_widget)

    def _set_cell(self, row: int, col: int, text: str) -> None:
        """Tablo hücresine metin set eder."""
        item = QTableWidgetItem(text)
        item.setTextAlignment(Qt.AlignmentFlag.AlignVCenter | Qt.AlignmentFlag.AlignLeft)
        self._table.setItem(row, col, item)

    def _create_action_buttons(self, prop: Property) -> QWidget:
        """
        Satır işlem butonları widget'ı oluşturur.

        Butonlar: Edit | Delete | Publish veya Unpublish

        Args:
            prop: İşlem yapılacak property.

        Returns:
            QWidget içinde butonlar.
        """
        widget = QWidget()
        widget.setStyleSheet(f"background-color: transparent;")
        layout = QHBoxLayout(widget)
        layout.setContentsMargins(8, 6, 8, 6)
        layout.setSpacing(6)

        # Düzenle butonu
        edit_btn = StyledButton("✏", variant="secondary", small=True)
        edit_btn.setFixedWidth(36)
        edit_btn.setToolTip("İlanı Düzenle")
        edit_btn.setEnabled(True)
        edit_btn.clicked.connect(lambda checked, p=prop: self._on_edit_property(p))
        layout.addWidget(edit_btn)

        # Yayın durumu butonu
        if prop.is_published:
            toggle_btn = StyledButton("Yayından Al", variant="warning", small=True)
            toggle_btn.clicked.connect(lambda checked, p=prop: self._unpublish(p))
        else:
            toggle_btn = StyledButton("Yayına Al", variant="success", small=True)
            toggle_btn.clicked.connect(lambda checked, p=prop: self._publish(p))
        layout.addWidget(toggle_btn)

        # Sil butonu
        delete_btn = StyledButton("🗑", variant="danger", small=True)
        delete_btn.setFixedWidth(36)
        delete_btn.setToolTip("Sil")
        delete_btn.clicked.connect(lambda checked, p=prop: self._delete(p))
        layout.addWidget(delete_btn)

        layout.addStretch()
        return widget

    # ─── Aksiyon Metodları ───────────────────────────────────────────────────

    def _publish(self, prop: Property) -> None:
        """Property'yi yayına alır."""
        try:
            property_service.publish_property(prop.id)
            self.load_data()
        except ApiException as e:
            ErrorDialog.show_error(e, parent=self)

    def _unpublish(self, prop: Property) -> None:
        """Property'yi yayından kaldırır."""
        try:
            property_service.unpublish_property(prop.id)
            self.load_data()
        except ApiException as e:
            ErrorDialog.show_error(e, parent=self)

    def _on_edit_property(self, prop: Property) -> None:
        """
        İlan düzenleme butonuna basıldığında çalışır.
        """
        from app.dialogs.property_edit_dialog import PropertyEditDialog
        dialog = PropertyEditDialog(prop, self)
        dialog.property_updated.connect(self.load_data)
        dialog.exec()

    def _delete(self, prop: Property) -> None:
        """Property'yi siler (onay dialog'u ile)."""
        reply = QMessageBox.question(
            self,
            "İlanı Sil",
            f'"{prop.title}" ilanını silmek istediğinize emin misiniz?\n'
            "Bu işlem geri alınamaz.",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No,
            QMessageBox.StandardButton.No,
        )
        if reply == QMessageBox.StandardButton.Yes:
            try:
                property_service.delete_property(prop.id)
                self.load_data()
            except ApiException as e:
                ErrorDialog.show_error(e, parent=self)

    def _open_create_dialog(self) -> None:
        """Yeni ilan oluşturma dialog'unu açar."""
        dialog = PropertyCreateDialog(parent=self)
        dialog.property_created.connect(self.load_data)
        dialog.exec()

    # ─── Sayfalama ───────────────────────────────────────────────────────────

    def _prev_page(self) -> None:
        """Bir önceki sayfaya gider."""
        if self._current_page > 1:
            self._current_page -= 1
            self.load_data()

    def _next_page(self) -> None:
        """Bir sonraki sayfaya gider."""
        if self._current_page < self._total_pages:
            self._current_page += 1
            self.load_data()

    def _update_pagination_controls(self) -> None:
        """Sayfalama butonlarını günceller."""
        self._page_label.setText(f"Sayfa {self._current_page} / {self._total_pages}")
        self._prev_btn.setEnabled(self._current_page > 1)
        self._next_btn.setEnabled(self._current_page < self._total_pages)

    def resizeEvent(self, event) -> None:
        """Pencere boyutu değişince overlay'i güncelle."""
        self._loading.setGeometry(self.rect())
        super().resizeEvent(event)

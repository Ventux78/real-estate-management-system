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

from PySide6.QtWidgets import (
    QDialog,
    QVBoxLayout,
    QHBoxLayout,
    QLabel,
    QFormLayout,
    QWidget,
    QScrollArea,
    QFrame,
)
from PySide6.QtCore import Qt, Signal

from app.services.property_service import property_service
from app.models.property import CreatePropertyRequest
from app.api.exceptions import ApiException
from app.config.constants import Colors, FontSizes, ListingType, PropertyType
from app.widgets.styled_button import StyledButton
from app.widgets.styled_input import StyledLineEdit, StyledComboBox, StyledTextEdit
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

        self._city_input = StyledLineEdit(placeholder="Şehir")
        self._add_form_row(form_layout, "Şehir *", self._city_input)

        self._district_input = StyledLineEdit(placeholder="İlçe")
        self._add_form_row(form_layout, "İlçe *", self._district_input)

        self._address_input = StyledLineEdit(placeholder="Tam adres")
        self._add_form_row(form_layout, "Adres *", self._address_input)

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

        1. Form validasyonu
        2. CreatePropertyRequest oluşturma
        3. PropertyService.create_property() çağrısı
        4. Başarıysa property_created sinyali + dialog kapanma
        """
        self._error_label.hide()
        self._save_btn.setEnabled(False)
        self._save_btn.setText("Kaydediliyor...")

        # Form değerlerini al
        title = self._title_input.text().strip()
        price_str = self._price_input.text().strip()
        city = self._city_input.text().strip()
        district = self._district_input.text().strip()
        address = self._address_input.text().strip()
        description = self._description_input.toPlainText().strip() or None
        listing_type = self._listing_type_combo.currentData()
        property_type = self._property_type_combo.currentData()

        # Validasyon
        is_valid, errors = validate_create_property_form(
            title, price_str, city, district, address
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
                city=city,
                district=district,
                address=address,
                description=description,
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

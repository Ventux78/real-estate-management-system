"""
app/widgets/styled_input.py
============================
Amaç:
    Uygulamada tutarlı form input görünümü için QLineEdit, QComboBox,
    SearchableComboBox ve QTextEdit wrapper'ları.
"""

from typing import Any
from PySide6.QtWidgets import (
    QLineEdit,
    QComboBox,
    QTextEdit,
    QPushButton,
    QFrame,
    QVBoxLayout,
    QListWidget,
    QListWidgetItem,
)
from PySide6.QtCore import Qt, Signal, QPoint
from PySide6.QtGui import QCursor

from app.config.constants import Colors, Dimensions


_INPUT_BASE = f"""
    background-color: {Colors.SURFACE_2};
    color: {Colors.TEXT_PRIMARY};
    border: 1px solid {Colors.BORDER};
    border-radius: 6px;
    padding: 6px 10px;
    font-size: 11pt;
    selection-background-color: {Colors.PRIMARY};
"""

_INPUT_FOCUS = f"""
    border: 1px solid {Colors.PRIMARY};
    outline: none;
"""

_INPUT_ERROR = f"""
    border: 1px solid {Colors.DANGER};
"""


def normalize_tr(text: str) -> str:
    """Türkçe karakter duyarsız arama için metni normalleştirir."""
    if not text:
        return ""
    mapping = str.maketrans({
        "I": "i", "İ": "i", "ı": "i",
        "Ğ": "g", "ğ": "g",
        "Ü": "u", "ü": "u",
        "Ş": "s", "ş": "s",
        "Ö": "o", "ö": "o",
        "Ç": "c", "ç": "c",
    })
    return text.translate(mapping).lower()


class StyledLineEdit(QLineEdit):
    """
    Özelleştirilmiş tek satırlı metin girdi alanı.
    """

    def __init__(
        self,
        placeholder: str = "",
        password: bool = False,
        parent=None,
    ) -> None:
        super().__init__(parent)
        self.setPlaceholderText(placeholder)
        self.setMinimumHeight(Dimensions.INPUT_HEIGHT)
        if password:
            self.setEchoMode(QLineEdit.EchoMode.Password)
        self._apply_base_style()

    def _apply_base_style(self) -> None:
        self.setStyleSheet(f"""
            QLineEdit {{
                {_INPUT_BASE}
            }}
            QLineEdit:focus {{
                {_INPUT_FOCUS}
            }}
            QLineEdit::placeholder {{
                color: {Colors.TEXT_MUTED};
            }}
        """)

    def show_error(self) -> None:
        """Kırmızı çerçeve gösterir (validasyon hatası)."""
        self.setStyleSheet(f"""
            QLineEdit {{
                {_INPUT_BASE}
                {_INPUT_ERROR}
            }}
            QLineEdit:focus {{
                {_INPUT_ERROR}
            }}
        """)

    def clear_error(self) -> None:
        """Normal görünüme geri döner."""
        self._apply_base_style()


class StyledComboBox(QComboBox):
    """
    Özelleştirilmiş standart açılır liste (dropdown).
    """

    def __init__(self, parent=None) -> None:
        super().__init__(parent)
        self.setMinimumHeight(Dimensions.INPUT_HEIGHT)
        self.setMaxVisibleItems(8)

        view = self.view()
        if view:
            view.setVerticalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAsNeeded)

        self._apply_style()

    def wheelEvent(self, event) -> None:
        """Mouse wheel ile kapalıyken kazara değiştirilmeyi engeller."""
        view = self.view()
        if view and view.isVisible():
            super().wheelEvent(event)
        else:
            event.ignore()

    def _apply_style(self) -> None:
        self.setStyleSheet(f"""
            QComboBox {{
                {_INPUT_BASE}
            }}
            QComboBox:focus {{
                {_INPUT_FOCUS}
            }}
            QComboBox::drop-down {{
                border: none;
                width: 28px;
            }}
            QComboBox::down-arrow {{
                width: 12px;
                height: 12px;
            }}
            QComboBox QAbstractItemView {{
                background-color: {Colors.SURFACE_2};
                color: {Colors.TEXT_PRIMARY};
                border: 1px solid {Colors.BORDER};
                border-radius: 6px;
                selection-background-color: {Colors.PRIMARY};
                selection-color: #ffffff;
                outline: none;
                padding: 2px;
            }}
            QComboBox QAbstractItemView::item {{
                min-height: 28px;
                padding: 4px 8px;
                border-radius: 4px;
            }}
            QComboBox QAbstractItemView::item:hover {{
                background-color: {Colors.PRIMARY};
                color: #ffffff;
            }}
            QComboBox QAbstractItemView QScrollBar:vertical {{
                background: {Colors.SURFACE};
                width: 8px;
                margin: 0;
                border-radius: 4px;
            }}
            QComboBox QAbstractItemView QScrollBar::handle:vertical {{
                background: {Colors.BORDER};
                min-height: 30px;
                border-radius: 4px;
            }}
            QComboBox QAbstractItemView QScrollBar::handle:vertical:hover {{
                background: {Colors.PRIMARY};
            }}
            QComboBox QAbstractItemView QScrollBar::add-line:vertical,
            QComboBox QAbstractItemView QScrollBar::sub-line:vertical {{
                height: 0;
            }}
        """)


class SearchablePopup(QFrame):
    """SearchableComboBox için özel açılır arama penceresi."""

    def __init__(self, combo_box: "SearchableComboBox") -> None:
        super().__init__(None, Qt.WindowType.Popup | Qt.WindowType.FramelessWindowHint)
        self._combo = combo_box
        self.setFocusPolicy(Qt.FocusPolicy.StrongFocus)
        self.setStyleSheet(f"""
            QFrame {{
                background-color: {Colors.SURFACE_2};
                border: 1px solid {Colors.BORDER};
                border-radius: 8px;
            }}
        """)

        layout = QVBoxLayout(self)
        layout.setContentsMargins(8, 8, 8, 8)
        layout.setSpacing(6)

        # Arama Kutusu
        self.search_input = StyledLineEdit(placeholder="🔍 Ara...")
        self.search_input.textChanged.connect(self._on_search_changed)
        layout.addWidget(self.search_input)

        # Liste
        self.list_widget = QListWidget()
        self.list_widget.setFixedHeight(210)
        self.list_widget.setVerticalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAsNeeded)
        self.list_widget.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)
        self.list_widget.setStyleSheet(f"""
            QListWidget {{
                background-color: transparent;
                border: none;
                outline: none;
            }}
            QListWidget::item {{
                color: {Colors.TEXT_PRIMARY};
                padding: 6px 10px;
                border-radius: 4px;
                min-height: 26px;
            }}
            QListWidget::item:hover, QListWidget::item:selected {{
                background-color: {Colors.PRIMARY};
                color: #ffffff;
            }}
            QScrollBar:vertical {{
                background: {Colors.SURFACE};
                width: 8px;
                margin: 0;
                border-radius: 4px;
            }}
            QScrollBar::handle:vertical {{
                background: {Colors.BORDER};
                min-height: 30px;
                border-radius: 4px;
            }}
            QScrollBar::handle:vertical:hover {{
                background: {Colors.PRIMARY};
            }}
            QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {{
                height: 0;
            }}
        """)
        self.list_widget.itemClicked.connect(self._on_item_clicked)
        layout.addWidget(self.list_widget)

    def _on_search_changed(self, text: str) -> None:
        """Arama metni değiştiğinde elemanları filtreler."""
        query = normalize_tr(text)
        for i in range(self.list_widget.count()):
            item = self.list_widget.item(i)
            item_text = normalize_tr(item.text())
            item.setHidden(bool(query and query not in item_text))

    def _on_item_clicked(self, item: QListWidgetItem) -> None:
        """Elemana tıklandığında seçimi güncelle ve popup'ı kapat."""
        index = item.data(Qt.ItemDataRole.UserRole + 1)
        self._combo._select_index(index)
        self.hide()


class SearchableComboBox(QPushButton):
    """
    Arama özelliğine sahip, modern ve kompakt hiyerarşik seçim bileşeni.
    """

    currentIndexChanged = Signal(int)

    def __init__(self, placeholder: str = "-- Seçiniz --", parent=None) -> None:
        super().__init__(parent)
        self._placeholder = placeholder
        self._items: list[tuple[str, Any]] = []
        self._current_index: int = -1

        self.setMinimumHeight(Dimensions.INPUT_HEIGHT)
        self.setCursor(QCursor(Qt.CursorShape.PointingHandCursor))
        self.setText(self._placeholder)
        self._apply_style()

        self.popup = SearchablePopup(self)

    def wheelEvent(self, event) -> None:
        """Mouse wheel ile kapalıyken kazara seçim değişmesini engeller."""
        event.ignore()

    def addItem(self, text: str, userData: Any = None) -> None:
        """Eleman ekler."""
        self._items.append((text, userData))
        if self._current_index == -1 and len(self._items) == 1:
            self._select_index(0)

    def addItems(self, texts: list[str]) -> None:
        for t in texts:
            self.addItem(t, t)

    def clear(self) -> None:
        """Tüm elemanları temizler."""
        self._items.clear()
        self._current_index = -1
        self.setText(self._placeholder)
        self.popup.list_widget.clear()

    def count(self) -> int:
        return len(self._items)

    def currentIndex(self) -> int:
        return self._current_index

    def currentText(self) -> str:
        if 0 <= self._current_index < len(self._items):
            return self._items[self._current_index][0]
        return ""

    def currentData(self) -> Any:
        if 0 <= self._current_index < len(self._items):
            return self._items[self._current_index][1]
        return None

    def findData(self, data: Any) -> int:
        for idx, (_, d) in enumerate(self._items):
            if d == data:
                return idx
        return -1

    def findText(self, text: str) -> int:
        for idx, (t, _) in enumerate(self._items):
            if t == text:
                return idx
        return -1

    def setCurrentIndex(self, index: int) -> None:
        if 0 <= index < len(self._items):
            self._select_index(index)
        elif index == -1 or len(self._items) == 0:
            self._current_index = -1
            self.setText(self._placeholder)

    def _select_index(self, index: int) -> None:
        if index != self._current_index and 0 <= index < len(self._items):
            self._current_index = index
            text, _ = self._items[index]
            self.setText(f"{text}   ▼")
            self.currentIndexChanged.emit(index)
        elif 0 <= index < len(self._items):
            text, _ = self._items[index]
            self.setText(f"{text}   ▼")

    def mousePressEvent(self, event) -> None:
        """Tıklandığında arama popup'ını açar."""
        if not self.isEnabled() or len(self._items) == 0:
            return

        # Popupa elemanları yükle
        self.popup.list_widget.clear()
        for idx, (text, data) in enumerate(self._items):
            item = QListWidgetItem(text)
            item.setData(Qt.ItemDataRole.UserRole + 1, idx)
            self.popup.list_widget.addItem(item)
            if idx == self._current_index:
                self.popup.list_widget.setCurrentItem(item)

        self.popup.search_input.clear()
        self.popup.setFixedWidth(max(self.width(), 260))

        # Konum hesaplama
        global_pos = self.mapToGlobal(QPoint(0, self.height() + 4))
        self.popup.move(global_pos)
        self.popup.show()
        self.popup.search_input.setFocus()

    def _apply_style(self) -> None:
        self.setStyleSheet(f"""
            QPushButton {{
                {_INPUT_BASE}
                text-align: left;
                padding-right: 28px;
            }}
            QPushButton:focus {{
                {_INPUT_FOCUS}
            }}
            QPushButton:disabled {{
                background-color: {Colors.BACKGROUND};
                color: {Colors.TEXT_MUTED};
                border-color: {Colors.BORDER};
            }}
        """)


class StyledTextEdit(QTextEdit):
    """
    Özelleştirilmiş çok satırlı metin girdi alanı.
    """

    def __init__(self, placeholder: str = "", parent=None) -> None:
        super().__init__(parent)
        self.setPlaceholderText(placeholder)
        self.setStyleSheet(f"""
            QTextEdit {{
                {_INPUT_BASE}
            }}
            QTextEdit:focus {{
                {_INPUT_FOCUS}
            }}
        """)

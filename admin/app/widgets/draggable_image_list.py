"""
app/widgets/draggable_image_list.py
===================================
Amaç:
    PySide6 Admin Paneli Fotoğraf Yönetimi için Drag & Drop sıralama listesi widget'ı.
    Fotoğraf kartları fare ile tutulup sürüklenebilir ve istenilen konuma bırakılabilir.
    Sürükleme anında yarı saydam önizleme (%70 opaklık) gösterir.
    Bırakıldığı anda 'order_changed(new_ids: list[str])' sinyalini tetikler.
"""

from typing import Any
from PySide6.QtWidgets import QListWidget, QAbstractItemView
from PySide6.QtCore import Qt, Signal, QPoint
from PySide6.QtGui import QDrag, QPixmap, QPainter, QDragEnterEvent, QDragMoveEvent, QDropEvent
from app.config.constants import Colors


class DraggableImageListWidget(QListWidget):
    """
    Fotoğraf kartları için sürüklenebilir QListWidget alt sınıfı.
    """
    order_changed = Signal(list)  # Re-ordered list[str] image IDs

    def __init__(self, parent: Any = None) -> None:
        super().__init__(parent)
        self._setup_drag_drop()

    def _setup_drag_drop(self) -> None:
        """Drag & Drop ayarlarını ve görsel stilleri yapılandırır."""
        self.setDragEnabled(True)
        self.setAcceptDrops(True)
        self.setDropIndicatorShown(True)
        self.setDragDropMode(QAbstractItemView.DragDropMode.InternalMove)
        self.setDefaultDropAction(Qt.DropAction.MoveAction)
        self.setSelectionMode(QAbstractItemView.SelectionMode.SingleSelection)

        self.setStyleSheet(f"""
            QListWidget {{
                background-color: {Colors.SURFACE};
                border: 1px solid {Colors.BORDER};
                border-radius: 8px;
                padding: 4px;
            }}
            QListWidget::item {{
                margin-bottom: 6px;
                border-radius: 8px;
            }}
            QListWidget::item:hover {{
                background-color: transparent;
            }}
        """)

    def startDrag(self, supportedActions: Qt.DropAction) -> None:
        """
        Sürükleme işlemini başlatır ve yarı saydam görsel geri bildirim sağlar (%70 Opaklık).
        """
        item = self.currentItem()
        if not item:
            return

        widget = self.itemWidget(item)
        if not widget:
            return

        # Sürüklenen öğenin ekran görüntüsünü al ve yarı saydam yap
        pixmap = widget.grab()
        transparent_pixmap = QPixmap(pixmap.size())
        transparent_pixmap.fill(Qt.GlobalColor.transparent)

        painter = QPainter(transparent_pixmap)
        painter.setOpacity(0.7)  # Yarı saydam sürükleme efekti (Kural 7)
        painter.drawPixmap(0, 0, pixmap)
        painter.end()

        drag = QDrag(self)
        drag.setMimeData(self.mimeData([item]))
        drag.setPixmap(transparent_pixmap)
        drag.setHotSpot(QPoint(transparent_pixmap.width() // 2, transparent_pixmap.height() // 2))

        drag.exec(Qt.DropAction.MoveAction)

    def dragEnterEvent(self, event: QDragEnterEvent) -> None:
        if event.source() == self:
            event.acceptProposedAction()
        else:
            event.ignore()

    def dragMoveEvent(self, event: QDragMoveEvent) -> None:
        if event.source() == self:
            event.acceptProposedAction()
        else:
            event.ignore()

    def dropEvent(self, event: QDropEvent) -> None:
        """
        Bırakma olayını yakalar, yeni sıra ID'lerini hesaplar ve order_changed sinyalini tetikler.
        """
        source_item = self.currentItem()
        if not source_item:
            event.ignore()
            return

        target_item = self.itemAt(event.position().toPoint())
        source_row = self.row(source_item)

        if target_item:
            target_row = self.row(target_item)
        else:
            target_row = self.count() - 1

        if source_row < 0 or source_row == target_row:
            event.accept()
            return

        # Mevcut resim ID listesini topla
        image_ids: list[str] = []
        for i in range(self.count()):
            item = self.item(i)
            widget = self.itemWidget(item)
            if widget and hasattr(widget, "image") and hasattr(widget.image, "id"):
                image_ids.append(widget.image.id)

        if not image_ids or source_row >= len(image_ids):
            event.accept()
            return

        # Sürüklenen öğeyi yeni konuma taşı
        dragged_id = image_ids.pop(source_row)
        if target_row > len(image_ids):
            target_row = len(image_ids)
        image_ids.insert(target_row, dragged_id)

        event.accept()
        self.order_changed.emit(image_ids)

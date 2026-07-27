"""
app/widgets/draggable_image_list.py
===================================
Amaç:
    PySide6 Admin Paneli Fotoğraf Yönetimi için Drag & Drop sıralama listesi widget'ı.
    Fotoğraf kartları fare ile tutulup sürüklenebilir ve istenilen konuma bırakılabilir.
    Bırakıldığı anda 'order_changed(new_ids: list[str])' sinyalini tetikler.

    Sprint 11.3 ekı: Windows Explorer'dan (veya başka dosya yöneticisinden)
    dosya veya klasör sürüklenip bırakılabilir. Bırakılan öğeler içindeki
    desteklenen görsel dosyaların yolları 'files_dropped(list[str])' sinyaliyle
    iletilir.

Kritik Notlar:
    - dragMoveEvent'te super() ÇAĞRILMAMALI: Qt InternalMove modunda text/plain
      mime type'ını tanımaz ve event.ignore() çağırır → drop asla çalışmaz.
    - Dahili (internal) drag-drop ile harici (Explorer) drag-drop özen bir şekilde
      ayrıştırılır: event.source() == self → dahili, hasUrls() → harici.
    - ImageItemWidget içindeki label'lar WA_TransparentForMouseEvents ile mouse
      event'lerini ImageItemWidget'a iletir; bu da drag'ı başlatır.
"""

import os
from pathlib import Path
from typing import Any
from PySide6.QtWidgets import QListWidget, QAbstractItemView, QToolTip
from PySide6.QtCore import Qt, Signal, QPoint, QMimeData
from PySide6.QtGui import QDrag, QPixmap, QPainter, QDragEnterEvent, QDragMoveEvent, QDropEvent, QCursor
from app.config.constants import Colors


# Desteklenen görsel uzantıları — magic string kullanılmaz
SUPPORTED_IMAGE_EXTENSIONS: frozenset[str] = frozenset({
    ".jpg", ".jpeg", ".png", ".webp",
})


class DraggableImageListWidget(QListWidget):
    """
    Fotoğraf kartları için sürüklenebilir QListWidget alt sınıfı.

    Signals:
        order_changed: Dahili sıralama değiştiğinde emit edilir (list[str] — image ID'leri).
        files_dropped:  Explorer/klasörden harici dosya bırakıldığında emit edilir (list[str] — dosya yolları).
    """
    order_changed = Signal(list)   # Yeniden sıralanmış list[str] image ID listesi
    files_dropped = Signal(list)  # Explorer'dan bırakılan list[str] dosya yolları

    def __init__(self, parent: Any = None) -> None:
        super().__init__(parent)
        self._setup_drag_drop()

    def _setup_drag_drop(self) -> None:
        """Drag & Drop ayarlarını ve görsel stilleri yapılandırır."""
        self.setDragEnabled(True)
        self.setAcceptDrops(True)
        self.setDropIndicatorShown(True)
        # InternalMove: item'ları sürüklemeye izin ver, drop indicator göster
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
            QListWidget::drop-indicator {{
                background-color: #3b82f6;
                height: 4px;
                margin-left: 8px;
                margin-right: 8px;
                border-radius: 2px;
            }}
        """)

    def startDrag(self, supportedActions: Qt.DropAction) -> None:
        """
        Sürükleme işlemini başlatır; yarı saydam widget görüntüsü ile geri bildirim verir.
        Kaynak satır numarasını mime data içine yazar (dropEvent'te okunur).
        """
        item = self.currentItem()
        if not item:
            return

        source_row = self.row(item)
        widget = self.itemWidget(item)

        if widget:
            pixmap = widget.grab()
            transparent_pixmap = QPixmap(pixmap.size())
            transparent_pixmap.fill(Qt.GlobalColor.transparent)
            painter = QPainter(transparent_pixmap)
            painter.setOpacity(0.7)
            painter.drawPixmap(0, 0, pixmap)
            painter.end()
        else:
            transparent_pixmap = QPixmap(200, 60)
            transparent_pixmap.fill(Qt.GlobalColor.transparent)

        mime_data = QMimeData()
        mime_data.setText(str(source_row))  # Kaynak satırı mime data içinde sakla

        drag = QDrag(self)
        drag.setMimeData(mime_data)
        drag.setPixmap(transparent_pixmap)
        drag.setHotSpot(QPoint(transparent_pixmap.width() // 2, 30))

        drag.exec(Qt.DropAction.MoveAction)

    def dragEnterEvent(self, event: QDragEnterEvent) -> None:
        """Dahili (internal) ve harici (Explorer/klasör) drag-drop'u ayırır."""
        if event.source() == self:
            # Dahili sıralama — mevcut mantık
            event.acceptProposedAction()
        elif event.mimeData().hasUrls():
            # Harici — Explorer veya başka dosya yöneticisi
            event.acceptProposedAction()
        else:
            event.ignore()

    def dragMoveEvent(self, event: QDragMoveEvent) -> None:
        """
        ÖNEMLİ: super().dragMoveEvent() ÇAĞRILMAMALI.
        Qt'nin InternalMove implementasyonu text/plain mime type'ını tanımaz ve
        event.ignore() çağırır → imleç yasak simgesi gösterir → dropEvent hiç tetiklenmez.
        Biz event'i kendimiz accept ediyoruz.
        """
        if event.source() == self:
            event.setDropAction(Qt.DropAction.MoveAction)
            event.acceptProposedAction()

            # Sürüklenen fotoğrafın hedef konumunu hesapla ve tooltip olarak göster
            try:
                source_row = int(event.mimeData().text())
            except (ValueError, AttributeError):
                source_row = -1

            target_row = self._get_insert_row(event.position().toPoint())
            count = self.count()
            target_row = min(target_row, count)
            insert_at = target_row if target_row <= source_row else target_row - 1
            insert_at = max(0, min(insert_at, count - 1))
            display_pos = insert_at + 1  # 1-indeksli gösterim

            is_cover_text = " ⭐ (Kapak)" if display_pos == 1 else ""
            QToolTip.showText(
                QCursor.pos(),
                f"📷 Sıra: {display_pos}{is_cover_text}",
                self
            )
        elif event.mimeData().hasUrls():
            # Harici kaynak — kabul et, tooltip gösterme
            event.acceptProposedAction()
        else:
            event.ignore()

    def dropEvent(self, event: QDropEvent) -> None:
        """
        Drop gerçekleştiğinde kaynak tipine göre iki yol izlenir:
        1. Dahili (internal) kaynak → sıralama değişikliği.
        2. Harici kaynak (Explorer/klasör) → dosya ekleme.
        """
        if event.mimeData().hasUrls() and event.source() != self:
            # Harici drop — Explorer veya klasör
            event.acceptProposedAction()
            self._handle_external_drop(event)
            return

        if event.source() != self:
            event.ignore()
            return

        # Mime data'dan kaynak satırı oku (startDrag'da set edildi)
        try:
            source_row = int(event.mimeData().text())
        except (ValueError, AttributeError):
            event.setDropAction(Qt.DropAction.IgnoreAction)
            event.accept()
            return

        # Drop öncesi mevcut ID sırasını kaydet
        pre_drop_ids: list[str] = []
        for i in range(self.count()):
            it = self.item(i)
            w = self.itemWidget(it)
            if w and hasattr(w, "image") and hasattr(w.image, "id"):
                pre_drop_ids.append(w.image.id)

        count = len(pre_drop_ids)
        if not pre_drop_ids or source_row < 0 or source_row >= count:
            event.setDropAction(Qt.DropAction.IgnoreAction)
            event.accept()
            return

        # Hedef satırı hesapla
        target_row = self._get_insert_row(event.position().toPoint())
        target_row = min(target_row, count)

        # pop sonrası gerçek insert indeksini hesapla
        insert_at = target_row if target_row <= source_row else target_row - 1
        insert_at = max(0, min(insert_at, count - 1))

        # Aynı yere bırakıldıysa işlem yok
        if insert_at == source_row:
            event.setDropAction(Qt.DropAction.IgnoreAction)
            event.accept()
            return

        # Yeni sırayı hesapla
        new_ids = list(pre_drop_ids)
        dragged_id = new_ids.pop(source_row)
        new_ids.insert(insert_at, dragged_id)

        # Qt'nin internal taşımasını engelle; _render_images() listeyi yeniden çizer
        event.setDropAction(Qt.DropAction.IgnoreAction)
        event.accept()

        # Üst diyaloğa bildir
        self.order_changed.emit(new_ids)

    def _handle_external_drop(self, event: QDropEvent) -> None:
        """
        Explorer veya dosya yöneticisinden bırakılan dosya/klasörleri işler.

        - Dosya: Desteklenen uzantıysa listeye ekler.
        - Klasör: Yalnızca doğrudan alt öğeleri tarar (recursive değil).
          Desteklenen görsel dosyaları sıralanmış şekilde alır.

        Args:
            event: Drop event.
        """
        paths: list[str] = []
        for qurl in event.mimeData().urls():
            local_path = qurl.toLocalFile()
            if not local_path:
                continue

            if os.path.isfile(local_path):
                # Tekil dosya
                if Path(local_path).suffix.lower() in SUPPORTED_IMAGE_EXTENSIONS:
                    paths.append(local_path)
            elif os.path.isdir(local_path):
                # Klasör — sadece doğrudan öğeler (alt klasör taranmaz)
                try:
                    entries = sorted(os.listdir(local_path))
                except OSError:
                    continue
                for entry in entries:
                    full = os.path.join(local_path, entry)
                    if os.path.isfile(full) and Path(full).suffix.lower() in SUPPORTED_IMAGE_EXTENSIONS:
                        paths.append(full)

        if paths:
            self.files_dropped.emit(paths)

    def _get_insert_row(self, drop_pos: QPoint) -> int:
        """
        Drop pozisyonundan insert indeksini hesaplar.
        Her item rect'inin orta noktasına göre üste mi yoksa alta mı ekleneceği belirlenir.
        """
        count = self.count()
        if count == 0:
            return 0

        for i in range(count):
            item = self.item(i)
            if item is None:
                continue
            rect = self.visualItemRect(item)
            if drop_pos.y() < rect.top() + rect.height() // 2:
                return i

        return count

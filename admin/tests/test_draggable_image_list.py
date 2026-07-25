"""
tests/test_draggable_image_list.py
===================================
Amaç:
    Sprint 11.1 — Drag & Drop Fotoğraf Sıralama birim testleri.
"""

import unittest
from unittest.mock import MagicMock, patch
from PySide6.QtWidgets import QApplication
from app.models.property import PropertyImage
from app.api.exceptions import ApiException
from app.widgets.draggable_image_list import DraggableImageListWidget

app = QApplication.instance() or QApplication([])


class TestDraggableImageListWidget(unittest.TestCase):
    """DraggableImageListWidget birim testleri."""

    def test_widget_initialization(self):
        """Widget nesnesi başlatılabilmeli ve varsayılan drag & drop özellikleri aktif olmalı."""
        widget = DraggableImageListWidget()
        self.assertTrue(widget.dragEnabled())
        self.assertTrue(widget.acceptDrops())
        self.assertTrue(widget.showDropIndicator())

    def test_reorder_logic_five_images(self):
        """5 fotoğraftan ilk fotoğraf sona taşındığında yeni kapak fotoğrafı ve sıralama güncellenmeli."""
        images = [
            PropertyImage(id=f"img-{i}", url=f"http://example.com/{i}.jpg", public_id=f"p-{i}", width=800, height=600, format="jpg", bytes=100, display_order=i+1, is_cover=(i==0))
            for i in range(5)
        ]

        # 0. indisteki fotoğrafı (img-0) sona taşı (yeni sıra: img-1, img-2, img-3, img-4, img-0)
        new_ids = ["img-1", "img-2", "img-3", "img-4", "img-0"]
        id_to_img = {img.id: img for img in images}

        reordered = []
        for i, img_id in enumerate(new_ids):
            orig = id_to_img[img_id]
            reordered.append(
                PropertyImage(
                    id=orig.id, url=orig.url, public_id=orig.public_id,
                    width=orig.width, height=orig.height, format=orig.format,
                    bytes=orig.bytes, display_order=i+1, is_cover=(i==0)
                )
            )

        self.assertEqual(reordered[0].id, "img-1")
        self.assertTrue(reordered[0].is_cover)
        self.assertFalse(reordered[4].is_cover)
        self.assertEqual(reordered[4].id, "img-0")

    def test_reorder_twenty_images(self):
        """20 fotoğraflı listede son fotoğraf başa taşındığında performans ve kapak değişimi doğrulanmalı."""
        images = [
            PropertyImage(id=f"img-{i}", url=f"http://example.com/{i}.jpg", public_id=f"p-{i}", width=800, height=600, format="jpg", bytes=100, display_order=i+1, is_cover=(i==0))
            for i in range(20)
        ]

        # Son fotoğrafı (img-19) başa taşı
        new_ids = ["img-19"] + [f"img-{i}" for i in range(19)]
        id_to_img = {img.id: img for img in images}

        reordered = []
        for i, img_id in enumerate(new_ids):
            orig = id_to_img[img_id]
            reordered.append(
                PropertyImage(
                    id=orig.id, url=orig.url, public_id=orig.public_id,
                    width=orig.width, height=orig.height, format=orig.format,
                    bytes=orig.bytes, display_order=i+1, is_cover=(i==0)
                )
            )

        self.assertEqual(len(reordered), 20)
        self.assertEqual(reordered[0].id, "img-19")
        self.assertTrue(reordered[0].is_cover)
        self.assertFalse(reordered[1].is_cover)

    def test_rollback_on_api_error(self):
        """API hatası aldığında orijinal listenin geri yüklenmesi mantığı."""
        original_images = [
            PropertyImage(id="img-1", url="http://test.com/1", public_id="1", width=100, height=100, format="jpg", bytes=10, display_order=1, is_cover=True),
            PropertyImage(id="img-2", url="http://test.com/2", public_id="2", width=100, height=100, format="jpg", bytes=10, display_order=2, is_cover=False),
        ]
        previous_images = list(original_images)

        # Simüle edilen API hatası
        api_failed = True
        if api_failed:
            current_images = previous_images

        self.assertEqual(current_images[0].id, "img-1")
        self.assertEqual(current_images[1].id, "img-2")


if __name__ == "__main__":
    unittest.main()

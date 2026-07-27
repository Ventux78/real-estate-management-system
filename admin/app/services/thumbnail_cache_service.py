"""
app/services/thumbnail_cache_service.py
========================================
Amaç:
    Thumbnail görsellerini bellek (RAM) içinde LRU önbelleğiyle saklar.
    Aynı ilanın fotoğrafları ikinci kez açıldığında ağ isteği yapılmaz;
    önbellekteki QPixmap doğrudan kullanılır.

    Yükleme işlemi: ThumbnailLoaderWorker sınıfı aracılığıyla arka planda
    gerçekleştirilir. Mevcut Qt ağ altyapısı (QNetworkAccessManager) kullanılır.
    requests kütüphanesi bu modülde kullanılmaz.

Tasarım Notları:
    - LRU cache: collections.OrderedDict tabanlı.
      get() → move_to_end (en güncel).
      put() → MAX_ENTRIES aşılırsa en eski (first) çıkar.
    - Yalnızca ölçeklenmiş (thumbnail) QPixmap'ler saklanır; tam çözünürlük
      tutulmaz → düşük RAM kullanımı.
    - Cache invalidation: tek URL bazlıdır (invalidate(url)).
      Tüm cache asla temizlenmez; yalnızca upload/delete işlemlerinde
      ilgili URL kaldırılır.
    - Thumbnail boyutu: widget'ın image_label boyutundan gelir (hardcode 120×90 yok).
      Boyut değişirse cache kendiliğinden yeni boyutu üretir.
    - Singleton pattern: thumbnail_cache_service.

Mimari içindeki görevi:
    View → ThumbnailLoaderWorker → ThumbnailCacheService → QPixmap
    ImageItemWidget, cache'e istek yapar; cache eksikse Worker başlatır.
"""

import logging
from collections import OrderedDict
from typing import Optional

from PySide6.QtCore import QObject, QSize, Qt, Signal, QUrl
from PySide6.QtGui import QPixmap
from PySide6.QtNetwork import QNetworkAccessManager, QNetworkReply, QNetworkRequest

logger = logging.getLogger(__name__)


class ThumbnailCacheService:
    """
    LRU tabanlı thumbnail bellek önbelleği.

    OrderedDict kullanılır:
    - get(): move_to_end → en son kullanılan sona taşınır.
    - put(): MAX_ENTRIES aşılırsa en eskiyi (ilk girdi) çıkar.

    Attributes:
        MAX_ENTRIES: Maksimum önbellek girdi sayısı.
    """

    MAX_ENTRIES: int = 200

    def __init__(self) -> None:
        self._cache: OrderedDict[str, QPixmap] = OrderedDict()

    # ─── Sorgulama ────────────────────────────────────────────────────────────

    def has(self, url: str) -> bool:
        """
        Verilen URL'nin önbellekte olup olmadığını kontrol eder.

        Args:
            url: Kontrol edilecek görsel URL'si.

        Returns:
            bool: Önbellekte mevcutsa True.
        """
        return url in self._cache

    def get(self, url: str) -> Optional[QPixmap]:
        """
        Önbelleğe alınmış thumbnail'ı döndürür.

        LRU kuralı gereği erişilen girdi en sona taşınır.

        Args:
            url: Görsel URL'si.

        Returns:
            QPixmap veya None (önbellekte yoksa).
        """
        if url not in self._cache:
            return None
        self._cache.move_to_end(url)
        return self._cache[url]

    # ─── Yazma ────────────────────────────────────────────────────────────────

    def put(self, url: str, pixmap: QPixmap) -> None:
        """
        Thumbnail'ı önbelleğe ekler.

        Kapasite doluysa en eski (LRU) girdi çıkarılır.

        Args:
            url:    Görsel URL'si (anahtar).
            pixmap: Ölçeklenmiş thumbnail QPixmap'i.
        """
        if url in self._cache:
            self._cache.move_to_end(url)
        else:
            if len(self._cache) >= self.MAX_ENTRIES:
                oldest_url, _ = self._cache.popitem(last=False)
                logger.debug(f"ThumbnailCache: LRU eviction → {oldest_url[:60]}…")
        self._cache[url] = pixmap

    # ─── Geçersiz Kılma ───────────────────────────────────────────────────────

    def invalidate(self, url: str) -> None:
        """
        Belirli bir URL'nin önbellek girdisini siler.

        Fotoğraf yüklendiğinde, silindiğinde veya değiştirildiğinde
        çağrılır. Tüm önbellek asla temizlenmez.

        Args:
            url: Geçersiz kılınacak görsel URL'si.
        """
        if url in self._cache:
            del self._cache[url]
            logger.debug(f"ThumbnailCache: Invalidated → {url[:60]}…")

    def clear(self) -> None:
        """Tüm önbelleği temizler (yalnızca zorunlu durumlarda)."""
        self._cache.clear()
        logger.debug("ThumbnailCache: Cleared.")

    def size(self) -> int:
        """Önbellekteki mevcut girdi sayısını döndürür."""
        return len(self._cache)


# ─── Singleton Instance ───────────────────────────────────────────────────────

thumbnail_cache_service = ThumbnailCacheService()


# ─── ThumbnailLoaderWorker ────────────────────────────────────────────────────

class ThumbnailLoaderWorker(QObject):
    """
    Arka planda thumbnail indiren ve önbelleğe yazan worker.

    QThread üzerinde çalışır; UI thread'ini bloklamaz.
    QNetworkAccessManager kullanılır — requests kütüphanesi kullanılmaz.

    Worker kendi QNetworkAccessManager örneğini oluşturur; bu sayede
    dialog'un ana-thread NAM'ından bağımsız çalışır ve thread-safety
    sorunu oluşmaz.

    Signals:
        loaded: Thumbnail başarıyla yüklendiğinde (url, pixmap) emit edilir.
        failed: Yükleme başarısız olduğunda (url) emit edilir.
    """

    loaded = Signal(str, QPixmap)  # url, scaled pixmap
    failed = Signal(str)           # url

    def __init__(
        self,
        url: str,
        target_size: QSize,
    ) -> None:
        """
        Args:
            url:         İndirilecek görsel URL'si.
            target_size: Thumbnail'ın ölçekleneceği hedef boyut.
                         Widget'ın image_label.size()'ından türetilir.
        """
        super().__init__()
        self._url = url
        self._target_size = target_size
        self._nam: Optional[QNetworkAccessManager] = None
        self._reply: Optional[QNetworkReply] = None

    def run(self) -> None:
        """
        Thumbnail yükleme iş akışını başlatır.

        1. Önbellekte varsa anında loaded emit eder (ağ isteği yok).
        2. Yoksa QNetworkAccessManager ile indirir.
        """
        # Önbellek kontrolü
        if thumbnail_cache_service.has(self._url):
            pixmap = thumbnail_cache_service.get(self._url)
            if pixmap is not None:
                logger.debug(f"ThumbnailWorker: Cache hit → {self._url[:60]}…")
                self.loaded.emit(self._url, pixmap)
                return

        # Ağ isteği — worker kendi NAM'ını oluşturur
        self._nam = QNetworkAccessManager()
        request = QNetworkRequest(QUrl(self._url))
        request.setAttribute(
            QNetworkRequest.Attribute.RedirectPolicyAttribute,
            QNetworkRequest.RedirectPolicy.NoLessSafeRedirectPolicy,
        )
        self._reply = self._nam.get(request)
        self._reply.finished.connect(self._on_reply_finished)

    def _on_reply_finished(self) -> None:
        """
        Ağ isteği tamamlandığında çağrılır.

        Başarılıysa pixmap ölçeklenir, önbelleğe yazılır ve loaded emit edilir.
        Hata durumunda failed emit edilir; uygulama çökmez.
        """
        if self._reply is None:
            self.failed.emit(self._url)
            return

        try:
            if self._reply.error() != QNetworkReply.NetworkError.NoError:
                err = self._reply.errorString()
                logger.warning(
                    f"ThumbnailWorker: Ağ hatası [{self._reply.error()}] → {err} | URL: {self._url[:80]}"
                )
                self.failed.emit(self._url)
                return

            raw_data = self._reply.readAll()
            pixmap = QPixmap()
            if not pixmap.loadFromData(raw_data):
                logger.warning(f"ThumbnailWorker: QPixmap.loadFromData başarısız → {self._url[:80]}")
                self.failed.emit(self._url)
                return

            # Küçült — tam çözünürlüklü pixmap hemen bırakılır
            scaled = pixmap.scaled(
                self._target_size,
                Qt.AspectRatioMode.KeepAspectRatio,
                Qt.TransformationMode.SmoothTransformation,
            )
            del pixmap  # tam çözünürlüklü görsel belleği bırak

            # Önbelleğe yaz
            thumbnail_cache_service.put(self._url, scaled)
            logger.debug(
                f"ThumbnailWorker: Yüklendi ({thumbnail_cache_service.size()} cached) "
                f"→ {self._url[:60]}…"
            )
            self.loaded.emit(self._url, scaled)

        except Exception as exc:
            logger.error(f"ThumbnailWorker: Beklenmeyen hata — {exc} | URL: {self._url[:80]}")
            self.failed.emit(self._url)
        finally:
            if self._reply is not None:
                self._reply.deleteLater()
                self._reply = None

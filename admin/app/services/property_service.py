"""
app/services/property_service.py
=================================
Amaç:
    Property domain'inin tüm iş mantığını yönetir.
    CRUD operasyonları, yayın durumu değişikliği ve soft delete buradadır.

Neden bu şekilde tasarlandı:
    - View katmanı HTTP kodunu, endpoint URL'ini veya JSON parsing işlemini
      bilmez; sadece bu servisi çağırır.
    - Her metod ApiException'ı yakalamaz — View katmanı exception handling yapar.
      Böylece her servis metodunu try/except ile sarmak gerekmez.
    - Tip güvenli: her metod Property veya PaginatedPropertyResult döndürür.
    - Singleton pattern: uygulama genelinde tek instance.

Mimari içindeki görevi:
    View → PropertyService → ApiClient → Backend
    Model dönüşümü (dict → Property) bu serviste yapılır.
    View katmanı hiçbir zaman raw dict almaz.
"""

import logging
from typing import Optional, Any

from app.api.client import api_client
from app.config.constants import Endpoints
from app.models.property import (
    Property,
    PropertyStats,
    PaginatedPropertyResult,
    CreatePropertyRequest,
)

logger = logging.getLogger(__name__)


class PropertyService:
    """
    Property yönetim servisi.

    CRUD + publish/unpublish + soft delete operasyonlarını kapsar.

    Tüm metodlar ApiException'ı fırlatabilir.
    View katmanı bu exception'ları yakalayarak kullanıcıya gösterir.
    """

    # ─── List ────────────────────────────────────────────────────────────────

    def get_properties(
        self,
        page: int = 1,
        limit: int = 20,
        sort_by: str = "createdAt",
        sort_order: str = "desc",
    ) -> PaginatedPropertyResult:
        """
        Property listesini backend'den çeker.

        GET /api/v1/properties

        Args:
            page: Sayfa numarası (1-indexed).
            limit: Sayfa başına kayıt sayısı.
            sort_by: Sıralama alanı ('createdAt', 'price', 'title').
            sort_order: Sıralama yönü ('asc', 'desc').

        Returns:
            PaginatedPropertyResult: Property listesi ve sayfalama bilgisi.

        Raises:
            ApiException (ve alt sınıfları): API hatası.
        """
        params = {
            "page": page,
            "limit": limit,
            "sortBy": sort_by,
            "sortOrder": sort_order,
        }
        logger.debug(f"PropertyService.get_properties: params={params}")
        raw = api_client.get(Endpoints.PROPERTIES, params=params)
        # Backend { "success": true, "data": { "data": [...], "pagination": {...} } }
        if isinstance(raw, dict) and "data" in raw:
            raw = raw["data"]
        return PaginatedPropertyResult.from_dict(raw)

    # ─── Get By ID ───────────────────────────────────────────────────────────

    def get_property(self, property_id: str) -> Property:
        """
        Tek bir property'yi ID ile çeker.

        GET /api/v1/properties/:id

        Args:
            property_id: Property UUID.

        Returns:
            Property instance.

        Raises:
            NotFoundException: Property bulunamadı.
            ApiException: API hatası.
        """
        logger.debug(f"PropertyService.get_property: id={property_id}")
        raw = api_client.get(Endpoints.property_detail(property_id))
        # Backend tek kayıt için data wrapper kullanıyor mu kontrol et
        if isinstance(raw, dict) and "data" in raw:
            raw = raw["data"]
        return Property.from_dict(raw)

    # ─── Create ──────────────────────────────────────────────────────────────

    def create_property(self, request: CreatePropertyRequest) -> Property:
        """
        Yeni property oluşturur.

        POST /api/v1/properties

        Args:
            request: Oluşturulacak property verileri.

        Returns:
            Oluşturulan Property instance.

        Raises:
            ValidationException: Backend validasyon hatası.
            UnauthorizedException: Token geçersiz.
            ApiException: API hatası.
        """
        logger.info(f"PropertyService.create_property: title={request.title}")
        payload = request.to_dict()
        raw = api_client.post(Endpoints.PROPERTIES, data=payload)
        # Backend farklı wrapper kullanabilir
        if isinstance(raw, dict) and "data" in raw:
            raw = raw["data"]
        return Property.from_dict(raw)

    # ─── Update ──────────────────────────────────────────────────────────────

    def update_property(
        self,
        property_id: str,
        fields: dict,
    ) -> Property:
        """
        Property'yi günceller.

        PUT /api/v1/properties/:id

        Args:
            property_id: Property UUID.
            fields: Güncellenecek alanlar (camelCase).

        Returns:
            Güncellenmiş Property instance.

        Raises:
            NotFoundException: Property bulunamadı.
            ApiException: API hatası.
        """
        logger.info(f"PropertyService.update_property: id={property_id}")
        raw = api_client.put(Endpoints.property_detail(property_id), data=fields)
        if isinstance(raw, dict) and "data" in raw:
            raw = raw["data"]
        return Property.from_dict(raw)

    # ─── Delete ──────────────────────────────────────────────────────────────

    def delete_property(self, property_id: str) -> None:
        """
        Property'yi soft delete yapar.

        DELETE /api/v1/properties/:id

        Args:
            property_id: Property UUID.

        Raises:
            NotFoundException: Property bulunamadı.
            ApiException: API hatası.
        """
        logger.info(f"PropertyService.delete_property: id={property_id}")
        api_client.delete(Endpoints.property_detail(property_id))

    # ─── Publish / Unpublish ─────────────────────────────────────────────────

    def publish_property(self, property_id: str) -> Property:
        """
        Property'yi yayına alır.

        PATCH /api/v1/properties/:id/publish

        Args:
            property_id: Property UUID.

        Returns:
            Güncellenmiş Property instance.

        Raises:
            NotFoundException: Property bulunamadı.
            ApiException: API hatası.
        """
        logger.info(f"PropertyService.publish_property: id={property_id}")
        raw = api_client.patch(Endpoints.property_publish(property_id))
        if isinstance(raw, dict) and "data" in raw:
            raw = raw["data"]
        return Property.from_dict(raw)

    def unpublish_property(self, property_id: str) -> Property:
        """
        Property'yi yayından kaldırır.

        PATCH /api/v1/properties/:id/unpublish

        Args:
            property_id: Property UUID.

        Returns:
            Güncellenmiş Property instance.

        Raises:
            NotFoundException: Property bulunamadı.
            ApiException: API hatası.
        """
        logger.info(f"PropertyService.unpublish_property: id={property_id}")
        raw = api_client.patch(Endpoints.property_unpublish(property_id))
        if isinstance(raw, dict) and "data" in raw:
            raw = raw["data"]
        return Property.from_dict(raw)

    def get_stats(self) -> PropertyStats:
        """
        İlan istatistiklerini backend'den çeker.

        GET /api/v1/properties/stats

        Tek Prisma transaction'ında 4 COUNT sorgusu çalışır:
          - total:       Soft-delete olmayan toplam ilan
          - published:   Yayındaki ilan
          - unpublished: Taslak ilan
          - deleted:     Silinmiş ilan sayısı

        Returns:
            PropertyStats: İstatistik modeli.

        Raises:
            ApiException: API hatası.
        """
        logger.debug("PropertyService.get_stats")
        raw = api_client.get(Endpoints.PROPERTY_STATS)
        # Backend { "success": true, "data": { "total": ..., ... } }
        if isinstance(raw, dict) and "data" in raw:
            raw = raw["data"]
        return PropertyStats.from_dict(raw)


    def upload_images(self, property_id: str, file_paths: list[str]) -> list["PropertyImage"]:
        """
        Çoklu resim yükler.
        multipart/form-data kullanılarak API'ye gönderilir.
        """
        import os
        logger.info(f"PropertyService.upload_images: property_id={property_id}, files={len(file_paths)}")
        files = []
        file_objs = []
        try:
            for path in file_paths:
                f = open(path, "rb")
                file_objs.append(f)
                files.append(("images", (os.path.basename(path), f, "image/jpeg")))

            raw = api_client.post(Endpoints.property_images(property_id), files=files)
            if isinstance(raw, dict) and "data" in raw:
                raw = raw["data"]
            from app.models.property import PropertyImage
            return [PropertyImage.from_dict(item) for item in raw]
        finally:
            for f in file_objs:
                f.close()

    def delete_image(self, image_id: str) -> None:
        """Bir resmi siler."""
        logger.info(f"PropertyService.delete_image: image_id={image_id}")
        api_client.delete(Endpoints.image_delete(image_id))

    def set_cover_image(self, image_id: str) -> None:
        """Bir resmi kapak fotoğrafı yapar."""
        logger.info(f"PropertyService.set_cover_image: image_id={image_id}")
        api_client.patch(Endpoints.image_cover(image_id))

    def reorder_images(self, property_id: str, orders: list[dict[str, Any]]) -> None:
        """
        Resimlerin sıralamasını günceller.
        orders: [{"id": str, "displayOrder": int}, ...]
        """
        logger.info(f"PropertyService.reorder_images: property_id={property_id}")
        api_client.patch(Endpoints.property_images_order(property_id), json={"images": orders})


# Singleton instance
property_service = PropertyService()

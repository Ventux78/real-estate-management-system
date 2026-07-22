"""
app/services/location_service.py
=================================
Amaç:
    Türkiye İl → İlçe → Mahalle hiyerarşik konum verilerine erişim sağlar.

Neden bu şekilde tasarlandı:
    - View katmanı konum veri kaynağını (JSON/DB/API) bilmez.
    - View yalnızca get_provinces(), get_districts(), get_neighborhoods() metodlarını çağırır.
    - O(1) erişim süresi için yerel JSON verisini belleğe yükler.
    - Singleton yapısındadır.
"""

import json
import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)


class LocationService:
    """
    Konum veri servisi. View katmanını veri kaynağından tamamen soyutlar.
    """

    def __init__(self, json_path: Optional[str] = None) -> None:
        if json_path is None:
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            json_path = os.path.join(base_dir, "data", "turkey_locations.json")

        self._json_path = json_path
        self._locations: dict[str, dict[str, list[str]]] = {}
        self._load_data()

    def _load_data(self) -> None:
        """JSON dosyasını okuyup veriyi hazırlar."""
        try:
            if os.path.exists(self._json_path):
                with open(self._json_path, "r", encoding="utf-8") as f:
                    self._locations = json.load(f)
                logger.info(f"LocationService: {len(self._locations)} il verisi yüklendi.")
            else:
                logger.warning(f"LocationService: Veri dosyası bulunamadı: {self._json_path}")
        except Exception as e:
            logger.error(f"LocationService: Veri yükleme hatası: {e}")
            self._locations = {}

    def get_provinces(self) -> list[str]:
        """
        Sıralı tüm İller listesini döndürür.

        Returns:
            list[str]: İl isimleri listesi.
        """
        return sorted(list(self._locations.keys()))

    def get_districts(self, province: str) -> list[str]:
        """
        Seçilen İle ait sıralı İlçeler listesini döndürür.

        Args:
            province: İl adı.

        Returns:
            list[str]: İlçe isimleri listesi.
        """
        if not province or province not in self._locations:
            return []
        return sorted(list(self._locations[province].keys()))

    def get_neighborhoods(self, province: str, district: str) -> list[str]:
        """
        Seçilen İl ve İlçeye ait sıralı Mahalleler listesini döndürür.

        Args:
            province: İl adı.
            district: İlçe adı.

        Returns:
            list[str]: Mahalle isimleri listesi.
        """
        if not province or not district or province not in self._locations:
            return []
        districts = self._locations[province]
        if district not in districts:
            return []
        return sorted(districts[district])

    def is_valid_location(self, province: str, district: str, neighborhood: str) -> bool:
        """
        İl → İlçe → Mahalle kombinasyonunun geçerli olup olmadığını kontrol eder.

        Args:
            province: İl adı.
            district: İlçe adı.
            neighborhood: Mahalle adı.

        Returns:
            bool: Geçerli ise True.
        """
        if not province or not district or not neighborhood:
            return False
        neighborhoods = self.get_neighborhoods(province, district)
        return neighborhood in neighborhoods


# Singleton instance
location_service = LocationService()

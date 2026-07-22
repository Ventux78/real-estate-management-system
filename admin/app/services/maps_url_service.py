"""
app/services/maps_url_service.py
================================
Amaç:
    Google Maps URL üretimi ve validasyon işlemlerini yönetir.
    Admin panelinde anlık UI önizlemesi ve form validasyonu için kullanılır.

Neden bu şekilde tasarlandı:
    - Yeniden kullanılabilir servis yapısı.
    - İleride Geocoding, Reverse Geocoding, Lat/Lng ve harita servis entegrasyonlarına uygundur.
    - Backend ile tam uyumlu URL formatı türetir ve esnek validasyon yapar.
"""

from urllib.parse import quote_plus, urlparse


class MapsUrlService:
    """
    Google Maps URL üretimi ve validasyon servisi.
    """

    @staticmethod
    def generate_url(
        address: str | None = None,
        neighborhood: str | None = None,
        district: str | None = None,
        province: str | None = None,
    ) -> str:
        """
        Adres bilgilerinden Google Maps arama URL'si türetir.
        Sıra: Adres Detayı (varsa) -> Mahalle -> İlçe -> İl -> Türkiye

        Args:
            address: Adres Detayı.
            neighborhood: Mahalle.
            district: İlçe.
            province: İl.

        Returns:
            Oluşturulan Google Maps URL string'i.
        """
        parts: list[str] = []

        if address and address.strip():
            parts.append(address.strip())
        if neighborhood and neighborhood.strip():
            parts.append(neighborhood.strip())
        if district and district.strip():
            parts.append(district.strip())
        if province and province.strip():
            parts.append(province.strip())

        parts.append("Türkiye")

        query_str = " ".join(parts)
        encoded_query = quote_plus(query_str)
        return f"https://www.google.com/maps/search/?api=1&query={encoded_query}"

    @staticmethod
    def is_valid_url(url: str | None) -> bool:
        """
        Verilen URL'nin geçerli bir Google Maps bağlantısı olup olmadığını esnek şekilde kontrol eder.

        Desteklenen alan adları / formatlar:
        - google.com (örn. google.com/maps, www.google.com/maps...)
        - maps.google.com
        - maps.app.goo.gl
        - goo.gl/maps

        Args:
            url: Kontrol edilecek URL string'i.

        Returns:
            bool: Geçerli ise True, aksi halde False.
        """
        if not url or not isinstance(url, str):
            return False
        trimmed = url.strip()
        if not trimmed:
            return False

        if not (trimmed.startswith("http://") or trimmed.startswith("https://")):
            trimmed = "https://" + trimmed

        try:
            parsed = urlparse(trimmed)
            host = (parsed.netloc or "").lower()
            path = (parsed.path or "").lower()

            if host == "maps.app.goo.gl":
                return True
            if host == "goo.gl" and path.startswith("/maps"):
                return True
            if host == "maps.google.com":
                return True
            if (host == "google.com" or host == "www.google.com" or host.endswith(".google.com")) and "/maps" in path:
                return True

            return False
        except Exception:
            return False


# Singleton instance
maps_url_service = MapsUrlService()

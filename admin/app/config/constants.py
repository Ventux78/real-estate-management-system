"""
app/config/constants.py
=======================
Amaç:
    Uygulamada kullanılan tüm sabit değerleri (enum, string literal)
    merkezi olarak tanımlar.

Neden bu şekilde tasarlandı:
    - Magic string kullanımını engeller.
    - Refactor'ı kolaylaştırır; bir değer değiştiğinde tek yerden güncellenir.
    - Enum kullanımı IDE'de otomatik tamamlama sağlar.

Mimari içindeki görevi:
    Tüm katmanlar (API, Service, View) bu modülden sabit değerleri import alır.
"""

from enum import Enum


class ListingType(str, Enum):
    """İlan tipi — backend enum ile birebir eşleşir."""

    FOR_SALE = "FOR_SALE"
    FOR_RENT = "FOR_RENT"

    def display(self) -> str:
        """Kullanıcıya gösterilecek Türkçe etiket."""
        labels = {
            ListingType.FOR_SALE: "Satılık",
            ListingType.FOR_RENT: "Kiralık",
        }
        return labels.get(self, self.value)


class PropertyType(str, Enum):
    """Mülk tipi — backend enum ile birebir eşleşir."""

    APARTMENT = "APARTMENT"
    HOUSE = "HOUSE"
    LAND = "LAND"
    OFFICE = "OFFICE"
    SHOP = "SHOP"
    WAREHOUSE = "WAREHOUSE"
    OTHER = "OTHER"

    def display(self) -> str:
        """Kullanıcıya gösterilecek Türkçe etiket."""
        labels = {
            PropertyType.APARTMENT: "Daire",
            PropertyType.HOUSE: "Ev",
            PropertyType.LAND: "Arsa",
            PropertyType.OFFICE: "Ofis",
            PropertyType.SHOP: "Dükkan",
            PropertyType.WAREHOUSE: "Depo",
            PropertyType.OTHER: "Diğer",
        }
        return labels.get(self, self.value)


# ─── UI Sabitleri ────────────────────────────────────────────────────────────

class Colors:
    """Uygulama renk paleti."""

    # Ana renkler
    PRIMARY = "#2563EB"          # Mavi — primary action
    PRIMARY_DARK = "#1D4ED8"     # Hover
    PRIMARY_LIGHT = "#DBEAFE"    # Arka plan tonu

    # Durum renkleri
    SUCCESS = "#16A34A"
    SUCCESS_LIGHT = "#DCFCE7"
    WARNING = "#D97706"
    WARNING_LIGHT = "#FEF3C7"
    DANGER = "#DC2626"
    DANGER_LIGHT = "#FEE2E2"

    # Nötr renkler
    BACKGROUND = "#0F172A"       # Koyu arka plan
    SURFACE = "#1E293B"          # Kart / panel arka planı
    SURFACE_2 = "#334155"        # İkincil panel
    BORDER = "#475569"           # Çerçeve rengi
    TEXT_PRIMARY = "#F1F5F9"     # Ana metin
    TEXT_SECONDARY = "#94A3B8"   # İkincil metin
    TEXT_MUTED = "#64748B"       # Soluk metin
    SIDEBAR_BG = "#0F172A"       # Sol panel arka planı
    SIDEBAR_ACTIVE = "#1E3A5F"   # Aktif menü öğesi


class Dimensions:
    """Boyut sabitleri."""

    SIDEBAR_WIDTH = 220
    WINDOW_MIN_WIDTH = 1100
    WINDOW_MIN_HEIGHT = 700
    WINDOW_DEFAULT_WIDTH = 1280
    WINDOW_DEFAULT_HEIGHT = 800

    LOGIN_WINDOW_WIDTH = 420
    LOGIN_WINDOW_HEIGHT = 560

    TABLE_ROW_HEIGHT = 52
    BUTTON_HEIGHT = 36
    INPUT_HEIGHT = 38


class FontSizes:
    """Font boyutu sabitleri (pt)."""

    TINY = 9
    SMALL = 10
    NORMAL = 11
    MEDIUM = 12
    LARGE = 14
    XLARGE = 18
    TITLE = 24


# ─── API Endpoint Sabitleri ──────────────────────────────────────────────────

class Endpoints:
    """API endpoint yolları — base_url'e eklenir."""

    LOGIN = "/auth/login"
    ME = "/auth/me"
    PROPERTIES = "/properties"

    @staticmethod
    def property_detail(property_id: str) -> str:
        return f"/properties/{property_id}"

    @staticmethod
    def property_publish(property_id: str) -> str:
        return f"/properties/{property_id}/publish"

    @staticmethod
    def property_unpublish(property_id: str) -> str:
        return f"/properties/{property_id}/unpublish"

    PROPERTY_STATS = "/properties/stats"

    @staticmethod
    def property_images(property_id: str) -> str:
        return f"/properties/{property_id}/images"

    @staticmethod
    def image_delete(image_id: str) -> str:
        return f"/images/{image_id}"

    @staticmethod
    def image_cover(image_id: str) -> str:
        return f"/images/{image_id}/cover"

    @staticmethod
    def property_images_order(property_id: str) -> str:
        return f"/properties/{property_id}/images/order"


# ─── Tablo Kolon Sabitleri ───────────────────────────────────────────────────

PROPERTY_TABLE_COLUMNS = [
    "Başlık",
    "Şehir",
    "Fiyat",
    "İlan Tipi",
    "Yayın Durumu",
    "Oluşturulma",
    "İşlemler",
]

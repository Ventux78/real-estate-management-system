"""
app/utils/formatters.py
=======================
Amaç:
    View katmanında gösterim için veri formatlama yardımcıları.
    Para birimi, tarih ve enum etiket dönüşümleri burada yapılır.

Neden bu şekilde tasarlandı:
    - Formatlama mantığı View içine gömülmez; test edilebilir, yeniden kullanılabilir.
    - Tek sorumluluk: sadece string dönüşümleri.

Mimari içindeki görevi:
    View katmanı yardımcısı — tablo hücrelerinde ve form alanlarında kullanılır.
"""

from datetime import datetime


def format_price(price: float | int | None, currency: str = "₺") -> str:
    """
    Fiyatı kullanıcı dostu formatta döndürür.

    Args:
        price: Sayısal fiyat.
        currency: Para birimi sembolü.

    Returns:
        Biçimlendirilmiş fiyat string'i. Örn: "1.500.000 ₺"
    """
    if price is None:
        return "—"
    try:
        formatted = f"{int(price):,}".replace(",", ".")
        return f"{formatted} {currency}"
    except (TypeError, ValueError):
        return str(price)


def format_datetime(iso_string: str | None) -> str:
    """
    ISO 8601 tarih-saat string'ini Türkçe formata çevirir.

    Args:
        iso_string: ISO 8601 formatında tarih string'i.

    Returns:
        "GG.AA.YYYY SS:DD" formatında string veya "—".
    """
    if not iso_string:
        return "—"
    try:
        # Milisaniye ve Z suffix'ini temizle
        clean = iso_string.replace("Z", "+00:00")
        if "." in clean:
            clean = clean.split(".")[0]
        dt = datetime.fromisoformat(clean.replace("+00:00", ""))
        return dt.strftime("%d.%m.%Y %H:%M")
    except (ValueError, AttributeError):
        return iso_string[:10] if iso_string else "—"


def format_listing_type(listing_type: str) -> str:
    """
    Listing type enum değerini Türkçe etikete çevirir.

    Args:
        listing_type: Backend enum değeri ('FOR_SALE', 'FOR_RENT').

    Returns:
        Türkçe etiket.
    """
    labels = {
        "FOR_SALE": "Satılık",
        "FOR_RENT": "Kiralık",
    }
    return labels.get(listing_type, listing_type)


def format_property_type(property_type: str) -> str:
    """
    Property type enum değerini Türkçe etikete çevirir.

    Args:
        property_type: Backend enum değeri.

    Returns:
        Türkçe etiket.
    """
    labels = {
        "APARTMENT": "Daire",
        "HOUSE": "Ev",
        "LAND": "Arsa",
        "OFFICE": "Ofis",
        "SHOP": "Dükkan",
        "WAREHOUSE": "Depo",
        "OTHER": "Diğer",
    }
    return labels.get(property_type, property_type)


def format_published_status(is_published: bool) -> str:
    """
    Yayın durumunu Türkçe etikete çevirir.

    Args:
        is_published: Yayın durumu.

    Returns:
        "Yayında" veya "Taslak".
    """
    return "✓ Yayında" if is_published else "○ Taslak"

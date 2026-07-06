"""
app/utils/validators.py
=======================
Amaç:
    Form validasyon yardımcı fonksiyonları.
    View katmanındaki form widget'ları bu fonksiyonları kullanır.

Neden bu şekilde tasarlandı:
    - Validasyon mantığı View'dan ayrılmış; test edilebilir.
    - Her validator bir (is_valid: bool, error_message: str) tuple döndürür.
    - View katmanı validasyon sonucuna göre hata mesajını gösterir.

Mimari içindeki görevi:
    View katmanı yardımcısı — dialog ve form widget'ları tarafından kullanılır.
"""

from typing import Optional


def validate_required(value: str, field_name: str = "Alan") -> tuple[bool, str]:
    """
    Alanın boş olmadığını kontrol eder.

    Args:
        value: Kontrol edilecek değer.
        field_name: Hata mesajında gösterilecek alan adı.

    Returns:
        (True, "") — geçerli
        (False, hata_mesajı) — geçersiz
    """
    if not value or not value.strip():
        return False, f"{field_name} boş bırakılamaz."
    return True, ""


def validate_price(value: str) -> tuple[bool, str]:
    """
    Fiyat alanının geçerli pozitif sayı olduğunu kontrol eder.

    Args:
        value: Fiyat string'i.

    Returns:
        (True, "") — geçerli
        (False, hata_mesajı) — geçersiz
    """
    if not value or not value.strip():
        return False, "Fiyat boş bırakılamaz."
    try:
        price = float(value.replace(",", "."))
        if price <= 0:
            return False, "Fiyat sıfırdan büyük olmalıdır."
        return True, ""
    except ValueError:
        return False, "Geçerli bir fiyat giriniz (örn: 250000)."


def validate_min_length(
    value: str,
    min_length: int,
    field_name: str = "Alan",
) -> tuple[bool, str]:
    """
    Minimum karakter uzunluğunu kontrol eder.

    Args:
        value: Kontrol edilecek değer.
        min_length: Minimum karakter sayısı.
        field_name: Hata mesajında gösterilecek alan adı.

    Returns:
        (True, "") — geçerli
        (False, hata_mesajı) — geçersiz
    """
    if not value or len(value.strip()) < min_length:
        return False, f"{field_name} en az {min_length} karakter olmalıdır."
    return True, ""


def validate_login_form(
    username: str,
    password: str,
) -> tuple[bool, list[str]]:
    """
    Login formunu doğrular.

    Args:
        username: Kullanıcı adı.
        password: Şifre.

    Returns:
        (is_valid, errors_list)
    """
    errors: list[str] = []

    ok, msg = validate_required(username, "Kullanıcı adı")
    if not ok:
        errors.append(msg)

    ok, msg = validate_required(password, "Şifre")
    if not ok:
        errors.append(msg)
    elif len(password) < 3:
        errors.append("Şifre çok kısa.")

    return len(errors) == 0, errors


def validate_create_property_form(
    title: str,
    price: str,
    city: str,
    district: str,
    address: str,
) -> tuple[bool, list[str]]:
    """
    Yeni ilan formunu doğrular.

    Args:
        title: İlan başlığı.
        price: Fiyat (string olarak gelir).
        city: Şehir.
        district: İlçe.
        address: Adres.

    Returns:
        (is_valid, errors_list)
    """
    errors: list[str] = []

    ok, msg = validate_min_length(title, 3, "Başlık")
    if not ok:
        errors.append(msg)

    ok, msg = validate_price(price)
    if not ok:
        errors.append(msg)

    ok, msg = validate_required(city, "Şehir")
    if not ok:
        errors.append(msg)

    ok, msg = validate_required(district, "İlçe")
    if not ok:
        errors.append(msg)

    ok, msg = validate_required(address, "Adres")
    if not ok:
        errors.append(msg)

    return len(errors) == 0, errors

"""
app/config/settings.py
======================
Amaç:
    .env dosyasından ortam değişkenlerini okur ve tip güvenli
    AppSettings nesnesi oluşturur.

Neden bu şekilde tasarlandı:
    - python-dotenv ile .env dosyası parse edilir.
    - Dataclass kullanımı tip güvenliği ve IDE desteği sağlar.
    - Singleton pattern ile uygulama genelinde tek instance kullanılır.
    - Tüm modüller bu modülden import alır; magic string oluşmaz.

Mimari içindeki görevi:
    Config katmanı — tüm diğer katmanlar bu modüle bağımlıdır.
    ApiClient, Service ve View katmanları buradan konfigürasyonu alır.
"""

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


# .env dosyasını admin/ kök dizininden yükle
_env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=_env_path)


@dataclass(frozen=True)
class AppSettings:
    """
    Uygulama konfigürasyonu.

    frozen=True: değiştirilemez (immutable) yapı.
    Her alan .env'den okunur; yoksa varsayılan değer kullanılır.
    """

    # Backend API
    api_base_url: str
    api_version: str
    api_timeout: int

    # Uygulama
    app_name: str
    app_version: str
    app_env: str
    debug: bool

    @property
    def api_url(self) -> str:
        """Tam API endpoint prefix'i döndürür. Örnek: http://localhost:3001/api/v1"""
        return f"{self.api_base_url}/api/{self.api_version}"


def _load_settings() -> AppSettings:
    """
    Ortam değişkenlerini okuyarak AppSettings oluşturur.

    Returns:
        AppSettings: Konfigürasyon nesnesi.

    Raises:
        ValueError: Zorunlu bir ortam değişkeni eksikse.
    """
    api_base_url = os.getenv("API_BASE_URL", "http://localhost:3001")
    api_version = os.getenv("API_VERSION", "v1")
    api_timeout_str = os.getenv("API_TIMEOUT", "30")

    try:
        api_timeout = int(api_timeout_str)
    except ValueError:
        api_timeout = 30

    return AppSettings(
        api_base_url=api_base_url,
        api_version=api_version,
        api_timeout=api_timeout,
        app_name=os.getenv("APP_NAME", "Gayrimenkul Admin"),
        app_version=os.getenv("APP_VERSION", "1.0.0"),
        app_env=os.getenv("APP_ENV", "development"),
        debug=os.getenv("DEBUG", "false").lower() == "true",
    )


# Singleton instance — tüm uygulama bu nesneyi kullanır
settings: AppSettings = _load_settings()

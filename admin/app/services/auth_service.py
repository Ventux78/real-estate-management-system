"""
app/services/auth_service.py
============================
Amaç:
    Authentication domain'inin iş mantığını yönetir.
    Login, logout ve mevcut kullanıcı bilgisi işlemlerini kapsar.

Neden bu şekilde tasarlandı:
    - Singleton pattern: uygulama genelinde tek AuthService instance'ı kullanılır.
      Bu sayede token ve kullanıcı bilgisi merkezi olarak yönetilir.
    - Token yönetimi: JWT Access Token bellekte _current_user ile birlikte tutulur.
      Disk'e yazmak güvenlik riski oluşturur; Sprint 5 scope'u dışında.
    - View katmanı bu servisi kullanır; ApiClient veya requests'e dokunmaz.
    - login() hem token'ı ApiClient'a set eder hem de kullanıcı bilgisini saklar.

Mimari içindeki görevi:
    View → AuthService → ApiClient → Backend
    Token state'i: AuthService bellekte tutar.
    Logout: token temizlenir, kullanıcı state'i sıfırlanır.
"""

import logging
from typing import Optional

from PySide6.QtCore import QObject, Signal

from app.api.client import api_client
from app.api.exceptions import ApiException
from app.config.constants import Endpoints
from app.models.auth import LoginResponse, UserInfo

logger = logging.getLogger(__name__)


class AuthService(QObject):
    """
    Kimlik doğrulama servisi.

    Singleton olarak kullanılır; uygulama boyunca tek instance.

    Attributes:
        _current_user: Giriş yapmış kullanıcı bilgisi (yoksa None).
        _access_token: Bellekteki JWT token (yoksa None).
    """

    session_expired = Signal()

    def __init__(self) -> None:
        super().__init__()
        self._current_user: Optional[UserInfo] = None
        self._access_token: Optional[str] = None

    # ─── Public API ──────────────────────────────────────────────────────────

    def login(self, username: str, password: str) -> LoginResponse:
        """
        Kullanıcıyı backend'e giriş yapar.

        POST /api/v1/auth/login çağrısı yapar.
        Başarıysa token ApiClient'a set edilir ve kullanıcı bilgisi saklanır.

        Args:
            username: Kullanıcı adı.
            password: Şifre (plain text — HTTPS üzerinden gönderilir).

        Returns:
            LoginResponse: Access token ve kullanıcı bilgisi.

        Raises:
            ApiException: Giriş başarısız (yanlış credentials, sunucu hatası vb.).
        """
        logger.info(f"Login attempt: username={username}")

        payload = {"username": username, "password": password}
        raw = api_client.post(Endpoints.LOGIN, data=payload)

        # Backend { "success": true, "data": { ... } } wrapper kullanıyor
        if isinstance(raw, dict) and "data" in raw:
            raw = raw["data"]

        response = LoginResponse.from_dict(raw)

        # Token'ı ApiClient'a set et ve yerel state'i güncelle
        api_client.set_token(response.access_token)
        self._access_token = response.access_token
        self._current_user = response.user

        logger.info(f"Login successful: username={response.user.username}")
        return response

    def logout(self) -> None:
        """
        Oturumu kapatır.

        Token'ı bellekten ve ApiClient'tan siler.
        Sonraki API çağrıları 401 alacak.
        """
        logger.info("Logout: token temizleniyor.")
        api_client.clear_token()
        self._current_user = None
        self._access_token = None

    def get_current_user(self) -> Optional[UserInfo]:
        """
        Giriş yapmış kullanıcı bilgisini döndürür.

        Returns:
            UserInfo: Kullanıcı bilgisi (giriş yapılmamışsa None).
        """
        return self._current_user

    @property
    def is_logged_in(self) -> bool:
        """Kullanıcı giriş yapmış mı?"""
        return self._current_user is not None and api_client.is_authenticated

    def verify_session(self) -> bool:
        """
        Mevcut token'ın geçerliliğini backend'e doğrular.

        GET /api/v1/auth/me çağrısı yapar.

        Returns:
            bool: Token geçerliyse True, geçersizse False.
        """
        if not api_client.is_authenticated:
            return False
        try:
            raw = api_client.get(Endpoints.ME)
            # Backend { "success": true, "data": { "user": {...} } } veya { "user": {...} }
            if isinstance(raw, dict) and "data" in raw:
                raw = raw["data"]
            user_data = raw.get("user", raw)
            self._current_user = UserInfo.from_dict(user_data)
            return True
        except ApiException:
            self.logout()
            return False


# Singleton instance
auth_service = AuthService()

"""
app/models/auth.py
==================
Amaç:
    Authentication domain'ine ait veri modellerini tanımlar.

Neden bu şekilde tasarlandı:
    - Backend TypeScript interface'leriyle (auth.types.ts) birebir eşleşir.
    - @dataclass kullanımı: immutable, tip güvenli, IDE desteği var.
    - from_dict() factory metodu: raw JSON'dan modele dönüşüm service katmanında
      tek satırda yapılır; View katmanı dict erişimi yapmaz.

Mimari içindeki görevi:
    Service katmanı ApiClient'tan dict alır → modele çevirir → View'a iletir.
    View katmanı sadece bu modellerle çalışır; dict anahtarı hatalarına karşı
    korumalıdır.
"""

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class UserInfo:
    """
    Oturumdaki kullanıcı bilgileri.

    Backend: UserDto (auth.types.ts)
    """

    id: str
    username: str
    email: str
    is_active: bool
    created_at: str

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "UserInfo":
        """
        Backend JSON'undan UserInfo oluşturur.

        Args:
            data: Backend'den gelen kullanıcı dict'i.

        Returns:
            UserInfo instance.
        """
        return cls(
            id=data["id"],
            username=data["username"],
            email=data["email"],
            is_active=data.get("isActive", True),
            created_at=data.get("createdAt", ""),
        )


@dataclass(frozen=True)
class LoginResponse:
    """
    POST /api/v1/auth/login başarılı yanıtı.

    Backend: LoginResponseDto (auth.types.ts)

    Attributes:
        access_token: JWT Access Token.
        user: Oturumdaki kullanıcı bilgileri.
    """

    access_token: str
    user: UserInfo

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "LoginResponse":
        """
        Backend JSON'undan LoginResponse oluşturur.

        Args:
            data: Backend yanıt dict'i.

        Returns:
            LoginResponse instance.
        """
        return cls(
            access_token=data["accessToken"],
            user=UserInfo.from_dict(data["user"]),
        )

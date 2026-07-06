"""
app/api/exceptions.py
=====================
Amaç:
    Backend API'den dönen HTTP hata kodlarını ve ağ hatalarını
    tip güvenli Python exception sınıflarına dönüştürür.

Neden bu şekilde tasarlandı:
    - Her hata tipi için ayrı exception → View katmanı ne yapacağını bilir.
    - Exception hiyerarşisi: ApiException → özelleşmiş exception'lar.
    - Kullanıcıya gösterilecek mesaj exception içinde taşınır.
    - Service katmanı bu exception'ları fırlatır; View katmanı yakalar.

Mimari içindeki görevi:
    API katmanı ile View/Service katmanı arasında köprü görevi görür.
    HTTP kavramları bu dosyada Python exception'larına çevrilir.
    View içinde hiç HTTP status code geçmez.
"""


class ApiException(Exception):
    """
    Tüm API hatalarının temel sınıfı.

    Attributes:
        message: Kullanıcıya gösterilecek hata mesajı.
        status_code: HTTP durum kodu (varsa).
        detail: Teknik detay (debug modda gösterilebilir).
    """

    def __init__(
        self,
        message: str,
        status_code: int | None = None,
        detail: str | None = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.detail = detail

    def __repr__(self) -> str:
        return (
            f"{self.__class__.__name__}("
            f"message={self.message!r}, "
            f"status_code={self.status_code!r})"
        )


class UnauthorizedException(ApiException):
    """
    401 Unauthorized — Geçersiz veya eksik token.

    Genellikle login ekranına yönlendirme tetikler.
    """

    def __init__(self, detail: str | None = None) -> None:
        super().__init__(
            message="Oturum bilgileriniz geçersiz. Lütfen tekrar giriş yapın.",
            status_code=401,
            detail=detail,
        )


class ForbiddenException(ApiException):
    """
    403 Forbidden — Yetki yetersiz.

    Kullanıcı kimliği doğrulanmış ama bu işlemi yapmaya yetkisi yok.
    """

    def __init__(self, detail: str | None = None) -> None:
        super().__init__(
            message="Bu işlemi yapmak için yetkiniz bulunmuyor.",
            status_code=403,
            detail=detail,
        )


class NotFoundException(ApiException):
    """
    404 Not Found — Kaynak bulunamadı.
    """

    def __init__(self, resource: str = "Kaynak", detail: str | None = None) -> None:
        super().__init__(
            message=f"{resource} bulunamadı.",
            status_code=404,
            detail=detail,
        )


class ValidationException(ApiException):
    """
    422 Unprocessable Entity — Backend validasyon hatası.

    Backend Zod hatalarını taşır.
    """

    def __init__(self, errors: list[str] | None = None, detail: str | None = None) -> None:
        self.errors = errors or []
        message = "Girilen bilgiler geçersiz:\n" + "\n".join(self.errors) if self.errors else "Girilen bilgiler geçersiz."
        super().__init__(
            message=message,
            status_code=422,
            detail=detail,
        )


class ServerException(ApiException):
    """
    500 Internal Server Error — Sunucu hatası.
    """

    def __init__(self, detail: str | None = None) -> None:
        super().__init__(
            message="Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyiniz.",
            status_code=500,
            detail=detail,
        )


class TimeoutException(ApiException):
    """
    İstek zaman aşımına uğradı.

    requests.exceptions.Timeout'tan dönüştürülür.
    """

    def __init__(self) -> None:
        super().__init__(
            message="İstek zaman aşımına uğradı. Bağlantınızı kontrol edin.",
            status_code=None,
        )


class ConnectionException(ApiException):
    """
    Sunucuya bağlanılamadı.

    requests.exceptions.ConnectionError'dan dönüştürülür.
    """

    def __init__(self) -> None:
        super().__init__(
            message="Sunucuya bağlanılamadı. Backend çalışıyor mu?",
            status_code=None,
        )


class UnexpectedException(ApiException):
    """
    Beklenmeyen hata — Yukarıdaki sınıflara uymayan durumlar.
    """

    def __init__(self, status_code: int, detail: str | None = None) -> None:
        super().__init__(
            message=f"Beklenmeyen bir hata oluştu (HTTP {status_code}).",
            status_code=status_code,
            detail=detail,
        )

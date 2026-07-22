"""
app/api/client.py
=================
Amaç:
    Uygulamanın tüm HTTP operasyonlarını yöneten merkezi ApiClient sınıfı.

Neden bu şekilde tasarlandı:
    - Service katmanı hiçbir zaman doğrudan requests kullanmaz.
    - Authorization header otomatik olarak eklenir; her service bunu tekrar
      yazmak zorunda kalmaz.
    - Timeout tüm isteklere otomatik uygulanır.
    - HTTP hata kodları bu sınıfta exception'a dönüştürülür; service katmanı
      sadece iş mantığıyla ilgilenir.
    - Token yönetimi: set_token() / clear_token() metodları ile kontrol edilir.

Mimari içindeki görevi:
    API katmanının tek dışa açılan bileşenidir.
    Service katmanı → ApiClient → Backend şeklinde tek yönlü bağımlılık.
    View katmanı ApiClient'ı doğrudan kullanmaz; service üzerinden erişir.
"""

import json
import logging
from typing import Any

import requests
from requests import Response, Session
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from app.config.settings import settings
from app.api.exceptions import (
    ApiException,
    UnauthorizedException,
    ForbiddenException,
    NotFoundException,
    ValidationException,
    ServerException,
    TimeoutException,
    ConnectionException,
    UnexpectedException,
)

logger = logging.getLogger(__name__)


class ApiClient:
    """
    Backend REST API ile iletişim kuran HTTP istemcisi.

    Tüm istekler:
        - Ortak base URL'e yapılır (settings.api_url)
        - Authorization header'ı varsa otomatik eklenir
        - Timeout uygulanır
        - HTTP hataları exception'a dönüştürülür

    Attributes:
        _base_url: API endpoint prefix. Örnek: http://localhost:3001/api/v1
        _timeout: İstek zaman aşımı (saniye).
        _token: Bellekteki JWT Access Token (yoksa None).
        _session: requests.Session — bağlantı havuzu yönetimi.

    Usage:
        client = ApiClient()
        client.set_token("eyJ...")
        data = client.get("/properties")
    """

    def __init__(self) -> None:
        self._base_url: str = settings.api_url
        self._timeout: int = settings.api_timeout
        self._token: str | None = None
        self._session: Session = requests.Session()

        # Retry mechanism for 500, 502, 503, 504 errors
        retry_strategy = Retry(
            total=3,
            backoff_factor=0.3,
            status_forcelist=[500, 502, 503, 504],
            allowed_methods=["GET", "POST", "PUT", "PATCH", "DELETE"]
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self._session.mount("http://", adapter)
        self._session.mount("https://", adapter)

        self._session.headers.update({
            "Content-Type": "application/json",
            "Accept": "application/json",
        })

    # ─── Token Yönetimi ─────────────────────────────────────────────────────

    def set_token(self, token: str) -> None:
        """
        Access Token'ı bellekte saklar ve tüm sonraki isteklere ekler.

        Args:
            token: JWT Access Token string'i.
        """
        self._token = token
        self._session.headers.update({"Authorization": f"Bearer {token}"})
        logger.debug("ApiClient: Token ayarlandı.")

    def clear_token(self) -> None:
        """Token'ı bellekten siler (logout)."""
        self._token = None
        self._session.headers.pop("Authorization", None)
        logger.debug("ApiClient: Token temizlendi.")

    @property
    def is_authenticated(self) -> bool:
        """Token set edilmiş mi?"""
        return self._token is not None

    # ─── HTTP Metodları ─────────────────────────────────────────────────────

    def _request(
        self, method: str, endpoint: str, **kwargs: Any
    ) -> Any:
        url = self._build_url(endpoint)
        request_headers = {**self._session.headers, **(kwargs.get("headers") or {})}
        request_payload = kwargs.get("json") or kwargs.get("data")
        files = kwargs.get("files")

        if files is not None:
            request_headers.pop("Content-Type", None)
            kwargs["headers"] = request_headers
        else:
            kwargs["headers"] = request_headers

        logger.debug("=== API Request ===")
        logger.debug("%s URL: %s", method.upper(), url)
        logger.debug("Headers:\n%s", self._format_headers(request_headers))
        logger.debug("Request Payload (JSON):\n%s", self._pretty_json(request_payload))
        if files is not None:
            logger.debug("Files: %s", files)
        logger.debug("Timeout: %s", self._timeout)

        try:
            response = self._session.request(method, url, timeout=self._timeout, **kwargs)
            return self._handle_response(response)
        except ApiException:
            raise
        except requests.exceptions.Timeout:
            raise TimeoutException()
        except requests.exceptions.ConnectionError:
            raise ConnectionException()

    def get(self, endpoint: str, params: dict[str, Any] | None = None) -> Any:
        return self._request("GET", endpoint, params=params)

    def post(
        self,
        endpoint: str,
        data: dict[str, Any] | None = None,
        files: list[tuple[str, tuple[str, Any, str]]] | None = None,
    ) -> Any:
        if files is not None:
            return self._request("POST", endpoint, data=data, files=files)
        return self._request("POST", endpoint, json=data)

    def put(self, endpoint: str, data: dict[str, Any] | None = None) -> Any:
        return self._request("PUT", endpoint, json=data)

    def patch(self, endpoint: str, data: dict[str, Any] | None = None) -> Any:
        return self._request("PATCH", endpoint, json=data)

    def delete(self, endpoint: str) -> Any:
        return self._request("DELETE", endpoint)

    # ─── Private Yardımcılar ─────────────────────────────────────────────────

    def _build_url(self, endpoint: str) -> str:
        """
        Tam URL oluşturur.

        Args:
            endpoint: "/" ile başlayan path string'i.

        Returns:
            Tam URL string'i.
        """
        # Çift slash oluşmaması için trim
        return f"{self._base_url.rstrip('/')}/{endpoint.lstrip('/')}"

    def _pretty_json(self, value: Any) -> str:
        """JSON değerini okunabilir bir string'e dönüştürür."""
        if value is None:
            return "null"
        try:
            return json.dumps(value, indent=2, ensure_ascii=False)
        except (TypeError, ValueError):
            return str(value)

    def _format_headers(self, headers: Any) -> str:
        """Yazdırmaya uygun, güvenli başlıklar üretir."""
        if not headers:
            return "{}"

        safe_headers: dict[str, str] = {}
        for key, value in dict(headers).items():
            if key.lower() == "authorization":
                safe_headers[key] = "Bearer <redacted>"
            else:
                safe_headers[key] = str(value)
        return json.dumps(safe_headers, indent=2, ensure_ascii=False)

    def _handle_response(self, response: Response) -> Any:
        """
        HTTP response'u işler; hata varsa uygun exception fırlatır.

        Args:
            response: requests.Response nesnesi.

        Returns:
            Parsed JSON body (dict veya list).

        Raises:
            UnauthorizedException: 401
            ForbiddenException: 403
            NotFoundException: 404
            ValidationException: 422
            ServerException: 500
            UnexpectedException: Diğer 4xx/5xx
        """
        logger.debug("=== API Response ===")
        logger.debug("HTTP Status: %s", response.status_code)
        logger.debug("Response Headers:\n%s", self._format_headers(response.headers))
        logger.debug("Response Body:\n%s", response.text if response.text else "<empty>")

        body: Any = None
        parsed_json: Any = None
        try:
            parsed_json = response.json()
            body = parsed_json
            logger.debug("Response JSON:\n%s", self._pretty_json(parsed_json))
        except ValueError:
            logger.debug("Response JSON: <not valid JSON>")

        # Başarılı yanıtlar (200-299)
        if response.ok:
            if response.status_code == 204 or not response.content:
                return None
            return parsed_json if parsed_json is not None else None

        # Hata yanıtları
        detail: str | None = None
        try:
            if isinstance(body, dict):
                detail = body.get("message") or body.get("error") or str(body)
            else:
                detail = str(body)
        except Exception:
            detail = response.text[:200] if response.text else None

        status = response.status_code

        if status == 422:
            validation_errors: list[str] = []
            if isinstance(body, dict):
                errors_raw = body.get("errors", [])
                if isinstance(errors_raw, list):
                    validation_errors = [e.get("message", str(e)) for e in errors_raw if isinstance(e, dict)]
                elif isinstance(errors_raw, dict):
                    validation_errors = [str(errors_raw)]

                error_payload = body.get("error")
                if isinstance(error_payload, dict):
                    details = error_payload.get("details")
                    if isinstance(details, dict):
                        field_errors = details.get("fieldErrors") or details.get("errors")
                        if isinstance(field_errors, dict):
                            validation_errors = [f"{k}: {v}" for k, v in field_errors.items()]
                        elif isinstance(field_errors, list):
                            validation_errors = [str(item) for item in field_errors]

            logger.debug("Validation Errors:\n%s", self._pretty_json(validation_errors))
            logger.debug("Error Message: %s", detail)

        if status == 401:
            raise UnauthorizedException(detail=detail)
        elif status == 403:
            raise ForbiddenException(detail=detail)
        elif status == 404:
            raise NotFoundException(detail=detail)
        elif status == 422:
            # Backend Zod hatalarını parse etmeye çalış
            try:
                body = response.json()
                errors_raw = body.get("errors", [])
                errors = [e.get("message", str(e)) for e in errors_raw] if isinstance(errors_raw, list) else []
            except (ValueError, AttributeError):
                errors = []
            raise ValidationException(errors=errors, detail=detail)
        elif status >= 500:
            raise ServerException(detail=detail)
        else:
            raise UnexpectedException(status_code=status, detail=detail)


# Uygulama genelinde tek ApiClient instance'ı
# Service katmanı bu instance'ı import alır
api_client = ApiClient()

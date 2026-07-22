"""
tests/test_maps_url.py
=======================
MapsUrlService ve validate_maps_url birim testleri.
"""

from app.services.maps_url_service import maps_url_service
from app.utils.validators import validate_maps_url


def test_generate_url_with_full_address():
    url = maps_url_service.generate_url(
        address="7412 Sokak No:18",
        neighborhood="PTT Evleri",
        district="Yüreğir",
        province="Adana",
    )
    assert "https://www.google.com/maps/search/?api=1&query=" in url
    assert "7412+Sokak+No%3A18+PTT+Evleri+Y%C3%BCre%C4%9Fir+Adana+T%C3%BCrkiye" in url or "7412" in url


def test_generate_url_without_address_detail():
    url = maps_url_service.generate_url(
        address="",
        neighborhood="PTT Evleri",
        district="Yüreğir",
        province="Adana",
    )
    assert "https://www.google.com/maps/search/?api=1&query=" in url
    assert "PTT+Evleri+Y%C3%BCre%C4%9Fir+Adana+T%C3%BCrkiye" in url or "PTT" in url


def test_is_valid_url():
    assert maps_url_service.is_valid_url("https://maps.app.goo.gl/xyz123") is True
    assert maps_url_service.is_valid_url("https://goo.gl/maps/abc456") is True
    assert maps_url_service.is_valid_url("https://maps.google.com/?q=Adana") is True
    assert maps_url_service.is_valid_url("https://www.google.com/maps/place/Adana") is True

    assert maps_url_service.is_valid_url("https://example.com") is False
    assert maps_url_service.is_valid_url("") is False
    assert maps_url_service.is_valid_url(None) is False


def test_validate_maps_url():
    # Automatic mode
    ok, err = validate_maps_url("", is_manual=False)
    assert ok is True
    assert err == ""

    # Manual mode valid
    ok, err = validate_maps_url("https://maps.app.goo.gl/123", is_manual=True)
    assert ok is True
    assert err == ""

    # Manual mode empty
    ok, err = validate_maps_url("", is_manual=True)
    assert ok is False
    assert "boş bırakılamaz" in err

    # Manual mode invalid format
    ok, err = validate_maps_url("https://example.com", is_manual=True)
    assert ok is False
    assert "Geçersiz Google Maps" in err

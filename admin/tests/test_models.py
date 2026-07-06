"""
tests/test_models.py
=====================
Amaç:
    Model katmanının from_dict() metodlarını test eder.
    Backend JSON formatından Python modeline dönüşümün doğru çalıştığını doğrular.
"""

import unittest
from app.models.auth import UserInfo, LoginResponse
from app.models.property import (
    Property,
    PaginationMeta,
    PaginatedPropertyResult,
    CreatePropertyRequest,
)


class TestUserInfoModel(unittest.TestCase):
    """UserInfo.from_dict() testleri."""

    def setUp(self):
        self.valid_data = {
            "id": "user-123",
            "username": "admin",
            "email": "admin@test.com",
            "isActive": True,
            "createdAt": "2025-01-01T00:00:00.000Z",
        }

    def test_from_dict_success(self):
        """Geçerli dict'ten UserInfo oluşturulabilmeli."""
        user = UserInfo.from_dict(self.valid_data)
        self.assertEqual(user.id, "user-123")
        self.assertEqual(user.username, "admin")
        self.assertEqual(user.email, "admin@test.com")
        self.assertTrue(user.is_active)

    def test_from_dict_missing_optional(self):
        """isActive eksik olduğunda varsayılan True kullanılmalı."""
        data = {**self.valid_data}
        del data["isActive"]
        user = UserInfo.from_dict(data)
        self.assertTrue(user.is_active)


class TestLoginResponseModel(unittest.TestCase):
    """LoginResponse.from_dict() testleri."""

    def test_from_dict_success(self):
        """Geçerli dict'ten LoginResponse oluşturulabilmeli."""
        data = {
            "accessToken": "eyJtest.token.here",
            "user": {
                "id": "user-1",
                "username": "admin",
                "email": "admin@test.com",
                "isActive": True,
                "createdAt": "2025-01-01T00:00:00.000Z",
            },
        }
        response = LoginResponse.from_dict(data)
        self.assertEqual(response.access_token, "eyJtest.token.here")
        self.assertEqual(response.user.username, "admin")


class TestPropertyModel(unittest.TestCase):
    """Property.from_dict() testleri."""

    def _make_property_dict(self, **overrides):
        base = {
            "id": "prop-123",
            "slug": "test-property",
            "title": "Test Daire",
            "listingType": "FOR_SALE",
            "propertyType": "APARTMENT",
            "price": 1500000,
            "city": "Istanbul",
            "district": "Kadikoy",
            "address": "Test Adres",
            "isPublished": True,
            "createdAt": "2025-06-01T10:00:00.000Z",
            "updatedAt": "2025-06-01T10:00:00.000Z",
            "description": None,
            "images": [],
        }
        return {**base, **overrides}

    def test_from_dict_success(self):
        """Geçerli dict'ten Property oluşturulabilmeli."""
        prop = Property.from_dict(self._make_property_dict())
        self.assertEqual(prop.id, "prop-123")
        self.assertEqual(prop.title, "Test Daire")
        self.assertEqual(prop.price, 1500000.0)
        self.assertTrue(prop.is_published)

    def test_from_dict_decimal_price(self):
        """Decimal fiyat float'a çevrilmeli."""
        prop = Property.from_dict(self._make_property_dict(price="2500000.50"))
        self.assertIsInstance(prop.price, float)
        self.assertAlmostEqual(prop.price, 2500000.50)

    def test_from_dict_optional_none(self):
        """Opsiyonel alanlar None olarak gelmeli."""
        prop = Property.from_dict(self._make_property_dict())
        self.assertIsNone(prop.description)
        self.assertIsNone(prop.gross_area)

    def test_from_dict_draft(self):
        """isPublished=False doğru parse edilmeli."""
        prop = Property.from_dict(self._make_property_dict(isPublished=False))
        self.assertFalse(prop.is_published)


class TestPaginatedPropertyResult(unittest.TestCase):
    """PaginatedPropertyResult.from_dict() testleri."""

    def test_from_dict_empty_list(self):
        """Boş data listesi ile PaginatedPropertyResult oluşturulabilmeli."""
        data = {
            "data": [],
            "pagination": {"page": 1, "limit": 10, "total": 0, "pages": 0},
        }
        result = PaginatedPropertyResult.from_dict(data)
        self.assertEqual(len(result.data), 0)
        self.assertEqual(result.pagination.total, 0)

    def test_from_dict_with_properties(self):
        """Veri içeren liste doğru parse edilmeli."""
        prop_dict = {
            "id": "p1", "slug": "p1", "title": "Test", "listingType": "FOR_RENT",
            "propertyType": "HOUSE", "price": 5000, "city": "Ankara",
            "district": "Cankaya", "address": "Adres", "isPublished": False,
            "createdAt": "2025-01-01T00:00:00Z", "updatedAt": "2025-01-01T00:00:00Z",
            "images": [],
        }
        data = {
            "data": [prop_dict],
            "pagination": {"page": 1, "limit": 10, "total": 1, "pages": 1},
        }
        result = PaginatedPropertyResult.from_dict(data)
        self.assertEqual(len(result.data), 1)
        self.assertEqual(result.data[0].title, "Test")


class TestCreatePropertyRequest(unittest.TestCase):
    """CreatePropertyRequest.to_dict() testleri."""

    def test_to_dict_required_fields(self):
        """Zorunlu alanlar doğru camelCase anahtarlarla dict'e çevrilmeli."""
        req = CreatePropertyRequest(
            title="Satılık Daire",
            listing_type="FOR_SALE",
            property_type="APARTMENT",
            price=2000000.0,
            city="Izmir",
            district="Bornova",
            address="Test Adres 1",
        )
        d = req.to_dict()
        self.assertEqual(d["title"], "Satılık Daire")
        self.assertEqual(d["listingType"], "FOR_SALE")
        self.assertEqual(d["propertyType"], "APARTMENT")
        self.assertEqual(d["price"], 2000000.0)
        self.assertEqual(d["city"], "Izmir")
        self.assertEqual(d["district"], "Bornova")
        self.assertEqual(d["address"], "Test Adres 1")

    def test_to_dict_optional_description(self):
        """Description varsa dict'e eklenmeli."""
        req = CreatePropertyRequest(
            title="Test", listing_type="FOR_RENT", property_type="OFFICE",
            price=5000.0, city="Istanbul", district="Sisli", address="Adres",
            description="Güzel ofis",
        )
        d = req.to_dict()
        self.assertIn("description", d)
        self.assertEqual(d["description"], "Güzel ofis")

    def test_to_dict_no_description(self):
        """Description None ise dict'te olmamalı."""
        req = CreatePropertyRequest(
            title="Test", listing_type="FOR_RENT", property_type="OFFICE",
            price=5000.0, city="Istanbul", district="Sisli", address="Adres",
        )
        d = req.to_dict()
        self.assertNotIn("description", d)


if __name__ == "__main__":
    unittest.main()

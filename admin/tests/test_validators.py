"""
tests/test_validators.py
=========================
Amaç:
    Validasyon yardımcı fonksiyonlarını test eder.
"""

import unittest
from app.utils.validators import (
    validate_required,
    validate_price,
    validate_min_length,
    validate_login_form,
    validate_create_property_form,
)


class TestValidateRequired(unittest.TestCase):

    def test_valid_value(self):
        ok, msg = validate_required("test", "Alan")
        self.assertTrue(ok)
        self.assertEqual(msg, "")

    def test_empty_string(self):
        ok, msg = validate_required("", "Alan")
        self.assertFalse(ok)
        self.assertIn("Alan", msg)

    def test_whitespace_only(self):
        ok, msg = validate_required("   ", "Alan")
        self.assertFalse(ok)


class TestValidatePrice(unittest.TestCase):

    def test_valid_integer_price(self):
        ok, msg = validate_price("1500000")
        self.assertTrue(ok)

    def test_valid_decimal_price(self):
        ok, msg = validate_price("2500000.50")
        self.assertTrue(ok)

    def test_comma_decimal(self):
        ok, msg = validate_price("1500000,50")
        self.assertTrue(ok)

    def test_zero_price(self):
        ok, msg = validate_price("0")
        self.assertFalse(ok)

    def test_negative_price(self):
        ok, msg = validate_price("-100")
        self.assertFalse(ok)

    def test_non_numeric(self):
        ok, msg = validate_price("abc")
        self.assertFalse(ok)

    def test_empty_price(self):
        ok, msg = validate_price("")
        self.assertFalse(ok)


class TestValidateMinLength(unittest.TestCase):

    def test_valid_length(self):
        ok, msg = validate_min_length("Güzel Daire", 3, "Baslik")
        self.assertTrue(ok)

    def test_too_short(self):
        ok, msg = validate_min_length("ab", 3, "Baslik")
        self.assertFalse(ok)

    def test_empty(self):
        ok, msg = validate_min_length("", 3, "Baslik")
        self.assertFalse(ok)


class TestValidateLoginForm(unittest.TestCase):

    def test_valid_credentials(self):
        ok, errors = validate_login_form("admin", "password123")
        self.assertTrue(ok)
        self.assertEqual(len(errors), 0)

    def test_empty_username(self):
        ok, errors = validate_login_form("", "password123")
        self.assertFalse(ok)
        self.assertGreater(len(errors), 0)

    def test_empty_password(self):
        ok, errors = validate_login_form("admin", "")
        self.assertFalse(ok)

    def test_both_empty(self):
        ok, errors = validate_login_form("", "")
        self.assertFalse(ok)
        self.assertEqual(len(errors), 2)


class TestValidateCreatePropertyForm(unittest.TestCase):

    def test_valid_form(self):
        ok, errors = validate_create_property_form(
            title="Satılık Daire",
            price="1500000",
            province="Adana",
            district="Yüreğir",
            neighborhood="PTT Evleri",
            address="Test Adres 1",
        )
        self.assertTrue(ok)
        self.assertEqual(len(errors), 0)

    def test_missing_title(self):
        ok, errors = validate_create_property_form("", "1500000", "Adana", "Yüreğir", "PTT Evleri", "Adres")
        self.assertFalse(ok)

    def test_invalid_price(self):
        ok, errors = validate_create_property_form("Test", "invalid", "Adana", "Yüreğir", "PTT Evleri", "Adres")
        self.assertFalse(ok)

    def test_missing_province(self):
        ok, errors = validate_create_property_form("Test", "100000", "", "Yüreğir", "PTT Evleri", "Adres")
        self.assertFalse(ok)

    def test_missing_neighborhood(self):
        ok, errors = validate_create_property_form("Test", "100000", "Adana", "Yüreğir", "", "Adres")
        self.assertFalse(ok)

    def test_all_missing(self):
        ok, errors = validate_create_property_form("", "", "", "", "", "")
        self.assertFalse(ok)
        self.assertGreaterEqual(len(errors), 5)


class TestLocationService(unittest.TestCase):

    def test_provinces(self):
        from app.services.location_service import location_service
        provinces = location_service.get_provinces()
        self.assertIn("Adana", provinces)
        self.assertIn("İstanbul", provinces)
        self.assertEqual(len(provinces), 81)

    def test_districts(self):
        from app.services.location_service import location_service
        districts = location_service.get_districts("Adana")
        self.assertIn("Yüreğir", districts)
        self.assertIn("Çukurova", districts)

    def test_neighborhoods(self):
        from app.services.location_service import location_service
        neighborhoods = location_service.get_neighborhoods("Adana", "Yüreğir")
        self.assertIn("PTT Evleri", neighborhoods)

    def test_is_valid_location(self):
        from app.services.location_service import location_service
        self.assertTrue(location_service.is_valid_location("Adana", "Yüreğir", "PTT Evleri"))
        self.assertFalse(location_service.is_valid_location("Adana", "Yüreğir", "Geçersiz Mahalle"))



if __name__ == "__main__":
    unittest.main()

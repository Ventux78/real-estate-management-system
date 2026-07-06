"""
tests/test_formatters.py
=========================
Amaç:
    Format yardımcı fonksiyonlarını test eder.
"""

import unittest
from app.utils.formatters import (
    format_price,
    format_datetime,
    format_listing_type,
    format_property_type,
    format_published_status,
)


class TestFormatPrice(unittest.TestCase):

    def test_integer_price(self):
        result = format_price(1500000)
        self.assertIn("1.500.000", result)
        self.assertIn("₺", result)

    def test_none_price(self):
        result = format_price(None)
        self.assertEqual(result, "—")

    def test_zero_price(self):
        result = format_price(0)
        self.assertIn("₺", result)


class TestFormatDatetime(unittest.TestCase):

    def test_valid_iso_string(self):
        result = format_datetime("2025-06-15T10:30:00.000Z")
        self.assertIn("15.06.2025", result)

    def test_none_string(self):
        result = format_datetime(None)
        self.assertEqual(result, "—")

    def test_empty_string(self):
        result = format_datetime("")
        self.assertEqual(result, "—")


class TestFormatListingType(unittest.TestCase):

    def test_for_sale(self):
        self.assertEqual(format_listing_type("FOR_SALE"), "Satılık")

    def test_for_rent(self):
        self.assertEqual(format_listing_type("FOR_RENT"), "Kiralık")

    def test_unknown(self):
        result = format_listing_type("UNKNOWN")
        self.assertEqual(result, "UNKNOWN")


class TestFormatPropertyType(unittest.TestCase):

    def test_apartment(self):
        self.assertEqual(format_property_type("APARTMENT"), "Daire")

    def test_house(self):
        self.assertEqual(format_property_type("HOUSE"), "Ev")

    def test_land(self):
        self.assertEqual(format_property_type("LAND"), "Arsa")


class TestFormatPublishedStatus(unittest.TestCase):

    def test_published(self):
        result = format_published_status(True)
        self.assertIn("Yayında", result)

    def test_unpublished(self):
        result = format_published_status(False)
        self.assertIn("Taslak", result)


if __name__ == "__main__":
    unittest.main()

"""
tests/test_api_exceptions.py
=============================
Amaç:
    ApiException hiyerarşisini ve mesajlarını test eder.
"""

import unittest
from app.api.exceptions import (
    ApiException,
    UnauthorizedException,
    ForbiddenException,
    NotFoundException,
    ValidationException,
    ServerException,
    TimeoutException,
    ConnectionException,
)


class TestApiExceptionHierarchy(unittest.TestCase):

    def test_unauthorized_is_api_exception(self):
        e = UnauthorizedException()
        self.assertIsInstance(e, ApiException)

    def test_forbidden_is_api_exception(self):
        e = ForbiddenException()
        self.assertIsInstance(e, ApiException)

    def test_not_found_is_api_exception(self):
        e = NotFoundException()
        self.assertIsInstance(e, ApiException)

    def test_server_is_api_exception(self):
        e = ServerException()
        self.assertIsInstance(e, ApiException)

    def test_timeout_is_api_exception(self):
        e = TimeoutException()
        self.assertIsInstance(e, ApiException)

    def test_connection_is_api_exception(self):
        e = ConnectionException()
        self.assertIsInstance(e, ApiException)


class TestExceptionStatusCodes(unittest.TestCase):

    def test_unauthorized_status_code(self):
        e = UnauthorizedException()
        self.assertEqual(e.status_code, 401)

    def test_forbidden_status_code(self):
        e = ForbiddenException()
        self.assertEqual(e.status_code, 403)

    def test_not_found_status_code(self):
        e = NotFoundException()
        self.assertEqual(e.status_code, 404)

    def test_server_status_code(self):
        e = ServerException()
        self.assertEqual(e.status_code, 500)

    def test_timeout_no_status(self):
        e = TimeoutException()
        self.assertIsNone(e.status_code)

    def test_connection_no_status(self):
        e = ConnectionException()
        self.assertIsNone(e.status_code)


class TestExceptionMessages(unittest.TestCase):

    def test_unauthorized_has_message(self):
        e = UnauthorizedException()
        self.assertIsNotNone(e.message)
        self.assertGreater(len(e.message), 0)

    def test_validation_with_errors(self):
        errors = ["Alan 1 bos", "Alan 2 hata"]
        e = ValidationException(errors=errors)
        for err in errors:
            self.assertIn(err, e.message)

    def test_not_found_custom_resource(self):
        e = NotFoundException(resource="Ilan")
        self.assertIn("Ilan", e.message)


if __name__ == "__main__":
    unittest.main()

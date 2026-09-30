import unittest

from fastapi.testclient import TestClient

from app.main import app


class ApiTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)
        self.client.post("/api/sorteio/resetar")

    def tearDown(self) -> None:
        self.client.close()

    def test_health(self) -> None:
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok", "storage": "memory"})

    def test_manual_fallback_and_draw_flow(self) -> None:
        imported = self.client.post(
            "/api/sorteio/fallback-manual",
            json={
                "comments": "@ana | um\n@ana | dois\n@bruno | tres",
                "draw_now": False,
            },
        )
        self.assertEqual(imported.status_code, 200)
        self.assertEqual(imported.json()["total_entries"], 3)

        first = self.client.post("/api/sorteio/sortear")
        second = self.client.post("/api/sorteio/sortear")
        exhausted = self.client.post("/api/sorteio/sortear")

        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 200)
        self.assertNotEqual(first.json()["username"], second.json()["username"])
        self.assertEqual(exhausted.status_code, 409)

    def test_instagram_route_explains_missing_configuration(self) -> None:
        response = self.client.post(
            "/api/sorteio/buscar-comentarios", json={}
        )
        self.assertEqual(response.status_code, 503)
        self.assertIn("INSTAGRAM_ACCESS_TOKEN", response.json()["detail"])


if __name__ == "__main__":
    unittest.main()

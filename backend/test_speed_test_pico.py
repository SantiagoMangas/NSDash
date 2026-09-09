"""Tests MSS speed test with optional peak velocity."""

import pytest
from datetime import date

from app import models
from app.main import build_speed_test_response, speed_test_mss_kmh
from app.schemas import SpeedTestInput
from app.speed_calculator import calculate_vel_kmh, effective_mss_kmh


class TestEffectiveMssKmh:
    def test_without_peak_uses_average(self):
        assert effective_mss_kmh(27.0, None) == 27.0

    def test_with_peak_uses_peak(self):
        assert effective_mss_kmh(27.0, 32.5) == 32.5


class TestSpeedTestPersistence:
    def test_build_response_without_peak(self):
        test = models.SpeedTest(
            id=1,
            athlete_id=1,
            date=date(2026, 3, 9),
            distancia_m=30,
            tiempo_s=4,
            vel_kmh=27.0,
            velocidad_pico_kmh=None,
            notes=None,
        )
        response = build_speed_test_response(test)
        assert response["vel_kmh"] == 27.0
        assert response["velocidad_pico_kmh"] is None
        assert response["mss_kmh"] == 27.0

    def test_build_response_with_peak(self):
        test = models.SpeedTest(
            id=2,
            athlete_id=1,
            date=date(2026, 3, 9),
            distancia_m=30,
            tiempo_s=4,
            vel_kmh=27.0,
            velocidad_pico_kmh=32.5,
            notes=None,
        )
        response = build_speed_test_response(test)
        assert response["vel_kmh"] == 27.0
        assert response["velocidad_pico_kmh"] == 32.5
        assert response["mss_kmh"] == 32.5
        assert speed_test_mss_kmh(test) == 32.5


class TestSpeedTestInputSchema:
    def test_post_payload_without_peak(self):
        payload = SpeedTestInput(
            athlete_id=1,
            date=date(2026, 3, 9),
            distancia_m=30,
            tiempo_s=4,
        )
        vel_promedio = calculate_vel_kmh(payload.distancia_m, payload.tiempo_s)
        mss = effective_mss_kmh(vel_promedio, payload.velocidad_pico_kmh)
        assert vel_promedio == 27.0
        assert mss == 27.0

    def test_post_payload_with_peak(self):
        payload = SpeedTestInput(
            athlete_id=1,
            date=date(2026, 3, 9),
            distancia_m=30,
            tiempo_s=4,
            velocidad_pico_kmh=32.5,
        )
        vel_promedio = calculate_vel_kmh(payload.distancia_m, payload.tiempo_s)
        mss = effective_mss_kmh(vel_promedio, payload.velocidad_pico_kmh)
        assert vel_promedio == 27.0
        assert mss == 32.5

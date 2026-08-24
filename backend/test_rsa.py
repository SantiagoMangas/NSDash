"""
Unit tests for session_calculators/rsa.py
Run with: pytest test_rsa.py -v
"""

import pytest
from app.session_calculators.rsa import calculate_rsa


class TestCalculateRsa:
    def test_excel_reference_case_mss_22_34_ratio_1_5_50m(self):
        """Fórmulas Excel MAS training AX-BB con MSS 22.34 km/h, 80-90%, 1:5, 50m, 6x2."""
        result = calculate_rsa(
            reference_kmh=22.34,
            intensidad_pct_min=80,
            intensidad_pct_max=90,
            distancia_m=50,
            reps=6,
            series=2,
            ratio="1:5",
            entrenamiento="RST",
        )

        assert result["entrenamiento"] == "RST"

        assert result["min"]["velocidad_kmh"] == 17.87
        assert result["min"]["ritmo_str"] == "3:21"
        assert result["min"]["trabajo_s"] == pytest.approx(10.07, abs=0.01)
        assert result["min"]["pausa_s"] == pytest.approx(50.36, abs=0.01)

        assert result["max"]["velocidad_kmh"] == 20.11
        assert result["max"]["ritmo_str"] == "2:59"
        assert result["max"]["trabajo_s"] == pytest.approx(8.95, abs=0.01)
        assert result["max"]["pausa_s"] == pytest.approx(44.76, abs=0.01)

        assert result["volumen_serie_m"] == 600
        assert result["volumen_trabajo_m"] == 1200

    def test_trabajo_matches_distance_over_speed_ms(self):
        result = calculate_rsa(
            reference_kmh=22.34,
            intensidad_pct_min=80,
            intensidad_pct_max=90,
            distancia_m=50,
            reps=6,
            series=2,
            ratio="1:5",
            entrenamiento="SIT",
        )

        vel_min = 22.34 * 80 / 100
        vel_max = 22.34 * 90 / 100
        assert result["min"]["trabajo_s"] == pytest.approx(50 / (vel_min / 3.6), abs=0.01)
        assert result["max"]["trabajo_s"] == pytest.approx(50 / (vel_max / 3.6), abs=0.01)
        assert result["entrenamiento"] == "SIT"

    def test_pause_five_times_work_for_ratio_1_5(self):
        result = calculate_rsa(
            reference_kmh=22.34,
            intensidad_pct_min=80,
            intensidad_pct_max=90,
            distancia_m=50,
            reps=6,
            series=2,
            ratio="1:5",
            entrenamiento="rst",
        )

        assert result["min"]["pausa_s"] == pytest.approx(
            result["min"]["trabajo_s"] * 5, abs=0.01
        )
        assert result["max"]["pausa_s"] == pytest.approx(
            result["max"]["trabajo_s"] * 5, abs=0.01
        )

    def test_invalid_entrenamiento(self):
        with pytest.raises(ValueError, match="Tipo de entrenamiento inválido"):
            calculate_rsa(
                reference_kmh=22.34,
                intensidad_pct_min=80,
                intensidad_pct_max=90,
                distancia_m=50,
                reps=6,
                series=2,
                ratio="1:5",
                entrenamiento="HIIT",
            )

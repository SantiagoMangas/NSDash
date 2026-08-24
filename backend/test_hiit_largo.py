"""
Unit tests for session_calculators/hiit_largo.py
Run with: pytest test_hiit_largo.py -v
"""

import pytest
from app.session_calculators.hiit_largo import calculate_hiit_largo


class TestCalculateHiitLargo:
    def test_excel_reference_case_vam_16_56_ratio_3_1_3000m(self):
        """Valores derivados de fórmulas Excel (MAS training, Y-AC) con VAM 16.56 km/h."""
        result = calculate_hiit_largo(
            reference_kmh=16.56,
            intensidad_pct_min=90,
            intensidad_pct_max=110,
            distancia_m=3000,
            reps=6,
            series=1,
            macro_pausa_min=5,
            ratio="3:1",
        )

        assert result["min"]["velocidad_kmh"] == 14.9
        assert result["min"]["ritmo_str"] == "4:02"
        assert result["min"]["trabajo_s"] == pytest.approx(724.64, abs=0.01)
        assert result["min"]["trabajo_str"] == "12:05"
        assert result["min"]["pausa_s"] == pytest.approx(241.55, abs=0.01)
        assert result["min"]["pausa_str"] == "4:02"

        assert result["max"]["velocidad_kmh"] == 18.22
        assert result["max"]["ritmo_str"] == "3:18"
        assert result["max"]["trabajo_s"] == pytest.approx(592.88, abs=0.01)
        assert result["max"]["trabajo_str"] == "9:53"
        assert result["max"]["pausa_s"] == pytest.approx(197.63, abs=0.01)
        assert result["max"]["pausa_str"] == "3:18"

        assert result["volumen_m"] == 18000
        assert result["densidad_min"] == pytest.approx(92.84, abs=0.01)

    def test_pause_shorter_than_work_for_ratio_3_1(self):
        result = calculate_hiit_largo(
            reference_kmh=16.56,
            intensidad_pct_min=90,
            intensidad_pct_max=110,
            distancia_m=3000,
            reps=6,
            series=1,
            macro_pausa_min=5,
            ratio="3:1",
        )

        assert result["min"]["pausa_s"] < result["min"]["trabajo_s"]
        assert result["max"]["pausa_s"] < result["max"]["trabajo_s"]
        assert result["min"]["pausa_s"] == pytest.approx(
            result["min"]["trabajo_s"] / 3, abs=0.01
        )

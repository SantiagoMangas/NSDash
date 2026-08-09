"""
Unit tests for session_calculators/hiit_corto.py
Run with: pytest test_hiit_corto.py -v
"""

import pytest
from app.session_calculators.hiit_corto import calculate_hiit_corto, _parse_ratio


class TestParseRatio:
    def test_valid_ratio_1_2(self):
        assert _parse_ratio("1:2") == (1.0, 2.0)

    def test_valid_ratio_3_1(self):
        assert _parse_ratio("3:1") == (3.0, 1.0)

    def test_valid_ratio_with_spaces(self):
        assert _parse_ratio(" 1 : 15 ") == (1.0, 15.0)

    def test_invalid_format(self):
        with pytest.raises(ValueError, match="Formato de ratio inválido"):
            _parse_ratio("1-2")

    def test_non_positive_values(self):
        with pytest.raises(ValueError, match="números positivos"):
            _parse_ratio("0:2")

        with pytest.raises(ValueError, match="números positivos"):
            _parse_ratio("1:0")


class TestCalculateHiitCorto:
    def test_example_ratio_1_2(self):
        result = calculate_hiit_corto(
            reference_kmh=14.5,
            intensidad_pct_min=100,
            intensidad_pct_max=120,
            distancia_m=200,
            reps=4,
            series=2,
            macro_pausa_min=3,
            ratio="1:2",
        )

        assert result["min"]["velocidad_kmh"] == 14.5
        assert result["min"]["ritmo_str"] == "4:08"
        assert result["min"]["trabajo_s"] == pytest.approx(49.66, abs=0.01)
        assert result["min"]["pausa_s"] == pytest.approx(99.31, abs=0.01)

        assert result["max"]["velocidad_kmh"] == 17.4
        assert result["max"]["ritmo_str"] == "3:27"
        assert result["max"]["trabajo_s"] == pytest.approx(41.38, abs=0.01)
        assert result["max"]["pausa_s"] == pytest.approx(82.76, abs=0.01)

        assert result["volumen_m"] == 1600

    def test_ratio_3_1_pause_shorter_than_work(self):
        result = calculate_hiit_corto(
            reference_kmh=14.5,
            intensidad_pct_min=100,
            intensidad_pct_max=120,
            distancia_m=200,
            reps=4,
            series=2,
            macro_pausa_min=3,
            ratio="3:1",
        )

        assert result["min"]["pausa_s"] < result["min"]["trabajo_s"]
        assert result["max"]["pausa_s"] < result["max"]["trabajo_s"]

        assert result["min"]["pausa_s"] == pytest.approx(
            result["min"]["trabajo_s"] / 3, abs=0.01
        )
        assert result["max"]["pausa_s"] == pytest.approx(
            result["max"]["trabajo_s"] / 3, abs=0.01
        )

        assert result["min"]["pausa_s"] < 99.31
        assert result["max"]["pausa_s"] < 82.76

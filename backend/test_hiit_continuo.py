"""
Unit tests for session_calculators/hiit_continuo.py
Run with: pytest test_hiit_continuo.py -v
"""

import pytest
from app.session_calculators.hiit_continuo import (
    calculate_hiit_continuo_corto,
    calculate_hiit_continuo_largo,
)


class TestHiitContinuoLargo:
    def test_nico_example_densidad_27_00(self):
        result = calculate_hiit_continuo_largo(
            reference_kmh=16.56,
            intensidad_pct_min=90,
            intensidad_pct_max=110,
            trabajo_min=2,
            serie_min=12,
            bloques=2,
            macro_pausa_min=3,
            ratio="2:1",
        )

        assert result["entrenamiento"] == "Intervalo Largo"
        assert result["densidad_min"] == pytest.approx(27.0, abs=0.01)
        assert result["densidad_str"] == "27:00"
        assert result["min"]["trabajo_str"] == "2:00"
        assert result["min"]["pausa_str"] == "1:00"
        assert result["max"]["pausa_s"] == pytest.approx(result["min"]["trabajo_s"] / 2, abs=0.01)

    def test_distancia_from_fixed_work_time(self):
        result = calculate_hiit_continuo_largo(
            reference_kmh=16.56,
            intensidad_pct_min=90,
            intensidad_pct_max=110,
            trabajo_min=2,
            serie_min=12,
            bloques=2,
            macro_pausa_min=3,
            ratio="2:1",
        )

        vel_min = 16.56 * 90 / 100
        vel_max = 16.56 * 110 / 100
        ritmo_min = 60 / vel_min
        ritmo_max = 60 / vel_max
        assert result["min"]["distancia_m"] == pytest.approx(2 / ritmo_min * 1000, abs=0.01)
        assert result["max"]["distancia_m"] == pytest.approx(2 / ritmo_max * 1000, abs=0.01)
        assert result["max"]["distancia_m"] > result["min"]["distancia_m"]


class TestHiitContinuoCorto:
    def test_nico_example_densidad_21_00(self):
        result = calculate_hiit_continuo_corto(
            reference_kmh=16.56,
            intensidad_pct_min=100,
            intensidad_pct_max=120,
            trabajo_s=30,
            serie_min=6,
            bloques=3,
            macro_pausa_min=3,
            ratio="2:1",
        )

        assert result["entrenamiento"] == "Intervalo Corto"
        assert result["densidad_min"] == pytest.approx(21.0, abs=0.01)
        assert result["densidad_str"] == "21:00"
        assert result["min"]["trabajo_s"] == pytest.approx(30.0, abs=0.01)
        assert result["min"]["trabajo_str"] == "0:30"
        assert result["min"]["pausa_s"] == pytest.approx(15.0, abs=0.01)
        assert result["min"]["pausa_str"] == "0:15"

    def test_distancia_from_fixed_work_time_seconds(self):
        result = calculate_hiit_continuo_corto(
            reference_kmh=16.56,
            intensidad_pct_min=100,
            intensidad_pct_max=120,
            trabajo_s=30,
            serie_min=6,
            bloques=3,
            macro_pausa_min=3,
            ratio="2:1",
        )

        vel_min = 16.56 * 100 / 100
        ritmo_min = 60 / vel_min
        trabajo_min = 30 / 60
        assert result["min"]["distancia_m"] == pytest.approx(
            trabajo_min / ritmo_min * 1000, abs=0.01
        )

    def test_volumenes_siguen_af13_ag13_ak13_al13(self):
        result = calculate_hiit_continuo_corto(
            reference_kmh=16.56,
            intensidad_pct_min=100,
            intensidad_pct_max=120,
            trabajo_s=30,
            serie_min=6,
            bloques=3,
            macro_pausa_min=3,
            ratio="2:1",
        )

        vel_min = 16.56 * 100 / 100
        vel_max = 16.56 * 120 / 100
        trabajo_min = 30 / 60
        d_min = trabajo_min / (60 / vel_min) * 1000
        d_max = trabajo_min / (60 / vel_max) * 1000
        trabajo, pausa, serie = 30.0, 15.0, 6 * 60
        af13 = d_min + (pausa / trabajo) * d_max
        ag13 = d_max + (pausa / trabajo) * d_min
        ak13 = ((af13 + ag13) / 2) * (serie / (trabajo + pausa))
        al13 = ak13 * 3

        assert result["volumen_serie_m"] == pytest.approx(ak13, abs=0.01)
        assert result["volumen_trabajo_m"] == pytest.approx(al13, abs=0.01)

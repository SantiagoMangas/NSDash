"""
Unit tests for session_calculators/tempo_run.py
Run with: pytest test_tempo_run.py -v
"""

import pytest
from app.session_calculators.tempo_run import calculate_tempo_run


class TestTempoRunExcelExample:
    def test_excel_extensivo_cod_no(self):
        result = calculate_tempo_run(
            reference_kmh=24.83,
            intensidad_pct_min=70,
            intensidad_pct_max=80,
            distancia_m=100,
            pausa_m=100,
            series=8,
            bloques=2,
            ratio="1:2",
            entrenamiento="Extensivo",
            cod="NO",
            shuttles=3,
        )

        assert result["metodologia"] == "Tempo Run"
        assert result["entrenamiento"] == "Extensivo"
        assert result["cod"] == "NO"
        assert result["shuttles"] == 0
        assert result["min"]["velocidad_kmh"] == pytest.approx(17.38, abs=0.01)
        assert result["max"]["velocidad_kmh"] == pytest.approx(19.86, abs=0.01)
        assert result["min"]["trabajo_s"] == pytest.approx(20.71, abs=0.01)
        assert result["max"]["trabajo_s"] == pytest.approx(18.13, abs=0.01)
        assert result["min"]["pausa_s"] == pytest.approx(41.43, abs=0.01)
        assert result["max"]["pausa_s"] == pytest.approx(36.25, abs=0.01)
        assert result["volumen_serie_m"] == pytest.approx(1600, abs=0.01)
        assert result["volumen_trabajo_m"] == pytest.approx(3200, abs=0.01)
        assert "densidad_min" not in result
        assert "densidad_str" not in result

    def test_cod_si_suma_shuttles_al_trabajo(self):
        result = calculate_tempo_run(
            reference_kmh=24.83,
            intensidad_pct_min=70,
            intensidad_pct_max=80,
            distancia_m=100,
            pausa_m=100,
            series=8,
            bloques=2,
            ratio="1:2",
            entrenamiento="I. Recovery",
            cod="SI",
            shuttles=1,
        )

        assert result["entrenamiento"] == "I. Recovery"
        assert result["cod"] == "SI"
        assert result["shuttles"] == 1
        assert result["distancia_ajustada_m"] == pytest.approx(50.0, abs=0.01)
        assert result["min"]["trabajo_s"] == pytest.approx(21.71, abs=0.01)
        assert result["min"]["pausa_s"] == pytest.approx(43.43, abs=0.01)
        assert result["volumen_serie_m"] == pytest.approx(1600, abs=0.01)

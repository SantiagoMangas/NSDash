"""
Unit tests for session_calculators/mas_training.py
Run with: pytest test_mas_training.py -v
"""

import pytest
from app.session_calculators.mas_training import calculate_mas_training


class TestMasTrainingExcelExample:
    def test_excel_intervalo_corto_cod_si(self):
        result = calculate_mas_training(
            reference_kmh=19.0,
            intensidad_pct_min=110,
            intensidad_pct_max=120,
            trabajo_s=15,
            serie_min=4,
            bloques=3,
            macro_pausa_min=3,
            ratio="1:1",
            entrenamiento="Intervalo Corto",
            cod="SI",
            shuttles=1,
        )

        assert result["metodologia"] == "MAS Training"
        assert result["entrenamiento"] == "Intervalo Corto"
        assert result["cod"] == "SI"
        assert result["shuttles"] == 1
        assert result["min"]["velocidad_kmh"] == pytest.approx(20.9, abs=0.01)
        assert result["max"]["velocidad_kmh"] == pytest.approx(22.8, abs=0.01)
        assert result["min"]["pausa_s"] == pytest.approx(15.0, abs=0.01)
        assert result["densidad_min"] == pytest.approx(15.0, abs=0.01)
        assert result["densidad_str"] == "15:00"
        assert result["min"]["volumen_serie_m"] == pytest.approx(650.22, abs=0.01)
        assert result["max"]["volumen_serie_m"] == pytest.approx(709.33, abs=0.01)
        assert result["min"]["volumen_trabajo_m"] == pytest.approx(1950.67, abs=0.01)
        assert result["max"]["volumen_trabajo_m"] == pytest.approx(2128.0, abs=0.05)

    def test_cod_no_ignora_shuttles(self):
        result = calculate_mas_training(
            reference_kmh=19.0,
            intensidad_pct_min=110,
            intensidad_pct_max=120,
            trabajo_s=15,
            serie_min=4,
            bloques=3,
            macro_pausa_min=3,
            ratio="1:1",
            entrenamiento="Intervalo Largo",
            cod="NO",
            shuttles=4,
        )

        assert result["entrenamiento"] == "Intervalo Largo"
        assert result["cod"] == "NO"
        assert result["shuttles"] == 0
        vel_ms = 20.9 / 3.6
        distancia = vel_ms * 15
        ciclos = 240 / 30
        assert result["min"]["distancia_m"] == pytest.approx(distancia, abs=0.01)
        assert result["min"]["volumen_serie_m"] == pytest.approx(ciclos * distancia, abs=0.01)

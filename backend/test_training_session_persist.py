from app.training_session_persist import build_session_summary, recalculate_training_session


def test_mas_training_summary_and_recalculate():
    payload = {
        "reference_kmh": 18.0,
        "intensidad_pct_min": 110,
        "intensidad_pct_max": 120,
        "trabajo_s": 15,
        "serie_min": 4,
        "bloques": 3,
        "macro_pausa_min": 3,
        "ratio": "1:1",
        "entrenamiento": "Intervalo Corto",
        "cod": "NO",
        "shuttles": 0,
        "fecha": None,
    }
    result = recalculate_training_session("mas_training", payload)
    summary = build_session_summary("mas_training", result)
    assert "Intervalo Corto" not in summary
    assert "Densidad" not in summary
    assert summary == "COD NO · Volumen trabajo 2880 m" or (
        "COD NO" in summary and "Volumen trabajo" in summary
    )
    assert "Shuttles" not in summary
    assert "–" not in summary
    assert "Densidad" not in summary


def test_rsa_recalculate():
    payload = {
        "reference_kmh": 32.0,
        "intensidad_pct_min": 80,
        "intensidad_pct_max": 90,
        "distancia_m": 30,
        "reps": 6,
        "series": 2,
        "ratio": "1:5",
        "entrenamiento": "RST",
    }
    result = recalculate_training_session("rsa", payload)
    assert result["entrenamiento"] == "RST"
    assert result["volumen_trabajo_m"] > 0
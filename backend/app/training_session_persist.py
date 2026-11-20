"""Recálculo y resúmenes para sesiones guardadas de calculadoras de resistencia."""

from __future__ import annotations

import json
from datetime import date
from typing import Any

from app import schemas
from app.session_calculators import hiit_continuo, hiit_corto, hiit_largo, mas_training, rsa

CALCULATOR_LABELS: dict[str, str] = {
    "mas_training": "MAS Training",
    "hiit_corto": "HIIT Corto",
    "hiit_largo": "HIIT Largo",
    "hiit_continuo_largo": "HIIT Continuo",
    "hiit_continuo_corto": "HIIT Continuo",
    "rsa": "RSA",
}

VALID_SOURCES = frozenset(CALCULATOR_LABELS)


def _format_meters(meters: float) -> str:
    display = int(meters) if float(meters).is_integer() else round(meters, 2)
    return f"{display} m"


def _volumen_trabajo_historial(source: str, result: dict[str, Any]) -> float | None:
    if "volumen_trabajo_m" in result:
        return float(result["volumen_trabajo_m"])
    if source == "mas_training" and isinstance(result.get("max"), dict):
        vol = result["max"].get("volumen_trabajo_m")
        return float(vol) if vol is not None else None
    if isinstance(result.get("min"), dict) and "volumen_trabajo_m" in result["min"]:
        return float(result["min"]["volumen_trabajo_m"])
    if "volumen_m" in result:
        return float(result["volumen_m"])
    return None


def build_session_summary(source: str, result: dict[str, Any]) -> str:
    """Resumen corto para la fila del historial (COD + volumen; detalle en la fila expandida)."""
    parts: list[str] = []

    cod = result.get("cod")
    if cod is not None:
        parts.append(f"COD {cod}")

    vol = _volumen_trabajo_historial(source, result)
    if vol is not None and vol > 0:
        parts.append(f"Volumen trabajo {_format_meters(vol)}")

    return " · ".join(parts) if parts else "—"


def entrenamiento_label(source: str, result: dict[str, Any]) -> str:
    """Subtítulo en historial (la columna calculadora ya identifica el tipo)."""
    if source.startswith("hiit_continuo"):
        mode = result.get("entrenamiento")
        return str(mode) if mode else CALCULATOR_LABELS[source]
    if source == "mas_training":
        return str(result.get("entrenamiento") or "Intervalo Corto")
    if source == "rsa":
        return str(result.get("entrenamiento") or "RST")
    if source == "tempo_run":
        return str(result.get("entrenamiento") or "Tempo Run")
    return CALCULATOR_LABELS.get(source, source)


def _json_ready(value: Any) -> Any:
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, dict):
        return {k: _json_ready(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_json_ready(v) for v in value]
    return value


def recalculate_training_session(source: str, payload: dict[str, Any]) -> dict[str, Any]:
    """Valida payload, recalcula y devuelve el resultado como dict."""
    if source not in VALID_SOURCES:
        raise ValueError(f"Tipo de calculadora no soportado: {source}")

    if source == "mas_training":
        req = schemas.MasTrainingCalculateRequest.model_validate(payload)
        return mas_training.calculate_mas_training(
            reference_kmh=req.reference_kmh,
            intensidad_pct_min=req.intensidad_pct_min,
            intensidad_pct_max=req.intensidad_pct_max,
            trabajo_s=req.trabajo_s,
            serie_min=req.serie_min,
            bloques=req.bloques,
            macro_pausa_min=req.macro_pausa_min,
            ratio=req.ratio,
            entrenamiento=req.entrenamiento,
            cod=req.cod,
            shuttles=req.shuttles,
            fecha=req.fecha,
        )

    if source == "hiit_corto":
        req = schemas.HiitCortoCalculateRequest.model_validate(payload)
        return hiit_corto.calculate_hiit_corto(
            reference_kmh=req.reference_kmh,
            intensidad_pct_min=req.intensidad_pct_min,
            intensidad_pct_max=req.intensidad_pct_max,
            distancia_m=req.distancia_m,
            reps=req.reps,
            series=req.series,
            macro_pausa_min=req.macro_pausa_min,
            ratio=req.ratio,
        )

    if source == "hiit_largo":
        req = schemas.HiitLargoCalculateRequest.model_validate(payload)
        return hiit_largo.calculate_hiit_largo(
            reference_kmh=req.reference_kmh,
            intensidad_pct_min=req.intensidad_pct_min,
            intensidad_pct_max=req.intensidad_pct_max,
            distancia_m=req.distancia_m,
            reps=req.reps,
            series=req.series,
            macro_pausa_min=req.macro_pausa_min,
            ratio=req.ratio,
        )

    if source == "hiit_continuo_largo":
        req = schemas.HiitContinuoLargoCalculateRequest.model_validate(payload)
        return hiit_continuo.calculate_hiit_continuo_largo(
            reference_kmh=req.reference_kmh,
            intensidad_pct_min=req.intensidad_pct_min,
            intensidad_pct_max=req.intensidad_pct_max,
            trabajo_min=req.trabajo_min,
            serie_min=req.serie_min,
            bloques=req.bloques,
            macro_pausa_min=req.macro_pausa_min,
            ratio=req.ratio,
        )

    if source == "hiit_continuo_corto":
        req = schemas.HiitContinuoCortoCalculateRequest.model_validate(payload)
        return hiit_continuo.calculate_hiit_continuo_corto(
            reference_kmh=req.reference_kmh,
            intensidad_pct_min=req.intensidad_pct_min,
            intensidad_pct_max=req.intensidad_pct_max,
            trabajo_s=req.trabajo_s,
            serie_min=req.serie_min,
            bloques=req.bloques,
            macro_pausa_min=req.macro_pausa_min,
            ratio=req.ratio,
        )

    if source == "rsa":
        req = schemas.RsaCalculateRequest.model_validate(payload)
        return rsa.calculate_rsa(
            reference_kmh=req.reference_kmh,
            intensidad_pct_min=req.intensidad_pct_min,
            intensidad_pct_max=req.intensidad_pct_max,
            distancia_m=req.distancia_m,
            reps=req.reps,
            series=req.series,
            ratio=req.ratio,
            entrenamiento=req.entrenamiento,
        )

    raise ValueError(f"Tipo de calculadora no soportado: {source}")


def build_snapshot_json(source: str, payload: dict[str, Any], calculated: dict[str, Any]) -> str:
    result_ready = _json_ready(calculated)
    request_ready = _json_ready(payload)
    return json.dumps(
        {"source": source, "request": request_ready, "result": result_ready},
        ensure_ascii=False,
    )
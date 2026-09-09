from app.session_calculators.hiit_corto import _parse_ratio
from app.session_calculators.mas_training import COD_NO, COD_SI, _normalize_cod
from app.vam_calculator import _format_pace_from_kmh

METODOLOGIA = "Tempo Run"
ENTRENAMIENTO_EXTENSIVO = "Extensivo"
ENTRENAMIENTO_RECOVERY = "I. Recovery"
ENTRENAMIENTOS_VALIDOS = {ENTRENAMIENTO_EXTENSIVO, ENTRENAMIENTO_RECOVERY}


def _format_duration_mm_ss(seconds: float) -> str:
    total = int(round(seconds))
    minutes = total // 60
    secs = total % 60
    return f"{minutes}:{secs:02d}"


def _normalize_entrenamiento(entrenamiento: str) -> str:
    collapsed = " ".join(entrenamiento.strip().split())
    compact = collapsed.lower().replace(".", "").replace("í", "i")
    if compact == "extensivo":
        return ENTRENAMIENTO_EXTENSIVO
    if compact in {"i recovery", "irecovery", "recovery"}:
        return ENTRENAMIENTO_RECOVERY
    raise ValueError(
        f'Tipo de entrenamiento inválido: "{entrenamiento}". '
        f'Se espera "{ENTRENAMIENTO_EXTENSIVO}" o "{ENTRENAMIENTO_RECOVERY}".'
    )


def _calculate_intensity_extreme(
    reference_kmh: float,
    intensidad_pct: float,
    distancia_trabajo_m: float,
    shuttles: float,
    ratio_numerador: float,
    ratio_denominador: float,
) -> dict[str, float | str]:
    velocidad_kmh = round(reference_kmh * intensidad_pct / 100, 2)
    trabajo_s = distancia_trabajo_m / (velocidad_kmh / 3.6)
    trabajo_efectivo_s = trabajo_s + shuttles
    pausa_s = trabajo_efectivo_s * (ratio_denominador / ratio_numerador)

    return {
        "velocidad_kmh": velocidad_kmh,
        "ritmo_str": _format_pace_from_kmh(velocidad_kmh),
        "trabajo_s": round(trabajo_efectivo_s, 2),
        "trabajo_str": _format_duration_mm_ss(trabajo_efectivo_s),
        "pausa_s": round(pausa_s, 2),
        "pausa_str": _format_duration_mm_ss(pausa_s),
    }


def calculate_tempo_run(
    reference_kmh: float,
    intensidad_pct_min: float,
    intensidad_pct_max: float,
    distancia_m: float,
    pausa_m: float,
    series: int,
    bloques: int,
    ratio: str,
    entrenamiento: str,
    cod: str | bool,
    shuttles: float = 0,
    fecha: object | None = None,
) -> dict:
    if reference_kmh <= 0:
        raise ValueError("La métrica MMSS de referencia debe ser mayor a 0")
    if distancia_m <= 0:
        raise ValueError("La distancia de trabajo debe ser mayor a 0")
    if pausa_m < 0:
        raise ValueError("La distancia de pausa no puede ser negativa")
    if series <= 0:
        raise ValueError("Las series deben ser un entero mayor a 0")
    if bloques <= 0:
        raise ValueError("Los bloques deben ser un entero mayor a 0")
    if shuttles < 0:
        raise ValueError("Shuttles no puede ser negativo")

    entrenamiento_norm = _normalize_entrenamiento(entrenamiento)
    cod_norm = _normalize_cod(cod)
    shuttles_efectivos = shuttles if cod_norm == COD_SI else 0.0
    ratio_numerador, ratio_denominador = _parse_ratio(ratio)

    volumen_serie_m = (distancia_m + pausa_m) * series
    volumen_trabajo_m = volumen_serie_m * bloques
    distancia_ajustada_m = distancia_m / (shuttles_efectivos + 1)

    return {
        "metodologia": METODOLOGIA,
        "entrenamiento": entrenamiento_norm,
        "fecha": fecha,
        "cod": cod_norm,
        "shuttles": shuttles_efectivos,
        "distancia_m": distancia_m,
        "distancia_ajustada_m": round(distancia_ajustada_m, 2),
        "pausa_m": pausa_m,
        "series": series,
        "bloques": bloques,
        "min": _calculate_intensity_extreme(
            reference_kmh,
            intensidad_pct_min,
            distancia_m,
            shuttles_efectivos,
            ratio_numerador,
            ratio_denominador,
        ),
        "max": _calculate_intensity_extreme(
            reference_kmh,
            intensidad_pct_max,
            distancia_m,
            shuttles_efectivos,
            ratio_numerador,
            ratio_denominador,
        ),
        "volumen_serie_m": round(volumen_serie_m, 2),
        "volumen_trabajo_m": round(volumen_trabajo_m, 2),
    }

from app.session_calculators.hiit_corto import _parse_ratio
from app.vam_calculator import _format_pace_from_kmh

ENTRENAMIENTOS_VALIDOS = {"RST", "SIT"}


def _normalize_entrenamiento(entrenamiento: str) -> str:
    value = entrenamiento.strip().upper()
    if value not in ENTRENAMIENTOS_VALIDOS:
        raise ValueError(
            f'Tipo de entrenamiento inválido: "{entrenamiento}". Se espera "RST" o "SIT".'
        )
    return value


def _calculate_intensity_extreme(
    reference_kmh: float,
    intensidad_pct: float,
    distancia_m: float,
    ratio_numerador: float,
    ratio_denominador: float,
) -> dict[str, float | str]:
    velocidad_kmh = reference_kmh * intensidad_pct / 100
    # Excel MAS training AX-BB: Trabajo (s) = Distancia ÷ (Velocidad / 3.6)
    trabajo_s = distancia_m / (velocidad_kmh / 3.6)
    pausa_s = trabajo_s * (ratio_denominador / ratio_numerador)

    return {
        "velocidad_kmh": round(velocidad_kmh, 2),
        "ritmo_str": _format_pace_from_kmh(velocidad_kmh),
        "trabajo_s": round(trabajo_s, 2),
        "pausa_s": round(pausa_s, 2),
    }


def calculate_rsa(
    reference_kmh: float,
    intensidad_pct_min: float,
    intensidad_pct_max: float,
    distancia_m: float,
    reps: int,
    series: int,
    ratio: str,
    entrenamiento: str,
) -> dict:
    entrenamiento_norm = _normalize_entrenamiento(entrenamiento)
    ratio_numerador, ratio_denominador = _parse_ratio(ratio)

    # Excel AY12 / AY13 (confirmado celda por celda):
    # Vol. Serie = Distancia × Reps × Series
    # Vol. Trabajo = AY12 * AY11 = Vol. Serie × Series
    volumen_serie_m = distancia_m * reps * series
    volumen_trabajo_m = volumen_serie_m * series

    return {
        "entrenamiento": entrenamiento_norm,
        "min": _calculate_intensity_extreme(
            reference_kmh,
            intensidad_pct_min,
            distancia_m,
            ratio_numerador,
            ratio_denominador,
        ),
        "max": _calculate_intensity_extreme(
            reference_kmh,
            intensidad_pct_max,
            distancia_m,
            ratio_numerador,
            ratio_denominador,
        ),
        "volumen_serie_m": volumen_serie_m,
        "volumen_trabajo_m": volumen_trabajo_m,
    }

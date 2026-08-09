from app.vam_calculator import _format_pace_from_kmh


def _parse_ratio(ratio: str) -> tuple[float, float]:
    parts = ratio.strip().split(":")
    if len(parts) != 2:
        raise ValueError(
            f'Formato de ratio inválido: "{ratio}". Se espera "N:M" (ej. "1:2", "3:1").'
        )

    try:
        numerador = float(parts[0].strip())
        denominador = float(parts[1].strip())
    except ValueError as exc:
        raise ValueError(
            f'Formato de ratio inválido: "{ratio}". Ambos lados deben ser números positivos.'
        ) from exc

    if numerador <= 0 or denominador <= 0:
        raise ValueError(
            f'Formato de ratio inválido: "{ratio}". Ambos lados deben ser números positivos.'
        )

    return numerador, denominador


def _calculate_intensity_extreme(
    reference_kmh: float,
    intensidad_pct: float,
    distancia_m: float,
    ratio_numerador: float,
    ratio_denominador: float,
) -> dict[str, float | str]:
    velocidad_kmh = reference_kmh * intensidad_pct / 100
    ritmo_decimal_min_km = 60 / velocidad_kmh
    trabajo_s = ritmo_decimal_min_km * (distancia_m / 1000) * 60
    pausa_s = trabajo_s * (ratio_denominador / ratio_numerador)

    return {
        "velocidad_kmh": round(velocidad_kmh, 2),
        "ritmo_str": _format_pace_from_kmh(velocidad_kmh),
        "trabajo_s": round(trabajo_s, 2),
        "pausa_s": round(pausa_s, 2),
    }


def calculate_hiit_corto(
    reference_kmh: float,
    intensidad_pct_min: float,
    intensidad_pct_max: float,
    distancia_m: float,
    reps: int,
    series: int,
    macro_pausa_min: float,
    ratio: str,
) -> dict:
    ratio_numerador, ratio_denominador = _parse_ratio(ratio)
    volumen_m = reps * distancia_m * series

    return {
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
        "volumen_m": volumen_m,
    }

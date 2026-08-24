from app.session_calculators.hiit_corto import _parse_ratio
from app.vam_calculator import _format_pace_from_kmh


def _format_duration_mm_ss(seconds: float) -> str:
    total = int(round(seconds))
    minutes = total // 60
    secs = total % 60
    return f"{minutes}:{secs:02d}"


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
        "trabajo_str": _format_duration_mm_ss(trabajo_s),
        "pausa_s": round(pausa_s, 2),
        "pausa_str": _format_duration_mm_ss(pausa_s),
    }


def _calculate_densidad_min(
    min_extreme: dict[str, float | str],
    max_extreme: dict[str, float | str],
    reps: int,
    series: int,
    macro_pausa_min: float,
) -> float:
    min_cycle_s = float(min_extreme["trabajo_s"]) + float(min_extreme["pausa_s"])
    max_cycle_s = float(max_extreme["trabajo_s"]) + float(max_extreme["pausa_s"])
    avg_cycle_s = (min_cycle_s + max_cycle_s) / 2
    return round((avg_cycle_s / 60) * reps + macro_pausa_min * series, 2)


def calculate_hiit_largo(
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
    volumen_m = distancia_m * reps * series

    min_extreme = _calculate_intensity_extreme(
        reference_kmh,
        intensidad_pct_min,
        distancia_m,
        ratio_numerador,
        ratio_denominador,
    )
    max_extreme = _calculate_intensity_extreme(
        reference_kmh,
        intensidad_pct_max,
        distancia_m,
        ratio_numerador,
        ratio_denominador,
    )

    return {
        "min": min_extreme,
        "max": max_extreme,
        "volumen_m": volumen_m,
        "densidad_min": _calculate_densidad_min(
            min_extreme,
            max_extreme,
            reps,
            series,
            macro_pausa_min,
        ),
    }

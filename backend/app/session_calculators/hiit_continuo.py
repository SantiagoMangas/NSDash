from app.session_calculators.hiit_corto import _parse_ratio
from app.vam_calculator import _format_pace_from_kmh

ENTRENAMIENTO_LARGO = "Intervalo Largo"
ENTRENAMIENTO_CORTO = "Intervalo Corto"


def _format_duration_mm_ss(seconds: float) -> str:
    total = int(round(seconds))
    minutes = total // 60
    secs = total % 60
    return f"{minutes}:{secs:02d}"


def _calculate_intensity_extreme(
    reference_kmh: float,
    intensidad_pct: float,
    trabajo_s: float,
) -> tuple[dict[str, float | str], float]:
    velocidad_kmh = reference_kmh * intensidad_pct / 100
    ritmo_decimal_min_km = 60 / velocidad_kmh
    trabajo_min = trabajo_s / 60
    # Distancia (m) = Trabajo ÷ Ritmo × 1000  (tiempo fijo → distancia)
    distancia_m = trabajo_min / ritmo_decimal_min_km * 1000

    return {
        "velocidad_kmh": round(velocidad_kmh, 2),
        "ritmo_str": _format_pace_from_kmh(velocidad_kmh),
        "distancia_m": round(distancia_m, 2),
        "trabajo_s": round(trabajo_s, 2),
        "trabajo_str": _format_duration_mm_ss(trabajo_s),
    }, distancia_m


def _volumenes_ponderados(
    d_min: float,
    d_max: float,
    trabajo: float,
    pausa: float,
    serie: float,
    bloques: int,
) -> tuple[float, float]:
    """Réplica literal de AF13 / AG13 / AK13 / AL13 (MAS training, AD-AL).

    Promedios ponderados por proporción de tiempo Trabajo/Pausa combinando
    ambos extremos. Pausa activa: la distancia de pausa usa el ritmo del
    extremo contrario. No reducir a (d_min+d_max)/2 × n de antemano.
    """
    ciclo = trabajo + pausa

    # AF13: ciclo con trabajo en min y pausa activa en max
    af13 = d_min + (pausa / trabajo) * d_max
    # AG13: ciclo con trabajo en max y pausa activa en min
    ag13 = d_max + (pausa / trabajo) * d_min

    n_ciclos = serie / ciclo
    # AK13: Volumen Serie (m)
    ak13 = ((af13 + ag13) / 2) * n_ciclos
    # AL13: Volumen Trabajo (m)
    al13 = ak13 * bloques

    return round(ak13, 2), round(al13, 2)


def _calculate_hiit_continuo(
    reference_kmh: float,
    intensidad_pct_min: float,
    intensidad_pct_max: float,
    trabajo_s: float,
    serie_min: float,
    bloques: int,
    macro_pausa_min: float,
    ratio: str,
    entrenamiento: str,
) -> dict:
    if trabajo_s <= 0:
        raise ValueError("El tiempo de trabajo debe ser mayor a 0")
    if serie_min <= 0:
        raise ValueError("La serie (min) debe ser mayor a 0")
    if bloques <= 0:
        raise ValueError("Los bloques deben ser un entero mayor a 0")
    if macro_pausa_min < 0:
        raise ValueError("La macro pausa no puede ser negativa")

    ratio_numerador, ratio_denominador = _parse_ratio(ratio)
    pausa_s = trabajo_s * (ratio_denominador / ratio_numerador)

    min_extreme, d_min = _calculate_intensity_extreme(
        reference_kmh, intensidad_pct_min, trabajo_s
    )
    max_extreme, d_max = _calculate_intensity_extreme(
        reference_kmh, intensidad_pct_max, trabajo_s
    )

    min_extreme["pausa_s"] = round(pausa_s, 2)
    min_extreme["pausa_str"] = _format_duration_mm_ss(pausa_s)
    max_extreme["pausa_s"] = round(pausa_s, 2)
    max_extreme["pausa_str"] = _format_duration_mm_ss(pausa_s)

    volumen_serie_m, volumen_trabajo_m = _volumenes_ponderados(
        d_min=d_min,
        d_max=d_max,
        trabajo=trabajo_s,
        pausa=pausa_s,
        serie=serie_min * 60,
        bloques=bloques,
    )

    densidad_min = serie_min * bloques + macro_pausa_min

    return {
        "entrenamiento": entrenamiento,
        "min": min_extreme,
        "max": max_extreme,
        "serie_min": serie_min,
        "densidad_min": round(densidad_min, 2),
        "densidad_str": _format_duration_mm_ss(densidad_min * 60),
        "volumen_serie_m": volumen_serie_m,
        "volumen_trabajo_m": volumen_trabajo_m,
    }


def calculate_hiit_continuo_largo(
    reference_kmh: float,
    intensidad_pct_min: float,
    intensidad_pct_max: float,
    trabajo_min: float,
    serie_min: float,
    bloques: int,
    macro_pausa_min: float,
    ratio: str,
) -> dict:
    return _calculate_hiit_continuo(
        reference_kmh=reference_kmh,
        intensidad_pct_min=intensidad_pct_min,
        intensidad_pct_max=intensidad_pct_max,
        trabajo_s=trabajo_min * 60,
        serie_min=serie_min,
        bloques=bloques,
        macro_pausa_min=macro_pausa_min,
        ratio=ratio,
        entrenamiento=ENTRENAMIENTO_LARGO,
    )


def calculate_hiit_continuo_corto(
    reference_kmh: float,
    intensidad_pct_min: float,
    intensidad_pct_max: float,
    trabajo_s: float,
    serie_min: float,
    bloques: int,
    macro_pausa_min: float,
    ratio: str,
) -> dict:
    return _calculate_hiit_continuo(
        reference_kmh=reference_kmh,
        intensidad_pct_min=intensidad_pct_min,
        intensidad_pct_max=intensidad_pct_max,
        trabajo_s=trabajo_s,
        serie_min=serie_min,
        bloques=bloques,
        macro_pausa_min=macro_pausa_min,
        ratio=ratio,
        entrenamiento=ENTRENAMIENTO_CORTO,
    )

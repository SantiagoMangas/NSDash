from app.session_calculators.hiit_corto import _parse_ratio
from app.vam_calculator import _format_pace_from_kmh, calculate_zones

ENTRENAMIENTO_LARGO = "Intervalo Largo"
ENTRENAMIENTO_CORTO = "Intervalo Corto"
ZONA_2_NAME = "Zona 2"


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


def _z2_from_reference(reference_kmh: float) -> dict:
    """Z2 del atleta = calculate_zones() sobre la misma VAM que usa HIIT."""
    vam_mpm = (reference_kmh * 1000) / 60
    zone = next(z for z in calculate_zones(vam_mpm) if z["zona"] == ZONA_2_NAME)
    return zone


def _distancia_desde_tiempo(vel_kmh: float, tiempo_s: float) -> float:
    ritmo_decimal_min_km = 60 / vel_kmh
    return (tiempo_s / 60) / ritmo_decimal_min_km * 1000


def _volumenes_con_pausa_z2(
    d_min: float,
    d_max: float,
    d_pausa_z2: float,
    trabajo: float,
    pausa: float,
    serie: float,
    bloques: int,
) -> tuple[float, float]:
    """Volumen = ciclos × (distancia trabajo + distancia pausa activa en Z2).

    El trabajo promedia los extremos min/max; la pausa activa usa siempre Z2.
    """
    n_ciclos = serie / (trabajo + pausa)
    volumen_serie_m = n_ciclos * ((d_min + d_max) / 2 + d_pausa_z2)
    volumen_trabajo_m = volumen_serie_m * bloques
    return round(volumen_serie_m, 2), round(volumen_trabajo_m, 2)


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

    z2 = _z2_from_reference(reference_kmh)
    z2_kmh = z2["velocidad_kmh"]
    d_pausa_z2 = _distancia_desde_tiempo(z2_kmh, pausa_s)

    volumen_serie_m, volumen_trabajo_m = _volumenes_con_pausa_z2(
        d_min=d_min,
        d_max=d_max,
        d_pausa_z2=d_pausa_z2,
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
        "z2_kmh": z2_kmh,
        "z2_ritmo_str": _format_pace_from_kmh(z2_kmh),
        "z2_pct_min": z2["pct_min"],
        "z2_pct_max": z2["pct_max"],
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

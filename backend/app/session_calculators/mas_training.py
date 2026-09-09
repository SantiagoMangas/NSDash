from app.session_calculators.hiit_corto import _parse_ratio
from app.vam_calculator import _format_pace_from_kmh

METODOLOGIA = "MAS Training"
ENTRENAMIENTO_LARGO = "Intervalo Largo"
ENTRENAMIENTO_CORTO = "Intervalo Corto"
ENTRENAMIENTOS_VALIDOS = {ENTRENAMIENTO_LARGO, ENTRENAMIENTO_CORTO}
COD_SI = "SI"
COD_NO = "NO"


def _format_duration_mm_ss(seconds: float) -> str:
    total = int(round(seconds))
    minutes = total // 60
    secs = total % 60
    return f"{minutes}:{secs:02d}"


def _normalize_entrenamiento(entrenamiento: str) -> str:
    value = " ".join(entrenamiento.strip().split()).title()
    # title() turns "intervalo corto" into "Intervalo Corto"
    if value not in ENTRENAMIENTOS_VALIDOS:
        raise ValueError(
            f'Tipo de entrenamiento inválido: "{entrenamiento}". '
            f'Se espera "{ENTRENAMIENTO_LARGO}" o "{ENTRENAMIENTO_CORTO}".'
        )
    return value


def _normalize_cod(cod: str | bool) -> str:
    if isinstance(cod, bool):
        return COD_SI if cod else COD_NO
    value = str(cod).strip().upper().replace("Í", "I")
    if value in {COD_SI, "YES", "TRUE", "1"}:
        return COD_SI
    if value in {COD_NO, "FALSE", "0"}:
        return COD_NO
    raise ValueError(f'COD inválido: "{cod}". Se espera "SI" o "NO".')


def _distancia_intervalo_m(velocidad_kmh: float, trabajo_s: float, shuttles: float) -> float:
    velocidad_ms = velocidad_kmh / 3.6
    tiempo_efectivo_s = trabajo_s - shuttles
    return velocidad_ms * tiempo_efectivo_s


def _calculate_intensity_extreme(
    reference_kmh: float,
    intensidad_pct: float,
    trabajo_s: float,
    pausa_s: float,
    shuttles: float,
    ciclos: float,
    bloques: int,
) -> dict[str, float | str]:
    velocidad_kmh = reference_kmh * intensidad_pct / 100
    distancia_m = _distancia_intervalo_m(velocidad_kmh, trabajo_s, shuttles)
    volumen_serie_m = ciclos * distancia_m
    volumen_trabajo_m = volumen_serie_m * bloques

    return {
        "velocidad_kmh": round(velocidad_kmh, 2),
        "ritmo_str": _format_pace_from_kmh(velocidad_kmh),
        "distancia_m": round(distancia_m, 2),
        "trabajo_s": round(trabajo_s, 2),
        "trabajo_str": _format_duration_mm_ss(trabajo_s),
        "pausa_s": round(pausa_s, 2),
        "pausa_str": _format_duration_mm_ss(pausa_s),
        "volumen_serie_m": round(volumen_serie_m, 2),
        "volumen_trabajo_m": round(volumen_trabajo_m, 2),
    }


def calculate_mas_training(
    reference_kmh: float,
    intensidad_pct_min: float,
    intensidad_pct_max: float,
    trabajo_s: float,
    serie_min: float,
    bloques: int,
    macro_pausa_min: float,
    ratio: str,
    entrenamiento: str,
    cod: str | bool,
    shuttles: float = 0,
    fecha: object | None = None,
) -> dict:
    if reference_kmh <= 0:
        raise ValueError("La métrica MAS de referencia debe ser mayor a 0")
    if trabajo_s <= 0:
        raise ValueError("El tiempo de trabajo debe ser mayor a 0")
    if serie_min <= 0:
        raise ValueError("La serie (min) debe ser mayor a 0")
    if bloques <= 0:
        raise ValueError("Los bloques deben ser un entero mayor a 0")
    if macro_pausa_min < 0:
        raise ValueError("La macro pausa no puede ser negativa")
    if shuttles < 0:
        raise ValueError("Shuttles no puede ser negativo")

    entrenamiento_norm = _normalize_entrenamiento(entrenamiento)
    cod_norm = _normalize_cod(cod)
    shuttles_efectivos = shuttles if cod_norm == COD_SI else 0.0
    if cod_norm == COD_SI and shuttles_efectivos >= trabajo_s:
        raise ValueError("Con COD=SI, Shuttles debe ser menor que el tiempo de trabajo")

    ratio_numerador, ratio_denominador = _parse_ratio(ratio)
    pausa_s = trabajo_s * (ratio_denominador / ratio_numerador)
    ciclos = (serie_min * 60) / (trabajo_s + pausa_s)
    densidad_min = serie_min * bloques + macro_pausa_min

    return {
        "metodologia": METODOLOGIA,
        "entrenamiento": entrenamiento_norm,
        "fecha": fecha,
        "cod": cod_norm,
        "shuttles": shuttles_efectivos,
        "ciclos": round(ciclos, 4),
        "min": _calculate_intensity_extreme(
            reference_kmh,
            intensidad_pct_min,
            trabajo_s,
            pausa_s,
            shuttles_efectivos,
            ciclos,
            bloques,
        ),
        "max": _calculate_intensity_extreme(
            reference_kmh,
            intensidad_pct_max,
            trabajo_s,
            pausa_s,
            shuttles_efectivos,
            ciclos,
            bloques,
        ),
        "serie_min": serie_min,
        "densidad_min": round(densidad_min, 2),
        "densidad_str": _format_duration_mm_ss(densidad_min * 60),
    }

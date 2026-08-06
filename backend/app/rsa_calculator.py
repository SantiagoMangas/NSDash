import math

"""
Pure calculation logic for RSA-IFF (Repeated Sprint Ability - Fatigue Index).
No database or FastAPI dependencies.
"""


def _categorize_fatigue_index(indice_fatiga_pct: float) -> str:
    if indice_fatiga_pct < 10:
        return "Excelente"
    if indice_fatiga_pct < 15:
        return "Bueno"
    if indice_fatiga_pct < 20:
        return "Regular"
    return "Malo"


def calculate_rsa_fatigue_index(tiempos: list[float]) -> dict:
    """
    Calculate RSA fatigue index from a list of sprint times (seconds).

    Args:
        tiempos: Sprint times in seconds, in completion order

    Returns:
        Dictionary with cantidad_sprints, mejor_tiempo, peor_tiempo,
        tiempo_total, tiempo_medio, tiempo_ideal, indice_fatiga_pct, categoria

    Raises:
        ValueError: If fewer than 2 valid sprint times are provided
    """
    if len(tiempos) < 2:
        raise ValueError("tiempos debe contener al menos 2 sprints para calcular el índice de fatiga")

    for tiempo in tiempos:
        if not math.isfinite(tiempo) or tiempo <= 0:
            raise ValueError("cada tiempo debe ser un número positivo válido")

    cantidad_sprints = len(tiempos)
    mejor_tiempo = min(tiempos)
    peor_tiempo = max(tiempos)
    tiempo_total = sum(tiempos)
    tiempo_medio = tiempo_total / cantidad_sprints
    tiempo_ideal = mejor_tiempo * cantidad_sprints
    indice_fatiga_pct = (tiempo_total / tiempo_ideal * 100) - 100

    return {
        "cantidad_sprints": cantidad_sprints,
        "mejor_tiempo": round(mejor_tiempo, 2),
        "peor_tiempo": round(peor_tiempo, 2),
        "tiempo_total": round(tiempo_total, 2),
        "tiempo_medio": round(tiempo_medio, 2),
        "tiempo_ideal": round(tiempo_ideal, 2),
        "indice_fatiga_pct": round(indice_fatiga_pct, 2),
        "categoria": _categorize_fatigue_index(indice_fatiga_pct),
    }


def calculate_rsa_speeds_kmh(
    distancia_sprint_m: float,
    mejor_tiempo: float,
    peor_tiempo: float,
    tiempo_medio: float,
) -> dict:
    """Convert best/worst/mean sprint times to km/h using sprint distance."""
    if not math.isfinite(distancia_sprint_m) or distancia_sprint_m <= 0:
        raise ValueError("distancia_sprint_m debe ser un número positivo válido")
    for label, tiempo in (
        ("mejor_tiempo", mejor_tiempo),
        ("peor_tiempo", peor_tiempo),
        ("tiempo_medio", tiempo_medio),
    ):
        if not math.isfinite(tiempo) or tiempo <= 0:
            raise ValueError(f"{label} debe ser un número positivo válido")

    return {
        "velocidad_mejor_kmh": round((distancia_sprint_m / mejor_tiempo) * 3.6, 2),
        "velocidad_peor_kmh": round((distancia_sprint_m / peor_tiempo) * 3.6, 2),
        "velocidad_media_kmh": round((distancia_sprint_m / tiempo_medio) * 3.6, 2),
    }

import math

"""
Pure calculation logic for MSS / speed tests (Test de Velocidad).
No database or FastAPI dependencies.
"""


def calculate_vel_kmh(distancia_m: float, tiempo_s: float) -> float:
    """
    Calculate sustained speed in km/h from distance (m) and time (s).

    Args:
        distancia_m: Distance covered in meters
        tiempo_s: Elapsed time in seconds

    Returns:
        Speed in km/h

    Raises:
        ValueError: If inputs are invalid or tiempo_s is zero
    """
    if not math.isfinite(distancia_m) or distancia_m <= 0:
        raise ValueError("distancia_m debe ser un número positivo válido")
    if not math.isfinite(tiempo_s) or tiempo_s <= 0:
        raise ValueError("tiempo_s debe ser un número positivo válido")

    vel_kmh = (distancia_m / tiempo_s) * 3.6
    return round(vel_kmh, 2)

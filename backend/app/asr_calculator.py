import math

"""
Pure calculation logic for ASR (Anaerobic Speed Reserve).
No database or FastAPI dependencies.

ASR = MSS - IFT
"""


def calculate_asr(mss_kmh: float, ift_kmh: float) -> float:
    """
    Calculate Anaerobic Speed Reserve in km/h.

    Args:
        mss_kmh: Maximum sprint speed (km/h)
        ift_kmh: 30-15 IFT velocity (km/h)

    Returns:
        ASR in km/h

    Raises:
        ValueError: If inputs are invalid or MSS is not greater than IFT
    """
    if not math.isfinite(mss_kmh) or mss_kmh <= 0:
        raise ValueError("mss_kmh debe ser un número positivo válido")
    if not math.isfinite(ift_kmh) or ift_kmh <= 0:
        raise ValueError("ift_kmh debe ser un número positivo válido")
    if mss_kmh <= ift_kmh:
        raise ValueError("mss_kmh debe ser mayor que ift_kmh para calcular ASR")

    return round(mss_kmh - ift_kmh, 2)


def calculate_from_pct_mss(
    mss_kmh: float,
    ift_kmh: float,
    asr_kmh: float,
    pct_mss: float,
) -> dict:
    """
    Entering by %MSS: derive target speed and the equivalent %SRR.
    """
    if not math.isfinite(pct_mss) or pct_mss <= 0:
        raise ValueError("pct_mss debe ser un número positivo válido")
    if not math.isfinite(asr_kmh) or asr_kmh <= 0:
        raise ValueError("asr_kmh debe ser un número positivo válido")

    velocidad_kmh = mss_kmh * pct_mss / 100
    srr_pct = ((velocidad_kmh - ift_kmh) / asr_kmh) * 100

    return {
        "velocidad_kmh": round(velocidad_kmh, 2),
        "srr_pct": round(srr_pct, 2),
    }


def calculate_from_pct_srr(
    mss_kmh: float,
    ift_kmh: float,
    asr_kmh: float,
    pct_srr: float,
) -> dict:
    """
    Entering by %SRR: derive target speed and the equivalent %MSS.
    """
    if not math.isfinite(pct_srr):
        raise ValueError("pct_srr debe ser un número válido")
    if not math.isfinite(asr_kmh) or asr_kmh <= 0:
        raise ValueError("asr_kmh debe ser un número positivo válido")
    if not math.isfinite(mss_kmh) or mss_kmh <= 0:
        raise ValueError("mss_kmh debe ser un número positivo válido")

    velocidad_kmh = (pct_srr * asr_kmh / 100) + ift_kmh
    mmss_pct = (velocidad_kmh / mss_kmh) * 100

    return {
        "velocidad_kmh": round(velocidad_kmh, 2),
        "mmss_pct": round(mmss_pct, 2),
    }

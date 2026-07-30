import math

"""
Pure calculation logic for VAM (Maximum Aerobic Velocity) module.
No database or FastAPI dependencies.
"""

VAM_ZONES = [
    {"zona": "Zona 1", "intensidad": "Recuperación", "pct_min": 0.55, "pct_max": 0.65},
    {"zona": "Zona 2", "intensidad": "Endurance", "pct_min": 0.65, "pct_max": 0.75},
    {"zona": "Zona 3", "intensidad": "Tempo", "pct_min": 0.75, "pct_max": 0.82},
    {"zona": "Zona 4", "intensidad": "Umbral", "pct_min": 0.82, "pct_max": 0.88},
    {"zona": "Zona 5", "intensidad": "SupraUmbral", "pct_min": 0.88, "pct_max": 0.95},
    {"zona": "Zona 6", "intensidad": "Vo2Max", "pct_min": 0.95, "pct_max": 1.00},
    {"zona": "Zona 7", "intensidad": "Glucolítico I", "pct_min": 1.00, "pct_max": 1.10},
    {"zona": "Zona 8", "intensidad": "Glucolítico II", "pct_min": 1.10, "pct_max": 1.20},
]

SPRINT_DISTANCES = [10, 20, 30, 40, 50, 100, 200, 300, 400, 500, 1000]


def calculate_zones(vam_mpm: float) -> list[dict]:
    """
    Calculate 8 training zones from VAM in m/min.
    
    Args:
        vam_mpm: VAM in meters per minute
    
    Returns:
        List of 8 zones with velocities and paces for each zone
    """
    zones = []
    
    for zone_def in VAM_ZONES:
        # Calculate velocity bounds for this zone (in m/min)
        vel_min_mpm = vam_mpm * zone_def["pct_min"]
        vel_max_mpm = vam_mpm * zone_def["pct_max"]
        
        # Convert to m/s
        vel_min_ms = vel_min_mpm / 60
        vel_max_ms = vel_max_mpm / 60
        
        # Convert to km/h
        vel_min_kmh = (vel_min_mpm * 60) / 1000
        vel_max_kmh = (vel_max_mpm * 60) / 1000
        
        # Calculate pace (seconds per km)
        # ritmo = 1000 / velocidad_en_mpm * 60 (convertir a segundos)
        if vel_min_mpm > 0:
            ritmo_max_seg = (1000 / vel_min_mpm) * 60  # max pace (slower) at min velocity
        else:
            ritmo_max_seg = 0
            
        if vel_max_mpm > 0:
            ritmo_min_seg = (1000 / vel_max_mpm) * 60  # min pace (faster) at max velocity
        else:
            ritmo_min_seg = 0
        
        zones.append({
            "zona": zone_def["zona"],
            "intensidad": zone_def["intensidad"],
            "pct_min": zone_def["pct_min"],
            "pct_max": zone_def["pct_max"],
            "vel_min_ms": round(vel_min_ms, 2),
            "vel_max_ms": round(vel_max_ms, 2),
            "vel_min_kmh": round(vel_min_kmh, 2),
            "vel_max_kmh": round(vel_max_kmh, 2),
            "velocidad_ms": round(vel_max_ms, 2),  # Use max velocity as reference
            "velocidad_kmh": round(vel_max_kmh, 2),
            "ritmo_min_seg": round(ritmo_min_seg, 1),  # Fastest pace (seconds)
            "ritmo_max_seg": round(ritmo_max_seg, 1),  # Slowest pace (seconds)
        })
    
    return zones


def calculate_sprint_times(vam_ms: float) -> list[dict]:
    """
    Calculate estimated sprint times for each distance.
    
    Args:
        vam_ms: VAM in meters per second
    
    Returns:
        List of {distancia, tiempo_segundos} for each sprint distance
    """
    sprint_times = []
    
    for distance in SPRINT_DISTANCES:
        if vam_ms > 0:
            time_seconds = distance / vam_ms
        else:
            time_seconds = 0
        
        sprint_times.append({
            "distancia": distance,
            "tiempo_segundos": round(time_seconds, 2),
        })
    
    return sprint_times


YOYO_RI1_TABLE = {
    5: 11.0, 6: 11.5, 7: 12.0, 8: 12.5, 9: 13.0, 10: 13.5,
    11: 14.0, 12: 14.5, 13: 15.0, 14: 15.5, 15: 16.0, 16: 16.5,
    17: 17.0, 18: 17.5, 19: 18.0, 20: 18.5, 21: 19.0, 22: 19.5,
    23: 20.0, 24: 20.5, 25: 21.0
}


def _format_pace_from_kmh(vel_kmh: float) -> str:
    if vel_kmh <= 0 or not math.isfinite(vel_kmh):
        return "0:00"
    total_seconds = 3600 / vel_kmh
    minutes = int(total_seconds // 60)
    seconds = int(round(total_seconds - minutes * 60))
    if seconds == 60:
        minutes += 1
        seconds = 0
    return f"{minutes}:{seconds:02d}"


def _get_yoyo_reference_speed(vam_kmh: float) -> float:
    level = math.floor(vam_kmh)
    if level in YOYO_RI1_TABLE:
        return YOYO_RI1_TABLE[level]

    lower_levels = [lvl for lvl in YOYO_RI1_TABLE.keys() if lvl < level]
    if lower_levels:
        return YOYO_RI1_TABLE[max(lower_levels)]

    return vam_kmh


def calculate_interval_table(vam_kmh: float, source: str) -> dict:
    source = source.lower()
    reference_kmh = vam_kmh
    if source == "yoyo":
        reference_kmh = _get_yoyo_reference_speed(vam_kmh)

    if source == "speed_test":
        tr_extensivo_pcts = [70, 80]
        tr_recovery_pcts = [60, 70]
        rst_pcts = [80, 90]
        sit_pcts = [85, 95]
        rows = []
        for pct in tr_extensivo_pcts:
            rows.append({
                "porcentaje": pct,
                "velocidad_kmh": round(reference_kmh * pct / 100, 2),
                "ritmo_str": _format_pace_from_kmh(reference_kmh * pct / 100),
                "tipo": "tr_extensivo",
            })
        for pct in tr_recovery_pcts:
            rows.append({
                "porcentaje": pct,
                "velocidad_kmh": round(reference_kmh * pct / 100, 2),
                "ritmo_str": _format_pace_from_kmh(reference_kmh * pct / 100),
                "tipo": "tr_recovery",
            })
        for pct in rst_pcts:
            rows.append({
                "porcentaje": pct,
                "velocidad_kmh": round(reference_kmh * pct / 100, 2),
                "ritmo_str": _format_pace_from_kmh(reference_kmh * pct / 100),
                "tipo": "rst",
            })
        for pct in sit_pcts:
            rows.append({
                "porcentaje": pct,
                "velocidad_kmh": round(reference_kmh * pct / 100, 2),
                "ritmo_str": _format_pace_from_kmh(reference_kmh * pct / 100),
                "tipo": "sit",
            })
        return {
            "source": source,
            "reference_kmh": round(reference_kmh, 2),
            "rows": rows,
        }

    if source == "30_15":
        fit_corto_pcts = [95, 100, 105, 110, 115]
        fit_largo_pcts = [95, 100]
        mas_training_pcts = [100, 105, 110, 115]
    else:
        fit_corto_pcts = [80, 85, 90, 95, 100, 105, 110]
        fit_largo_pcts = [80, 85, 90, 95, 100]
        mas_training_pcts = [100, 105, 110, 115, 120]

    rows = []
    for pct in fit_corto_pcts:
        rows.append({
            "porcentaje": pct,
            "velocidad_kmh": round(reference_kmh * pct / 100, 2),
            "ritmo_str": _format_pace_from_kmh(reference_kmh * pct / 100),
            "tipo": "fit_corto",
        })
    for pct in fit_largo_pcts:
        rows.append({
            "porcentaje": pct,
            "velocidad_kmh": round(reference_kmh * pct / 100, 2),
            "ritmo_str": _format_pace_from_kmh(reference_kmh * pct / 100),
            "tipo": "fit_largo",
        })
    for pct in mas_training_pcts:
        rows.append({
            "porcentaje": pct,
            "velocidad_kmh": round(reference_kmh * pct / 100, 2),
            "ritmo_str": _format_pace_from_kmh(reference_kmh * pct / 100),
            "tipo": "mas_training",
        })

    return {
        "source": source,
        "reference_kmh": round(reference_kmh, 2),
        "rows": rows,
    }


def calculate_vam_from_test(test_type: str, value1: float, value2: float = None) -> dict:
    """
    Calculate VAM from test data.
    
    Args:
        test_type: One of "vam_2000m", "vam_5min", "test_30_15_ift", "yoyo_ri1"
        value1: First value (varies by test_type)
        value2: Optional second value (varies by test_type)
    
    Returns:
        Dictionary with vam_mpm, vam_kmh, vam_ms
    
    Raises:
        ValueError: If test_type or values are invalid
    """
    if test_type == "vam_2000m":
        # value1: distance (m), value2: time (min)
        if value2 is None or value2 == 0:
            raise ValueError("vam_2000m requires value2 (time in minutes)")
        ritmo_promedio = (value2 * 60) / value1  # seconds per meter
        vam_mpm = 60 / ritmo_promedio  # convert to m/min
        
    elif test_type == "vam_5min":
        # value1: time (min), value2: distance (m)
        if value1 is None or value1 == 0:
            raise ValueError("vam_5min requires value1 (time in minutes)")
        ritmo_promedio = (value1 * 60) / value2  # seconds per meter
        vam_mpm = 60 / ritmo_promedio  # convert to m/min
        
    elif test_type == "test_30_15_ift":
        # value1: final velocity (km/h)
        # VIFT is the VAM itself
        vam_kmh = value1
        vam_mpm = (vam_kmh * 1000) / 60
        vam_ms = vam_kmh / 3.6
        return {"vam_mpm": round(vam_mpm, 2), "vam_kmh": round(vam_kmh, 2), "vam_ms": round(vam_ms, 2)}
        
    elif test_type == "yoyo_ri1":
        # value1: level, value2: velocity (km/h)
        # Use the velocity directly from the test
        vam_kmh = value2
        vam_mpm = (vam_kmh * 1000) / 60
        vam_ms = vam_kmh / 3.6
        return {"vam_mpm": round(vam_mpm, 2), "vam_kmh": round(vam_kmh, 2), "vam_ms": round(vam_ms, 2)}
        
    else:
        raise ValueError(f"Unknown test_type: {test_type}")
    
    # Convert m/min to other units
    vam_kmh = (vam_mpm * 60) / 1000
    vam_ms = vam_mpm / 60
    
    return {
        "vam_mpm": round(vam_mpm, 2),
        "vam_kmh": round(vam_kmh, 2),
        "vam_ms": round(vam_ms, 2),
    }

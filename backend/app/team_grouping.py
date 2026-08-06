import math

"""
Pure team grouping logic for the National table.
No database or FastAPI dependencies.
"""

from typing import Any


def group_athletes(
    athletes: list[dict[str, Any]],
    cantidad_grupos: int,
    diferencia_pct: float,
) -> list[list[dict[str, Any]]]:
    """
    Group athletes by reference speed using per-group ceiling anchors.

    Algorithm:
    1. Sort athletes by velocidad_referencia descending.
    2. Fastest athlete is the ceiling of Group 1.
    3. Next athlete joins current group if
       velocidad >= techo_actual * (1 - diferencia_pct/100);
       otherwise a new group opens with that athlete as the new ceiling
       (while max groups not yet reached).
    4. Once the maximum number of groups is reached, all remaining
       athletes accumulate in the last group regardless of the threshold.

    Each athlete dict must include at least:
      - id
      - nombre
      - velocidad_referencia (float)
    """
    if not isinstance(cantidad_grupos, int) or cantidad_grupos < 1:
        raise ValueError("cantidad_grupos debe ser un entero >= 1")
    if not math.isfinite(diferencia_pct) or diferencia_pct < 0:
        raise ValueError("diferencia_pct debe ser un número >= 0")

    if not athletes:
        return []

    for athlete in athletes:
        speed = athlete.get("velocidad_referencia")
        if speed is None or not math.isfinite(speed):
            raise ValueError("cada atleta debe tener velocidad_referencia numérica válida")

    sorted_athletes = sorted(
        athletes,
        key=lambda item: (-float(item["velocidad_referencia"]), str(item.get("nombre", "")), item.get("id")),
    )

    groups: list[list[dict[str, Any]]] = []
    current_group: list[dict[str, Any]] = [sorted_athletes[0]]
    techo = float(sorted_athletes[0]["velocidad_referencia"])

    for athlete in sorted_athletes[1:]:
        speed = float(athlete["velocidad_referencia"])
        threshold = techo * (1 - diferencia_pct / 100)

        if speed >= threshold:
            current_group.append(athlete)
            continue

        # Current open group is already the last allowed one: dump remainder.
        if len(groups) + 1 >= cantidad_grupos:
            current_group.append(athlete)
            continue

        groups.append(current_group)
        current_group = [athlete]
        techo = speed

    groups.append(current_group)
    return groups

from typing import Optional
from datetime import date


def build_cache_key(
    namespace: str,
    scope: str,
    line_id: Optional[str] = None,
    station: Optional[str] = None,
    datatype: Optional[str] = None,
    day: Optional[date] = None,
) -> str:
    """
    สร้าง Redis key แบบ structured และอ่านง่าย

    ตัวอย่าง output:
        failures:today:B3:summary
        failures:2025-07-15:B3:ATS1:detail

    Parameters:
        namespace (str): ชุดข้อมูล เช่น 'failures'
        scope (str): today / yesterday / weekly / monthly
        line_id (Optional[str]): line ID เช่น 'B3'
        station (Optional[str]): station เช่น 'ATS1'
        datatype (Optional[str]): summary / detail / …
        day (Optional[date]): ระบุวันแบบ YYYY-MM-DD แทน scope ได้

    Returns:
        str: Redis key
    """
    parts = [namespace]

    if day:
        parts.append(str(day))
    else:
        parts.append(scope)

    if line_id:
        parts.append(line_id)

    if station:
        parts.append(station)

    if datatype:
        parts.append(datatype)

    return ":".join(parts)

from typing import Optional
from datetime import date

def build_cache_key(
    namespace: str,
    scope: str,
    line_id: Optional[str] = None,
    station: Optional[str] = None,
    datatype: Optional[str] = None,
    day: Optional[date] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> str:
    """
    สร้าง Redis key แบบ structured และอ่านง่าย
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

    # แก้ไขส่วนนี้เพื่อให้รองรับ start_date และ end_date
    if start_date and end_date:
        parts.append(f"{start_date}:{end_date}")
    elif day:
        parts.append(str(day))

    if datatype:
        parts.append(datatype)

    return ":".join(parts)
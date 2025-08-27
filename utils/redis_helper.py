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
        end_date: Optional[str] = None,
        work_date: Optional[str] = None
) -> str:
    """
    สร้าง Redis key แบบ structured และอ่านง่าย
    """
    parts = [namespace, scope]

    if line_id:
        parts.append(line_id)

    if station:
        parts.append(station)

    # ใช้ค่าวันที่เพียงหนึ่งค่าเท่านั้น เพื่อป้องกันความสับสน
    date_part = None
    if work_date:
        date_part = work_date
    elif day:
        date_part = str(day)
    elif start_date and end_date:
        date_part = f"{start_date}:{end_date}"

    if date_part:
        parts.append(date_part)

    if datatype:
        parts.append(datatype)

    return ":".join(parts)
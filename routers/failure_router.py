from fastapi import APIRouter, Query, Depends
from datetime import date
from sqlalchemy.orm import Session
from db.session import get_db
from schemas.failure_schema import FailureStationQuery
from services.failure_service import fetch_station

router = APIRouter(prefix="/failures", tags=["Failures"])

@router.get("/select")
def get_station_count(
    line_id: str = Query(...),
    start_date: date = Query(...),
    end_date: date = Query(...),
    db: Session = Depends(get_db)  # เพิ่ม dependency injection
):
    data = FailureStationQuery(
        lineId=line_id,
        startDate=start_date,
        endDate=end_date
    )
    return fetch_station(db=db, data=data)  # ส่ง db เข้าไปใน service

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from services.failure_today_service import fetch_failures_today
from db.session import get_db

router = APIRouter(prefix="/failures", tags=["Failures"])

@router.get("/today")
def get_failures_today(db: Session = Depends(get_db)):
    return fetch_failures_today(db)

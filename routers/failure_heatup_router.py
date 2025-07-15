from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from services.failure_heatup_service import fetch_failure_heatup
from db.session import get_db
from schemas.failure_schema import FailureByStation
from typing import List

router = APIRouter(prefix="/failures", tags=["Failures"])

@router.get("/heatup", response_model=List[FailureByStation])
def get_failures_today(db: Session = Depends(get_db)):
    results = fetch_failure_heatup(db)
    return results

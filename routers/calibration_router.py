from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List
from db.session import get_db
from schemas.calibration_schema import CalibrationCreate, CalibrationUpdate, CalibrationResponse, CalibrationHistoryResponse
from crud.calibration_crud import create_calibration, get_calibration, update_calibration, delete_calibration, \
    list_calibrations, get_calibration_history
from models.calibration_model import APEBMCalibration
import os

router = APIRouter(prefix="/calibration", tags=["Calibration"])

SECRET_PASS = os.getenv('PW_CALIBRATION')

@router.get("/", response_model=List[CalibrationResponse])
def list_all(db: Session = Depends(get_db), q: str | None = None,
             station: str | None = None, status: str | None = None,
             line_id: str | None = None):
    rows = list_calibrations(db)

    def match(r: APEBMCalibration) -> bool:
        if station and r.Station != station: return False
        if status and r.Status != status:   return False
        if line_id and r.LineID != line_id: return False
        if q:
            hay = " ".join([
                str(r.Station or ""), str(r.Equipment or ""), str(r.Brand or ""),
                str(r.Model or ""), str(r.Seriesnumber or ""), str(r.DT or ""),
                str(r.LineID or ""), str(r.Responsible or ""), str(r.Status or ""),
                str(r.Comment or "")
            ]).lower()
            if q.lower() not in hay: return False
        return True

    return [r for r in rows if match(r)]

@router.get("/choices")
def choices(db: Session = Depends(get_db)):
    rows = list_calibrations(db)
    stations = sorted({r.Station for r in rows if r.Station})
    lines = sorted({r.LineID for r in rows if r.LineID})
    brands = sorted({r.Brand for r in rows if r.Brand})
    people = sorted({r.Responsible for r in rows if r.Responsible})
    equips = sorted({r.Equipment for r in rows if r.Equipment})
    statuses = sorted({r.Status for r in rows if r.Status})

    models_by_brand = {}
    for r in rows:
        if r.Brand:
            models_by_brand.setdefault(r.Brand, set())
            if r.Model: models_by_brand[r.Brand].add(r.Model)
    models_by_brand = {k: sorted(list(v)) for k, v in models_by_brand.items()}

    return {
        "stations": stations, "lines": lines, "brands": brands,
        "responsible": people, "equipment": equips, "statuses": statuses,
        "models": models_by_brand
    }

# 👉 endpoint สำหรับ add choice
@router.post("/add_choice")
def add_choice(
        kind: str = Body(..., embed=True),
        value: str = Body(..., embed=True),
        passcode: str = Body(..., embed=True),
        db: Session = Depends(get_db)
):
    if passcode != SECRET_PASS:
        raise HTTPException(status_code=403, detail="Invalid passcode")
    # TODO: save to DB metadata table
    return {"message": f"{kind} '{value}' added"}

@router.post("/verify_password")
def verify_password(passcode: str = Body(..., embed=True)):
    if passcode != SECRET_PASS:
        raise HTTPException(status_code=403, detail="Invalid passcode")
    return {"message": "Password verified"}

@router.post("/", response_model=CalibrationResponse)
def create(cal: CalibrationCreate, db: Session = Depends(get_db)):
    return create_calibration(db, cal)

@router.get("/{cal_id}", response_model=CalibrationResponse)
def read(cal_id: int, db: Session = Depends(get_db)):
    cal = get_calibration(db, cal_id)
    if not cal:
        raise HTTPException(status_code=404, detail="Calibration not found")
    return cal

@router.put("/{cal_id}", response_model=CalibrationResponse)
def update(cal_id: int, cal_update: CalibrationUpdate, db: Session = Depends(get_db)):
    cal = update_calibration(db, cal_id, cal_update)
    if not cal:
        raise HTTPException(status_code=404, detail="Calibration not found")
    return cal

@router.delete("/{cal_id}")
def delete(cal_id: int, deleted_by: str, db: Session = Depends(get_db)):
    cal = delete_calibration(db, cal_id, deleted_by)
    if not cal:
        raise HTTPException(status_code=404, detail="Calibration not found")
    return {"message": "Calibration deleted successfully"}

@router.get("/history/{series}", response_model=List[CalibrationHistoryResponse])
def history(series: str, db: Session = Depends(get_db)):
    rows = get_calibration_history(db, series)
    if not rows:
        raise HTTPException(status_code=404, detail="No history found")
    return rows

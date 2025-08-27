from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.session import get_db
from schemas.calibration_schema import CalibrationCreate, CalibrationUpdate, CalibrationResponse
from crud.calibration_crud import create_calibration, get_calibration, update_calibration, delete_calibration

router = APIRouter(prefix="/calibration", tags=["Calibration"])

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

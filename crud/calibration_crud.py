from sqlalchemy.orm import Session
from models.calibration_model import  APEBMCalibration
from schemas.calibration_schema import CalibrationCreate, CalibrationUpdate
from datetime import datetime

def create_calibration(db: Session, cal: CalibrationCreate):
    new_cal = APEBMCalibration(**cal.dict())
    db.add(new_cal)
    db.commit()
    db.refresh(new_cal)
    return new_cal

def get_calibration(db: Session, cal_id: int):
    return db.query(APEBMCalibration).filter(APEBMCalibration.ID == cal_id, APEBMCalibration.IsDeleted == False).first()

def update_calibration(db: Session, cal_id: int, update_data: CalibrationUpdate):
    cal = get_calibration(db, cal_id)
    if not cal:
        return None
    for field, value in update_data.dict(exclude_unset=True).items():
        setattr(cal, field, value)
    db.commit()
    db.refresh(cal)
    return cal

def delete_calibration(db: Session, cal_id: int, deleted_by: str):
    cal = get_calibration(db, cal_id)
    if not cal:
        return None
    cal.IsDeleted = True
    cal.DeletedBy = deleted_by
    cal.DeletedDate = datetime.utcnow()
    db.commit()
    return cal

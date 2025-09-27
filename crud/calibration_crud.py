from sqlalchemy.orm import Session
from models.calibration_model import APEBMCalibration, APEBMCalibrationHistory
from schemas.calibration_schema import CalibrationCreate, CalibrationUpdate
from datetime import datetime

def log_history(db: Session, cal: APEBMCalibration, action: str, user="Web User"):
    # หาเวอร์ชันล่าสุดจาก History ของ Seriesnumber เดียวกัน
    last = db.query(APEBMCalibrationHistory).filter(
        APEBMCalibrationHistory.Seriesnumber == cal.Seriesnumber
    ).order_by(APEBMCalibrationHistory.Version.desc()).first()

    new_version = (last.Version + 1) if last else 1

    hist = APEBMCalibrationHistory(
        CalibrationID=cal.ID,
        Seriesnumber=cal.Seriesnumber,
        Version=new_version,
        ActionType=action,
        ActionBy=user,
        ActionDate=datetime.now(),
        Station=cal.Station,
        Equipment=cal.Equipment,
        Brand=cal.Brand,
        Model=cal.Model,
        DT=cal.DT,
        StartDate=cal.StartDate,
        EndDate=cal.EndDate,
        LineID=cal.LineID,
        Comment=cal.Comment,
        Status=cal.Status,
        Responsible=cal.Responsible,
        AssetNumber=cal.AssetNumber
    )
    db.add(hist)
    db.commit()

def create_calibration(db: Session, cal: CalibrationCreate, user="Web User"):
    new_cal = APEBMCalibration(**cal.dict(), Timestamp=datetime.now(), Version=1)
    db.add(new_cal)
    db.commit()
    db.refresh(new_cal)
    log_history(db, new_cal, "INSERT", user)
    return new_cal

def get_calibration(db: Session, cal_id: int):
    return db.query(APEBMCalibration).filter(
        APEBMCalibration.ID == cal_id,
        APEBMCalibration.IsDeleted == False
    ).first()

def update_calibration(db: Session, cal_id: int, cal_update: CalibrationUpdate, user="Web User"):
    cal = db.query(APEBMCalibration).filter(APEBMCalibration.ID == cal_id).first()
    if not cal:
        return None
    
    # Update the record first
    for key, value in cal_update.dict(exclude_unset=True).items():
        setattr(cal, key, value)
    cal.Version += 1
    cal.Timestamp = datetime.now()
    db.commit()
    db.refresh(cal)
    
    # Log history AFTER updating the record to capture the new values
    log_history(db, cal, "UPDATE", user)
    return cal

def delete_calibration(db: Session, cal_id: int, user="Web User"):
    cal = db.query(APEBMCalibration).filter(APEBMCalibration.ID == cal_id).first()
    if not cal:
        return None
    log_history(db, cal, "DELETE", user)
    cal.IsDeleted = True
    cal.DeletedBy = user
    cal.DeletedDate = datetime.now()
    db.commit()
    return cal

def list_calibrations(db: Session):
    return db.query(APEBMCalibration).filter(APEBMCalibration.IsDeleted == False).all()

def get_calibration_history(db: Session, seriesnumber: str):
    return db.query(APEBMCalibrationHistory).filter(
        APEBMCalibrationHistory.Seriesnumber == seriesnumber
    ).order_by(APEBMCalibrationHistory.Version).all()

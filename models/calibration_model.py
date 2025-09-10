from sqlalchemy import Column, Integer, String, DateTime, Boolean
from db.session import Base
from datetime import datetime

class APEBMCalibration(Base):
    __tablename__ = "APBMCalibrationtools"

    ID = Column(Integer, primary_key=True, index=True)
    Station = Column(String(50))
    Equipment = Column(String(50))
    Brand = Column(String)
    Model = Column(String(50))
    DT = Column(String(50))
    StartDate = Column(DateTime)
    EndDate = Column(DateTime)
    LineID = Column(String(50))
    Comment = Column(String)
    Status = Column(String(50))
    Seriesnumber = Column(String(50))
    Responsible = Column(String(50))
    AssetNumber = Column(String(50))
    Timestamp = Column(DateTime, default=datetime.utcnow)
    IsDeleted = Column(Boolean, default=False)
    DeletedBy = Column(String(100), nullable=True)
    DeletedDate = Column(DateTime, nullable=True)
    Version = Column(Integer, default=1)

class APEBMCalibrationHistory(Base):
    __tablename__ = "APEBMCalibrationHistory"

    HistoryID = Column(Integer, primary_key=True, index=True)
    CalibrationID = Column(Integer)
    Seriesnumber = Column(String(50))
    Version = Column(Integer, default=1, nullable=False)
    ActionType = Column(String(20))
    ActionBy = Column(String(100))
    ActionDate = Column(DateTime)

    Station = Column(String(50))
    Equipment = Column(String(50))
    Brand = Column(String)
    Model = Column(String(50))
    DT = Column(String(50))
    StartDate = Column(DateTime)
    EndDate = Column(DateTime)
    LineID = Column(String(50))
    Comment = Column(String)
    Status = Column(String(50))
    Responsible = Column(String(50))
    AssetNumber = Column(String(50))
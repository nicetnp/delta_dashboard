from pydantic import BaseModel
from datetime import datetime
from typing import Optional

# -----------------------
# Base Schema
# -----------------------
class CalibrationBase(BaseModel):
    Station: Optional[str] = None
    Equipment: Optional[str] = None
    Brand: Optional[str] = None
    Model: Optional[str] = None
    DT: Optional[str] = None
    StartDate: Optional[datetime] = None
    EndDate: Optional[datetime] = None
    LineID: Optional[str] = None
    Comment: Optional[str] = None
    Status: Optional[str] = None
    Seriesnumber: Optional[str] = None
    Responsible: Optional[str] = None
    AssetNumber: Optional[str] = None

# -----------------------
# Create / Update
# -----------------------
class CalibrationCreate(CalibrationBase):
    Station: str
    Equipment: str
    Brand: str
    Model: str
    DT: str
    StartDate: datetime
    EndDate: datetime
    LineID: str
    Status: str
    Seriesnumber: str
    Responsible: str
    AssetNumber: str

class CalibrationUpdate(CalibrationBase):
    pass

# -----------------------
# Response
# -----------------------
class CalibrationResponse(CalibrationBase):
    ID: int
    Timestamp: Optional[datetime] = None
    IsDeleted: Optional[bool] = False
    DeletedBy: Optional[str] = None
    DeletedDate: Optional[datetime] = None

    class Config:
        orm_mode = True

# -----------------------
# History Response
# -----------------------
class CalibrationHistoryResponse(BaseModel):
    HistoryID: int
    CalibrationID: int
    Seriesnumber: str
    Version: int
    ActionType: str
    ActionBy: str
    ActionDate: datetime

    Station: Optional[str] = None
    Equipment: Optional[str] = None
    Brand: Optional[str] = None
    Model: Optional[str] = None
    DT: Optional[str] = None
    StartDate: Optional[datetime] = None
    EndDate: Optional[datetime] = None
    LineID: Optional[str] = None
    Comment: Optional[str] = None
    Status: Optional[str] = None
    Responsible: Optional[str] = None
    AssetNumber: Optional[str] = None

    class Config:
        orm_mode = True

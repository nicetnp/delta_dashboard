from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class CalibrationBase(BaseModel):
    Station: str
    Equipment: str
    Brand: str
    Model: str
    DT: str
    StartDate: datetime
    EndDate: datetime
    LineID: str
    Comment: Optional[str] = None
    Status: str
    Seriesnumber: str
    Responsible: str
    AssetNumber: str

class CalibrationCreate(CalibrationBase):
    pass

class CalibrationUpdate(BaseModel):
    Station: Optional[str]
    Equipment: Optional[str]
    Brand: Optional[str]
    Model: Optional[str]
    DT: Optional[str]
    StartDate: Optional[datetime]
    EndDate: Optional[datetime]
    LineID: Optional[str]
    Comment: Optional[str]
    Status: Optional[str]
    Seriesnumber: Optional[str]
    Responsible: Optional[str]
    AssetNumber: Optional[str]

class CalibrationResponse(CalibrationBase):
    ID: int
    Timestamp: datetime

    class Config:
        orm_mode = True

from pydantic import BaseModel
from datetime import datetime
from typing import Optional

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
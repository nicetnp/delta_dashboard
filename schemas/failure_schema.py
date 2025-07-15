from pydantic import BaseModel
from datetime import date,datetime

class FailureStationQuery(BaseModel):
    lineId: str
    startDate: date
    endDate: date

class FailureSelectStation(BaseModel):
    lineId: str

class FailureByDay(BaseModel):
    workDate: date
    vflash1: int
    hipot1: int
    ats1: int
    heatup: int
    burnin: int
    hipot2: int
    ats2: int
    vflash2: int
    ats3: int
    total: int

class FailureByStation(BaseModel):
    testerId: str
    failItem: str
    workDate: datetime

from pydantic import BaseModel
from datetime import date,datetime
from typing import Optional

class FailureStationQuery(BaseModel):
    lineId: str
    startDate: date
    endDate: date

class FailureSelectStation(BaseModel):
    lineId: str
    startDate: Optional[date] = None
    endDate: Optional[date] = None

class FailureByDay(BaseModel):
    workDate: date
    vflash1: int
    hipot1: int
    ats1: int
    heatup: int
    vibration: int
    burnin: int
    hipot2: int
    ats2: int
    vflash2: int
    ats3: int
    total: int

class FailureByStation(BaseModel):
    sn: str
    model: str
    testerId: str
    fixtureId: str
    failItem: Optional[str] = None
    workDate: datetime

class FailureStation(BaseModel):
    lineId: str
    station: str
    workDate: Optional[str] = None

class FailureFixture(BaseModel):
    lineId: str
    startDate: date
    endDate: date

class FailureByFixture(BaseModel):
    sn: str
    model: str
    testerId: str
    fixtureId: str
    failItem: Optional[str] = None
    workDate: datetime

class FailureTester(BaseModel):
    lineId: str
    station: Optional[str]  # สามารถเป็น None
    startDate: date
    endDate: date

class FailureByTester(BaseModel):
    sn: str
    model: str
    testerId: str
    fixtureId: str
    failItem: Optional[str] = None
    workDate: datetime
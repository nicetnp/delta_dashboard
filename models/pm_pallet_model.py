from sqlalchemy import Column, Integer, String, DateTime, Boolean
from db.session import Base
from datetime import datetime

class PM_Pallet_History(Base):
    __tablename__ = "historypallet"

    Id = Column(Integer, primary_key=True, index=True)
    Detail = Column(String)
    DateTime = Column(DateTime, default=datetime.utcnow)
    Pallet = Column(String(10))
    LineID = Column(String(10))
    Status = Column(String(10))

class PM_Pallet(Base):
    __tablename__ = "PMPALLET"
    Id = Column(Integer, primary_key=True, index=True)
    LineID = Column(String(10))
    Pallet = Column(String(10))
    PMNumber = Column(String(50))
    PMdate = Column(DateTime)
    Duedate = Column(DateTime)
    Status = Column(String(50))
    Remark = Column(String)


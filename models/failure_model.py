#For Alchemy query
# from sqlalchemy import Column, Integer, String, DateTime
# from sqlalchemy.ext.declarative import declarative_base
#
# Base = declarative_base()
#
# class FailureRecord(Base):
#     __tablename__ = "APBM_FailuresPareto"
#
#     id = Column("ID", Integer, primary_key=True, autoincrement=True)
#     line_id = Column("LineID", String(15))
#     fg_partnumber = Column("FGpartnumber", String(50), nullable=False)
#     station = Column("Station", String(50), nullable=False)
#     tracking_number = Column("Trackingnumber", String(50), nullable=False)
#     operator = Column("Operator", String(50))
#     datetime = Column("DateTime", DateTime)
#     fail_item = Column("FailItem", String)
#     tester_id = Column("TesterID", String(50), nullable=False)
#     fixture_id = Column("FixtureID", String(50))
#     work_order = Column("WorkOrder", String(50), nullable=False)
#     test_program_name = Column("TestProgramName", String)

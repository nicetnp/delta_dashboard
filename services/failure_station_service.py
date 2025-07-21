from sqlalchemy import text
from sqlalchemy.orm import Session
from schemas.failure_schema import FailureStation

def fetch_failure_station(data:FailureStation,db: Session):
    work_date = data.workDate
    if not work_date:
        from datetime import datetime
        work_date = datetime.now().strftime("%Y-%m-%d")
    query = text("""
        SELECT TesterID AS testerId,
               FixtureID AS fixtureId,
               CASE WHEN CHARINDEX(')', FailItem) > 0 AND CHARINDEX('}', FailItem) > 0
                    THEN SUBSTRING(FailItem,CHARINDEX(')', FailItem) + 1,
                    CHARINDEX('}', FailItem) - CHARINDEX(')', FailItem) - 1) ELSE NULL END AS failItem,
                    CONVERT(VARCHAR, DateTime, 120) AS workDate
        FROM APBM_FailuresPareto
        WHERE LineID = :lineId AND CAST(DATEADD(MINUTE, -460, DateTime) AS DATE) = :workDate
        GROUP BY TesterID,FixtureID, FailItem, DateTime
        HAVING COUNT(DISTINCT CASE WHEN Station LIKE :station THEN TrackingNumber END) > 0
        ORDER BY workDate ASC;
        """)

    result = db.execute(query, {
        "lineId": data.lineId,
        "station": data.station,
        "workDate": work_date})

    rows = [dict(row._mapping) for row in result]
    return [{**row, }for row in rows]

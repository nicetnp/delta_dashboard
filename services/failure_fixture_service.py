from sqlalchemy import text
from sqlalchemy.orm import Session
from schemas.failure_schema import FailureFixture


def fetch_failure_fixture(data:FailureFixture,db: Session):
    query = text("""
        SELECT Trackingnumber AS sn,
               FGpartnumber AS model,
               TesterID AS testerId,
               FixtureID AS fixtureId,
               CASE WHEN CHARINDEX(')', FailItem) > 0 AND CHARINDEX('}', FailItem) > 0
                    THEN SUBSTRING(FailItem,CHARINDEX(')', FailItem) + 1,
                    CHARINDEX('}', FailItem) - CHARINDEX(')', FailItem) - 1) ELSE NULL END AS failItem,
                    CONVERT(VARCHAR, DateTime, 120) AS workDate
        FROM APBM_FailuresPareto
        WHERE LineID = :lineId AND CAST(DATEADD(MINUTE, -460, DateTime) AS DATE) BETWEEN :startDate AND :endDate
        GROUP BY TesterID,FixtureID, FailItem, DateTime, Trackingnumber,FGpartnumber
        HAVING COUNT(DISTINCT Trackingnumber) > 0
        ORDER BY workDate ASC;
        """)

    result = db.execute(query, {
        "lineId": data.lineId,
        "startDate": data.startDate,
        "endDate": data.endDate})

    rows = [dict(row._mapping) for row in result]
    return [{**row, }for row in rows]
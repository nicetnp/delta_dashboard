from sqlalchemy import text
from sqlalchemy.orm import Session

def fetch_failure_heatup(db: Session):
    query = text("""
        SELECT TesterID AS testerId,
            SUBSTRING(FailItem, CHARINDEX(')', FailItem) + 1, CHARINDEX('}', FailItem) - CHARINDEX(')', FailItem) - 1) AS failItem,
            CONVERT(VARCHAR, DateTime, 120) AS workDate
        FROM APBM_FailuresPareto
        WHERE LineID = 'BMA01'
            AND CAST(DATEADD(MINUTE, -460, DateTime) AS DATE) = CAST(GETDATE() AS DATE)
        GROUP BY TesterID, FailItem, DateTime
        HAVING COUNT(DISTINCT CASE WHEN Station LIKE '%HEATUP' THEN TrackingNumber END) > 0
        ORDER BY workDate ASC;

        """)

    result = db.execute(query)
    rows = [dict(row._mapping) for row in result]

    return [{**row, }for row in rows]
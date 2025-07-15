from sqlalchemy import text
from sqlalchemy.orm import Session
from utils.failure_helpers import calculate_total
from schemas.failure_schema import FailureSelectStation

def fetch_failures_today(data: FailureSelectStation, db: Session):
    query = text("""
        SELECT CAST(DATEADD(MINUTE, -460, DateTime) AS DATE)                             AS workDate,
               COUNT(DISTINCT CASE WHEN Station LIKE '%LASH' THEN TrackingNumber END)    AS vflash1,
               COUNT(DISTINCT CASE WHEN Station LIKE '%HIPOT_1' THEN TrackingNumber END) AS hipot1,
               COUNT(DISTINCT CASE WHEN Station LIKE '%TS1' THEN TrackingNumber END)     AS ats1,
               COUNT(DISTINCT CASE WHEN Station LIKE '%HEATUP' THEN TrackingNumber END)  AS heatup,
            COUNT(DISTINCT CASE WHEN Station LIKE '%BRATION' THEN TrackingNumber END)  AS vibration,
               COUNT(DISTINCT CASE WHEN Station LIKE '%BURN_IN' THEN TrackingNumber END) AS burnin,
               COUNT(DISTINCT CASE WHEN Station LIKE '%HIPOT_2' THEN TrackingNumber END) AS hipot2,
               COUNT(DISTINCT CASE WHEN Station LIKE '%TS2' THEN TrackingNumber END)     AS ats2,
               COUNT(DISTINCT CASE WHEN Station LIKE '%LASH2' THEN TrackingNumber END)   AS vflash2,
               COUNT(DISTINCT CASE WHEN Station LIKE '%TS3' THEN TrackingNumber END)     AS ats3
        FROM APBM_FailuresPareto
        WHERE LineID = :lineId
          AND CAST(DATEADD(MINUTE, -460, DateTime) AS DATE) = CAST(GETDATE() AS DATE)
        GROUP BY CAST(DATEADD(MINUTE, -460, DateTime) AS DATE)
        ORDER BY workDate ASC
    """)

    result = db.execute(query, {
        "lineId": data.lineId
    })

    rows = [dict(row._mapping) for row in result]
    return [
        {**row, "total": calculate_total(row)}
        for row in rows
    ]

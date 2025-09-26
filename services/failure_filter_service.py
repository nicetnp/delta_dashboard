from sqlalchemy import text
from sqlalchemy.orm import Session
from utils.failure_helpers import calculate_total
from schemas.failure_schema import FailureStationQuery


def fetch_failures_filter(data: FailureStationQuery, db: Session):
    query = text("""
            SELECT
                    CAST(DATEADD(MINUTE, -460, DateTime) AS DATE) AS workDate,
                    COUNT( CASE WHEN Station LIKE '%LASH' THEN TrackingNumber END)    AS vflash1,
                    COUNT( CASE WHEN Station LIKE '%IPOT_1' THEN TrackingNumber END) AS hipot1,
                    COUNT( CASE WHEN Station LIKE '%TS1' THEN TrackingNumber END)     AS ats1,
                    COUNT( CASE WHEN Station LIKE '%EATUP' THEN TrackingNumber END)  AS heatup,
                    COUNT( CASE WHEN Station LIKE '%RATION' THEN TrackingNumber END) AS vibration,
                    COUNT( CASE WHEN Station LIKE '%RN_IN' THEN TrackingNumber END)  AS burnin,
                    COUNT( CASE WHEN Station LIKE '%IPOT_2' THEN TrackingNumber END) AS hipot2,
                    COUNT( CASE WHEN Station LIKE '%TS2' THEN TrackingNumber END)     AS ats2,
                    COUNT( CASE WHEN Station LIKE '%LASH2' THEN TrackingNumber END)   AS vflash2,
                    COUNT( CASE WHEN Station LIKE '%TS3' THEN TrackingNumber END)     AS ats3
            FROM APBM_FailuresPareto
            WHERE LineID = :lineId AND CAST(DATEADD(MINUTE, -460, DateTime) AS DATE) BETWEEN :startDate AND :endDate
            GROUP BY CAST(DATEADD(MINUTE, -460, DateTime) AS DATE)
            ORDER BY workDate ASC;
    """)

    result = db.execute(query, {
        "lineId": data.lineId,
        "startDate": data.startDate,
        "endDate": data.endDate
    })

    rows = [dict(row._mapping) for row in result]
    return [
        {**row, "total": calculate_total(row)}
        for row in rows
    ]

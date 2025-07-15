# SELECT
#     Station,
#     SUM(CASE WHEN rn = 1 AND Result = 'PASS' THEN 1 ELSE 0 END) AS PassCount,
#     SUM(CASE WHEN Result = 'FAIL' THEN 1 ELSE 0 END) AS FailCount
# FROM (
#     SELECT
#         Station,
#         Result,
#         -- ใช้ ROW_NUMBER() เพื่อระบุ Record ที่เป็น MaxDateTime สำหรับแต่ละ TrackingNumber และ Station
#         ROW_NUMBER() OVER (PARTITION BY TrackingNumber, Station ORDER BY [DateTime] DESC) AS rn
#     FROM APBM
#     WHERE
#         LineID = 'BMA01'
#         AND [DateTime] >= CAST('2025-07-08 07:40:00' AS DATETIME)
#         AND [DateTime] <= CAST('2025-07-09 07:40:00' AS DATETIME) -- หรือใช้ BETWEEN '2025-07-08 07:40:00' AND '2025-07-09 07:40:00'
# ) AS SubQuery
# GROUP BY Station;
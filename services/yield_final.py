# SELECT
#     Station,
#     SUM(CASE WHEN Result = 'PASS' THEN 1 ELSE 0 END) AS PassCount,
#     COUNT(DISTINCT CASE WHEN Result = 'FAIL' THEN TrackingNumber END) AS FailCount
# FROM (
#     SELECT
#         Station,
#         Result,
#         TrackingNumber,
#         ROW_NUMBER() OVER (PARTITION BY TrackingNumber, Station ORDER BY [DateTime] DESC) AS rn
#     FROM APBM
#     WHERE
#         LineID = 'BMA01'
#         AND [DateTime] >= CAST('2025-07-01 07:40:00' AS DATETIME)
#         AND [DateTime] <= CAST('2025-07-02 07:40:00' AS DATETIME)
# ) AS LatestEntries
# WHERE rn = 1
#   AND Result IN ('PASS', 'FAIL')
# GROUP BY Station;
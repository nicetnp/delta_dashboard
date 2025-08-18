# Backend Python WebSocket Server
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from services.failure_tester_service import fetch_failure_tester
from schemas.failure_schema import FailureTester, FailureByTester
from fastapi.encoders import jsonable_encoder
from db.session import SessionLocal
from db.redis_client import r as redis_client
from utils.redis_helper import build_cache_key
import asyncio
import json
from datetime import datetime

router = APIRouter(prefix="/failures", tags=["Failures"])

UPDATE_INTERVAL_SEC = 30
CACHE_TTL_SEC = 60


@router.websocket("/ws/tester")
async def failure_tester_ws(websocket: WebSocket):
    await websocket.accept()
    print("✅ WebSocket connected")

    line_id = websocket.query_params.get("lineId", "BMA01")
    station_name = websocket.query_params.get("station")
    # ถ้า station มีค่า ให้เปลี่ยนเป็นตัวพิมพ์ใหญ่ แต่ถ้าไม่มี (None) ก็ใช้ None ต่อไป
    station_name = station_name.upper() if station_name else None
    start_date_str = websocket.query_params.get("startDate")
    end_date_str = websocket.query_params.get("endDate")

    # Parsing dates from query parameters
    try:
        start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date() if start_date_str else datetime.today().date()
        end_date = datetime.strptime(end_date_str, "%Y-%m-%d").date() if end_date_str else datetime.today().date()
    except (ValueError, TypeError) as e:
        print(f"❗ Error parsing dates: {e}. Using today's date.")
        await websocket.send_json({"error": "Invalid date format. Using today's date."})
        return

    print(f"ℹ️ lineId: {line_id}, station: {station_name}, startDate: {start_date}, endDate: {end_date}")

    failure_query_data = FailureTester(
        lineId=line_id,
        station=station_name,
        startDate=start_date,
        endDate=end_date
    )

    try:
        while True:
            # CORRECTED: Include dates in the cache key to ensure data freshness for each date range
            cache_key = build_cache_key(
                namespace="failures tester",
                scope="select_date",
                line_id=line_id,
                station=station_name.lower() if station_name else "all",
                start_date = start_date.isoformat(),
                end_date = end_date.isoformat()
            )

            cached_data = redis_client.get(cache_key)

            if cached_data:
                print(f"📦 ใช้ cache: {cache_key}")
                serialized_data = json.loads(cached_data)
            else:
                print(f"🗃️ ดึงจาก DB lineId={line_id} for date range {start_date} to {end_date}")
                with SessionLocal() as db:
                    raw_data = fetch_failure_tester(failure_query_data, db)
                    serialized_data = [
                        FailureByTester.model_validate(row).model_dump()
                        for row in raw_data
                    ]

                redis_safe_data = jsonable_encoder(serialized_data)
                redis_client.setex(
                    cache_key,
                    CACHE_TTL_SEC,
                    json.dumps(redis_safe_data)
                )
                print(f"✅ cache ใหม่: {cache_key}")

            await websocket.send_json(jsonable_encoder(serialized_data))
            await asyncio.sleep(UPDATE_INTERVAL_SEC)

    except WebSocketDisconnect:
        print("❌ Client disconnected")

    except Exception as e:
        print(f"❗ Unexpected error: {e}")

    finally:
        print("🔒 Connection closed")
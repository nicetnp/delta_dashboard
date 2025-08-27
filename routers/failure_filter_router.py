from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from services.failure_filter_service import fetch_failures_filter
from schemas.failure_schema import FailureByDay, FailureStationQuery
from fastapi.encoders import jsonable_encoder
from db.session import SessionLocal
from db.redis_client import r as redis_client
from utils.redis_helper import build_cache_key
import asyncio
import json
from datetime import datetime

router = APIRouter(prefix="/failures", tags=["Failures"])

UPDATE_INTERVAL_SEC = 15
CACHE_TTL_SEC = 45


@router.websocket("/ws/filter")
async def failure_filter_ws(websocket: WebSocket):
    await websocket.accept()
    print("✅ WebSocket connected")

    line_id = websocket.query_params.get("lineId", "BMA01")
    start_date_str = websocket.query_params.get("startDate")
    end_date_str = websocket.query_params.get("endDate")

    start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date() if start_date_str else datetime.today().date()
    end_date = datetime.strptime(end_date_str, "%Y-%m-%d").date() if end_date_str else datetime.today().date()
    print(f"ℹ️ lineId: {line_id}, startDate: {start_date}, endDate: {end_date}")

    failure_query_data = FailureStationQuery(
        lineId=line_id,
        startDate=start_date,
        endDate=end_date
    )

    try:
            while True:
                cache_key = build_cache_key(
                    namespace="failures",
                    scope=f"{start_date}_{end_date}",
                    line_id=line_id,
                    datatype="summary"
                )

                cached_data = redis_client.get(cache_key)

                if cached_data:
                    print(f"📦 ใช้ cache: {cache_key}")
                    serialized_data = json.loads(cached_data)
                else:
                    print(f"🗃️ ดึงจาก DB lineId={line_id}")
                    with SessionLocal() as db:
                        raw_data = fetch_failures_filter(failure_query_data, db)
                        serialized_data = [
                            FailureByDay.model_validate(row).model_dump()
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

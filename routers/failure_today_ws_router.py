from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from services.failure_today_service import fetch_failures_today
from schemas.failure_schema import FailureSelectStation, FailureByDay
from fastapi.encoders import jsonable_encoder
from db.session import SessionLocal
from db.redis_client import r as redis_client
from utils.redis_helper import build_cache_key
import asyncio
import json

router = APIRouter(prefix="/failures", tags=["Failures"])

UPDATE_INTERVAL_SEC = 5
CACHE_TTL_SEC = 45


@router.websocket("/ws/today")
async def failure_today_ws(websocket: WebSocket):
    await websocket.accept()
    print("✅ WebSocket connected")

    line_id = websocket.query_params.get("lineId", "B3")
    print(f"ℹ️ lineId: {line_id}")

    failure_query_data = FailureSelectStation(lineId=line_id)

    try:
            while True:
                cache_key = build_cache_key(
                    namespace="failures",
                    scope="today",
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
                        raw_data = fetch_failures_today(failure_query_data, db)
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

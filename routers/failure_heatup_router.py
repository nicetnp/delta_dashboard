from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from services.failure_heatup_service import fetch_failure_heatup
from schemas.failure_schema import FailureSelectStation, FailureByStation
from fastapi.encoders import jsonable_encoder
from db.session import SessionLocal
from db.redis_client import r as redis_client
from utils.redis_helper import build_cache_key
import asyncio
import json

router = APIRouter(prefix="/failures", tags=["Failures"])


@router.websocket("/ws/heatup")
async def failure_heatup_ws(websocket: WebSocket):
    await websocket.accept()
    print("✅ WebSocket connected")

    line_id = websocket.query_params.get("lineId", "B3")
    print(f"ℹ️ lineId: {line_id}")

    # 👇 เตรียม query data object
    failure_query_data = FailureSelectStation(lineId=line_id)

    db = SessionLocal()
    try:
        while True:
            cache_key = build_cache_key(
                namespace="failures",
                scope="today",
                line_id=line_id,
                datatype="heatup"
            )
            cached_data = redis_client.get(cache_key)

            if cached_data:
                print(f"📦 ใช้ cache: {cache_key}")
                serialized_data = json.loads(cached_data)
            else:
                print(f"🗃️ ดึงจาก DB lineId={line_id} (Heatup)")
                # ดึงข้อมูลจาก DB
                raw_data = fetch_failure_heatup(failure_query_data, db)

                # validate/dump
                serialized_data = [
                    FailureByStation.model_validate(row).model_dump()
                    for row in raw_data
                ]
                redis_safe_data = jsonable_encoder(serialized_data)
                redis_client.setex(cache_key, 15, json.dumps(redis_safe_data))
                print(f"✅ cache ใหม่: {cache_key}")

            # ส่งข้อมูลไปยัง client
            await websocket.send_json(jsonable_encoder(serialized_data))
            await asyncio.sleep(5)

    except WebSocketDisconnect:
        print("❌ WebSocket client disconnected")

    except Exception as e:
        print(f"❗ Unexpected error: {e}")

    finally:
        db.close()
        print("🔒 Database session closed")

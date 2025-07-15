from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from services.failure_atsone_service import fetch_failure_atsone
from schemas.failure_schema import FailureSelectStation, FailureByStation
from fastapi.encoders import jsonable_encoder
from db.session import SessionLocal
from db.redis_client import r as redis_client
import asyncio
import json

router = APIRouter(prefix="/failures", tags=["Failures"])


@router.websocket("/ws/atsone")
async def failure_today_ws(websocket: WebSocket):
    await websocket.accept()
    print("✅ WebSocket connected")

    line_id = websocket.query_params.get("lineId", "B3")
    print(f"ℹ️ lineId: {line_id}")

    # 👇 ตรงนี้ยังถูกต้อง เพราะใช้ส่ง lineId ไปให้ service
    failure_query_data = FailureSelectStation(lineId=line_id)

    db = SessionLocal()
    try:
        while True:
            cache_key = f"failures_today_{line_id}"
            cached_data = redis_client.get(cache_key)

            if cached_data:
                print(f"📦 ใช้ cache: {cache_key}")
                serialized_data = json.loads(cached_data)
            else:
                print(f"🗃️ ดึงจาก DB lineId={line_id}")
                # ส่ง failure_query_data ที่มี lineId ไปให้ service
                raw_data = fetch_failure_atsone(failure_query_data, db)

                # validate/dump
                serialized_data = [
                    FailureByStation.model_validate(row).model_dump()
                    for row in raw_data
                ]
                redis_safe_data = jsonable_encoder(serialized_data)
                redis_client.setex(cache_key, 15, json.dumps(redis_safe_data))
                print(f"✅ cache ใหม่: {cache_key}")

            await websocket.send_json(jsonable_encoder(serialized_data))
            await asyncio.sleep(5)

    except WebSocketDisconnect:
        print("❌ WebSocket client disconnected")

    except Exception as e:
        print(f"❗ Unexpected error: {e}")

    finally:
        db.close()
        print("🔒 Database session closed")
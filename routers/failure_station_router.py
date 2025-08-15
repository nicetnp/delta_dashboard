from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from services.failure_station_service import fetch_failure_station
from schemas.failure_schema import FailureStation, FailureByStation
from fastapi.encoders import jsonable_encoder
from db.session import SessionLocal
from db.redis_client import r as redis_client
from utils.redis_helper import build_cache_key
import asyncio
import json

router = APIRouter(prefix="/failures", tags=["Failures"])

UPDATE_INTERVAL_SEC = 30
CACHE_TTL_SEC = 60


@router.websocket("/ws/station")
async def failure_station_ws(websocket: WebSocket):
    await websocket.accept()
    print("✅ WebSocket connected")

    line_id = websocket.query_params.get("lineId", "BMA01")
    station_name = websocket.query_params.get("station", "HEATUP").upper()
    work_date = websocket.query_params.get("workDate")

    print(f"ℹ️ lineId: {line_id}, station: {station_name}, workDate: {work_date}")

    failure_query_data = FailureStation(lineId=line_id,station=station_name,workDate=work_date)

    try:
        while True:
            cache_key = build_cache_key(
                namespace="failures",
                scope="select_date",
                line_id=line_id,
                datatype=station_name.lower()
            )

            cached_data = redis_client.get(cache_key)

            if cached_data:
                print(f"📦 ใช้ cache: {cache_key}")
                serialized_data = json.loads(cached_data)
            else:
                print(f"🗃️ ดึงจาก DB lineId={line_id}")
                with SessionLocal() as db:
                    raw_data = fetch_failure_station(failure_query_data, db)
                    serialized_data = [
                        FailureByStation.model_validate(row).model_dump()
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

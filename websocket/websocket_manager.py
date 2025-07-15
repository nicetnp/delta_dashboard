import json
import asyncio
import aioredis
from fastapi import WebSocket
from fastapi.encoders import jsonable_encoder

from schemas.failure_schema import FailureByDay
from services.failure_today_service import fetch_failures_today
from db.session import SessionLocal


class WebSocketFailureManager:
    def __init__(self, redis_channel: str):
        self.active_connections: list[WebSocket] = []
        self.redis_channel = redis_channel
        self._stop_event = asyncio.Event()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"✅ New client connected. Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            print(f"❌ Client disconnected. Remaining: {len(self.active_connections)}")

    async def broadcast_failures(self):
        db = SessionLocal()
        try:
            raw_data = fetch_failures_today(db)
            validated = [
                FailureByDay.model_validate(row).model_dump()
                for row in raw_data
            ]
            payload = jsonable_encoder(validated)
            if self.active_connections:
                await asyncio.gather(
                    *[conn.send_json(payload) for conn in self.active_connections]
                )
        except Exception as e:
            print("❗ Broadcast error:", e)
        finally:
            db.close()

    async def listen_redis(self):
        redis = await aioredis.from_url("redis://localhost", decode_responses=True)
        pubsub = redis.pubsub()
        await pubsub.subscribe(self.redis_channel)

        print(f"📡 Listening to Redis channel: {self.redis_channel}")
        try:
            async for msg in pubsub.listen():
                if msg["type"] == "message":
                    print(f"📣 New event on {self.redis_channel}")
                    await self.broadcast_failures()

                if self._stop_event.is_set():
                    break
        finally:
            await pubsub.unsubscribe(self.redis_channel)
            await pubsub.close()
            await redis.close()
            print("🔌 Redis connection closed")

    def stop(self):
        self._stop_event.set()

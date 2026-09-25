from __future__ import annotations
import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.api.twin import twin
from app.database.schemas import state_to_dict
from app.websocket.manager import ConnectionManager

router = APIRouter(tags=["Live Telemetry"])
manager = ConnectionManager()

@router.websocket("/ws/live")
async def live_telemetry(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Push authoritative Twin state periodically, while still accepting
            # client heartbeats/commands without requiring a response to each ping.
            try:
                message = await asyncio.wait_for(websocket.receive_text(), timeout=5.0)
                if message.lower() in {"ping", "refresh", "state"}:
                    await websocket.send_json(state_to_dict(twin.state))
            except asyncio.TimeoutError:
                await websocket.send_json(state_to_dict(twin.state))
    except (WebSocketDisconnect, RuntimeError):
        manager.disconnect(websocket)
    finally:
        manager.disconnect(websocket)

"""
WebSocket Tutorial Server (Python websockets + asyncio)
대체 서버 구현: Python으로 구현된 WebSocket 서버 예제
"""

import asyncio
import json
import websockets
from datetime import datetime

PORT = 8080
connected_clients = set()
client_id_counter = 1

async def broadcast(message_dict, sender_websocket=None):
    """모든 연결된 클라이언트에게 브로드캐스트 전송"""
    message_str = json.dumps(message_dict, ensure_ascii=False)
    if connected_clients:
        tasks = [
            asyncio.create_task(client.send(message_str))
            for client in connected_clients
            if client != sender_websocket and client.open
        ]
        if tasks:
            await asyncio.wait(tasks)

async def handler(websocket):
    global client_id_counter
    client_id = f"PythonUser-{client_id_counter}"
    client_id_counter += 1

    connected_clients.add(websocket)
    print(f"[연결됨] 새 클라이언트 접속: {client_id} | 총 접속자: {len(connected_clients)}명")

    try:
        # 1. 환영 메시지
        await websocket.send(json.dumps({
            "type": "welcome",
            "clientId": client_id,
            "message": f"Python WebSocket 서버에 오신 것을 환영합니다! ID: [{client_id}]",
            "onlineCount": len(connected_clients),
            "timestamp": datetime.now().strftime("%p %I:%M:%S")
        }, ensure_ascii=False))

        # 2. 입장 브로드캐스트
        await broadcast({
            "type": "system",
            "message": f"📢 [{client_id}] 님이 접속하셨습니다.",
            "onlineCount": len(connected_clients),
            "timestamp": datetime.now().strftime("%p %I:%M:%S")
        }, sender_websocket=websocket)

        # 3. 메시지 수신 루프
        async for message in websocket:
            try:
                data = json.loads(message)
                msg_type = data.get("type")

                if msg_type == "chat":
                    payload = {
                        "type": "chat",
                        "sender": data.get("sender", client_id),
                        "text": data.get("text", ""),
                        "timestamp": datetime.now().strftime("%p %I:%M:%S")
                    }
                    await broadcast(payload)
                    await websocket.send(json.dumps(payload, ensure_ascii=False))

                elif msg_type == "ping":
                    await websocket.send(json.dumps({
                        "type": "pong",
                        "clientTimestamp": data.get("clientTimestamp"),
                        "serverTimestamp": int(datetime.now().timestamp() * 1000)
                    }))

                elif msg_type == "set-nickname":
                    old_name = client_id
                    client_id = data.get("nickname", client_id)
                    await broadcast({
                        "type": "system",
                        "message": f"🔄 [{old_name}] 님이 닉네임을 [{client_id}] (으)로 변경하셨습니다.",
                        "onlineCount": len(connected_clients),
                        "timestamp": datetime.now().strftime("%p %I:%M:%S")
                    })

                else:
                    await websocket.send(json.dumps({"type": "echo", "data": data}, ensure_ascii=False))

            except json.JSONDecodeError:
                await websocket.send(json.dumps({"type": "echo", "text": str(message)}, ensure_ascii=False))

    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        connected_clients.remove(websocket)
        print(f"[연결 해제] {client_id} 퇴장 | 남은 접속자: {len(connected_clients)}명")
        await broadcast({
            "type": "system",
            "message": f"💨 [{client_id}] 님이 퇴장하셨습니다.",
            "onlineCount": len(connected_clients),
            "timestamp": datetime.now().strftime("%p %I:%M:%S")
        })

async def main():
    print(f"===================================================")
    print(f"🚀 Python WebSocket 서버 시작: ws://localhost:{PORT}")
    print(f"===================================================")
    async with websockets.serve(handler, "localhost", PORT):
        await asyncio.Future()  # run forever

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n서버가 종료되었습니다.")

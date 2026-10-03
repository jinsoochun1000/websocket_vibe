# WebSocket 튜토리얼 (Node.js + 브라우저)

WebSocket으로 구현한 간단한 **실시간 채팅** 예제입니다.
여러 브라우저 탭에서 접속하면 메시지가 모든 접속자에게 즉시 전달됩니다.

## 구성

| 파일 | 설명 |
|------|------|
| `server.js` | Node.js 서버. HTTP로 `index.html`을 제공하고, 같은 포트에서 WebSocket 연결을 처리 |
| `index.html` | 브라우저 클라이언트. 브라우저 내장 `WebSocket` API 사용 (라이브러리 없음) |
| `package.json` | 의존성: [`ws`](https://github.com/websockets/ws) |

## 실행 방법

요구사항: Node.js 18 이상

```bash
npm install
npm start
```

브라우저에서 http://localhost:8080 을 엽니다. 탭을 2개 이상 열어 서로 메시지를 보내 보세요.

포트 변경: `PORT=3000 npm start` (PowerShell: `$env:PORT=3000; npm start`)

## 동작 원리

### 1. 연결 (Handshake)
클라이언트가 `new WebSocket('ws://localhost:8080')`을 호출하면 HTTP `Upgrade: websocket` 요청이 서버로 갑니다.
서버(`ws` 라이브러리)가 이를 수락하면 HTTP 연결이 **양방향 WebSocket 연결**로 전환됩니다.
이후에는 요청/응답 없이 양쪽 어디서든 언제든 메시지를 보낼 수 있습니다.

```
Browser                         Server
   | --- HTTP GET (Upgrade) --->  |
   | <-- 101 Switching Protocols  |
   | <======= WebSocket =======>  |   양방향 메시지
```

### 2. 서버 (`server.js`)
- `http.createServer` – `/` 요청에 `index.html` 응답
- `new WebSocketServer({ server })` – 같은 HTTP 서버에 WebSocket을 붙임
- `wss.on('connection')` – 클라이언트 접속 시 ID 부여, 환영/입장 메시지 전송
- `ws.on('message')` – 수신한 채팅을 `broadcast()`로 전체 클라이언트에 전송
- `ws.on('close')` – 퇴장 알림 전송

### 3. 클라이언트 (`index.html`)
WebSocket의 4가지 이벤트를 처리합니다.

| 이벤트 | 역할 |
|--------|------|
| `onopen` | 연결 성공 → 입력창 활성화 |
| `onmessage` | 서버 메시지 수신 → `type`에 따라 화면에 표시 |
| `onclose` | 연결 종료 → UI 비활성화 |
| `onerror` | 오류 표시 |

메시지 전송: `ws.send(JSON.stringify({ type: 'chat', text }))`

### 4. 메시지 프로토콜 (JSON)

**클라이언트 → 서버**
```json
{ "type": "chat", "text": "안녕하세요" }
```

**서버 → 클라이언트**
| type | 예시 | 설명 |
|------|------|------|
| `welcome` | `{ "type": "welcome", "id": 3 }` | 접속한 본인에게 ID 알림 |
| `system` | `{ "type": "system", "text": "client #3 님이 입장했습니다", "count": 2 }` | 입장/퇴장 알림 + 현재 접속자 수 |
| `chat` | `{ "type": "chat", "from": 3, "text": "안녕", "time": "2026-10-03T13:00:00.000Z" }` | 채팅 메시지 (전체 브로드캐스트) |
| `error` | `{ "type": "error", "text": "JSON 형식이 아닙니다" }` | 잘못된 메시지 형식 |

## 테스트

1. `npm start`로 서버 실행
2. 브라우저 탭 2개에서 http://localhost:8080 접속
3. 한쪽에서 메시지 전송 → 양쪽 모두에 표시되는지 확인
4. "연결 끊기" 클릭 → 다른 탭에 퇴장 메시지가 표시되는지 확인
5. 서버 콘솔에 연결/수신/종료 로그가 출력되는지 확인

## 확장 아이디어
- 닉네임 설정, 채팅방(room) 분리
- 자동 재연결 (`onclose`에서 `setTimeout(connect, 3000)`)
- Ping/Pong 하트비트로 끊긴 연결 감지
- 배포 시 HTTPS 환경에서는 `wss://` 사용

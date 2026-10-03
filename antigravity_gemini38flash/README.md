# 🚀 WebSocket 실시간 양방향 통신 완벽 튜토리얼 (Tutorial)

본 저장소는 **웹소켓(WebSocket)**의 핵심 개념과 동작 원리를 직접 실행하며 배울 수 있는 실시간 인터랙티브 예제 프로젝트입니다.

---

## 📌 1. WebSocket이란 무엇인가요?

### 🔄 HTTP vs WebSocket 비교
| 구분 | 전통적인 HTTP 통신 | WebSocket 통신 |
| :--- | :--- | :--- |
| **통신 방식** | 클라이언트 요청(Request) 시에만 서버가 응답(Response) | 한 번 연결되면 양방향(Full-Duplex) 실시간 통신 |
| **연결 유지** | 비연결성 (요청-응답 후 원칙적으로 종료) | TCP 연결 유지 (지속적 세션) |
| **헤더 오버헤드** | 매 요청마다 대량의 HTTP 헤더 전송 | 초기 핸드셰이크 후 경량 프레임(2~14 Byte)만 전송 |
| **적합한 분야** | 정적 웹페이지, REST API, 블로그 | 실시간 채팅, 주식/코인 시세, 멀티플레이어 게임, 협업 툴 |

### 🤝 핸드셰이크(Handshake) 동작 원리
1. **HTTP Upgrade 요청**: 클라이언트 브라우저가 서버에 `Upgrade: websocket`, `Connection: Upgrade` 헤더를 담아 HTTP GET 요청을 전송합니다.
2. **101 Switching Protocols**: 서버가 웹소켓을 지원하면 `HTTP/1.1 101 Switching Protocols` 상태 코드로 응답합니다.
3. **양방향 통신 개시**: HTTP 연결이 그대로 WebSocket TCP 연결로 전환되며, 실시간 데이터 송수신이 가능해집니다.

---

## 📁 2. 프로젝트 구성

```text
├── index.html         # 클라이언트 (모던 다크 테마 UI + 실시간 채팅 + 이벤트 인스펙터)
├── server.js          # Node.js WebSocket + 정적 파일 서빙 서버 (기본 포트 8080)
├── server_python.py   # [대안 스킬] Python websockets 기반 서버
├── package.json       # 프로젝트 설정 및 ws 의존성
└── README.md          # 튜토리얼 설명 문서
```

---

## 💻 3. 클라이언트(Client) 핵심 코드 분석 (`index.html`)

브라우저 내장 `WebSocket` API는 별도의 외부 라이브러리 없이 순수 자바스크립트로 동작합니다.

### 4대 필수 이벤트 & 메서드

```javascript
// 1. 소켓 객체 생성 및 서버 접속 시도 (HTTP Upgrade 핸드셰이크)
const socket = new WebSocket('ws://localhost:8080');

// (1) 연결 성공 시 (Handshake 완료)
socket.onopen = (event) => {
  console.log('서버와 웹소켓 연결이 완료되었습니다.');
};

// (2) 서버로부터 메시지 수신 시
socket.onmessage = (event) => {
  console.log('수신 데이터:', event.data);
  const parsed = JSON.parse(event.data);
  // UI 업데이트 로직 수행
};

// (3) 에러 발생 시
socket.onerror = (error) => {
  console.error('웹소켓 통신 에러:', error);
};

// (4) 연결 종료 시 (서버 측 또는 클라이언트 종료)
socket.onclose = (event) => {
  console.log(`연결이 종료되었습니다. (코드: ${event.code}, 사유: ${event.reason})`);
};

// (5) 서버로 데이터 전송 (텍스트 또는 JSON)
function sendMessage() {
  const payload = JSON.stringify({ type: 'chat', text: '안녕하세요!' });
  socket.send(payload); // 서버로 전송
}

// (6) 소켓 연결 종료
function disconnect() {
  socket.close(1000, '정상 종료');
}
```

---

## 🖥️ 4. 서버(Server) 핵심 코드 분석 (`server.js`)

Node.js 환경에서는 대표적인 경량 고성능 라이브러리인 [`ws`](https://github.com/websockets/ws)를 사용합니다.

```javascript
const http = require('http');
const { WebSocketServer, WebSocket } = require('ws');

// 1. HTTP 서버와 WebSocket 서버 통합
const server = http.createServer((req, res) => {
  // index.html 정적 파일 서빙
});
const wss = new WebSocketServer({ server });

// 2. 브로드캐스트(Broadcast) 패턴: 모든 접속자에게 전송
function broadcast(payload) {
  const data = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

// 3. 클라이언트 접속 이벤트 수신
wss.on('connection', (ws, req) => {
  console.log('클라이언트 접속 성공');

  // 메시지 수신
  ws.on('message', (data) => {
    const message = JSON.parse(data);
    if (message.type === 'chat') {
      broadcast(message); // 모든 참가자에게 재전송
    }
  });

  // 접속 종료
  ws.on('close', () => {
    console.log('클라이언트 퇴장');
  });
});

server.listen(8080);
```

---

## 🏃 5. 실행 및 테스트 방법

### 옵션 A: Node.js 서버 실행 (기본 권장)
```bash
# 서버 시작 (HTTP 웹페이지 + WebSocket 포트 8080)
npm start
# 또는
node server.js
```

### 옵션 B: Python 서버 실행 (대안 스킬)
```bash
python server_python.py
```
*(Python 서버 실행 시 브라우저에서 `index.html` 파일을 직접 더블 클릭하여 열어도 됩니다.)*

---

## 🧪 6. 브라우저 실시간 테스트 가이드

1. 웹 브라우저를 열고 `http://localhost:8080` 에 접속합니다.
2. **브라우저 창을 2개 이상(또는 시크릿 탭)** 나란히 띄웁니다.
3. 상단의 **[⚡ 연결]** 버튼을 클릭합니다.
4. 한쪽 창에서 메시지를 입력하거나 **[빠른 테스트]** 버튼을 누르면, 다른 창에 **지연 없이 실시간으로 동기화**되는 것을 확인할 수 있습니다.
5. 우측 **[WebSocket 이벤트 인스펙터]**에서 `OPEN`, `MESSAGE`, `SEND`, `CLOSE` 등 실제 소켓 패킷 프레임이 실시간으로 로깅되는 것을 확인할 수 있습니다.
6. **[🏓 Ping 테스트]** 버튼을 누르면 서버와의 왕복 지연시간(RTT Latency)을 밀리초(ms) 단위로 측정할 수 있습니다.

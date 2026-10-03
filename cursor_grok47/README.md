# WebSocket 에코 튜토리얼

브라우저가 보낸 텍스트를 서버가 같은 연결로 그대로 돌려주는 최소 WebSocket 예제입니다.

## 구조

```
cursor_grok47/
├── package.json   # 의존성 ws, 실행 스크립트
├── server.js      # HTTP + WebSocket 서버
└── index.html     # 브라우저 클라이언트
```

| 파일 | 역할 |
| --- | --- |
| `package.json` | `ws`만 의존성으로 두고, `npm start`로 `node server.js`를 실행합니다. |
| `server.js` | 포트 3000에서 `index.html`을 제공하고, 같은 HTTP 서버에 WebSocket을 붙입니다. |
| `index.html` | 브라우저 기본 `WebSocket` API로 연결하고, 보낸 메시지와 에코를 화면에 쌓습니다. |

외부 프론트 라이브러리는 없습니다. 서버 쪽 WebSocket 구현만 `ws` 패키지를 사용합니다.

## 동작

한 포트에서 페이지와 소켓을 함께 엽니다.

```
브라우저                    server.js :3000
   |  GET /                      |
   | --------------------------> |  index.html 응답
   |  WebSocket upgrade          |
   | --------------------------> |  connection
   |  send("hello")              |
   | --------------------------> |  같은 소켓으로 send("hello")
   |  onmessage                  |
   | <-------------------------- |
```

### 서버 (`server.js`)

- Node 내장 `http`로 모든 요청에 `index.html`을 반환합니다.
- `WebSocketServer`를 그 HTTP 서버에 붙여, 업그레이드 요청을 같은 포트에서 받습니다.
- `connection`이면 콘솔에 `client connected`를 남깁니다.
- `message`면 텍스트로 바꾼 뒤, 빈 문자열은 무시하고 그 소켓에만 `ws.send`로 돌려줍니다. 다른 클라이언트로는 전달하지 않습니다.
- `close`이면 콘솔에 `client disconnected`를 남깁니다.

### 클라이언트 (`index.html`)

페이지를 연 주소와 같은 호스트로 연결합니다.

```js
const ws = new WebSocket(`ws://${location.host}`);
```

- 처음 상태는 **연결 중**이고, 입력과 보내기 버튼은 비활성입니다.
- `onopen`이면 **연결됨**으로 바꾸고 입력을 켭니다.
- `onclose` 또는 `onerror`이면 **끊김**으로 바꾸고 입력을 막습니다.
- 폼 제출(보내기 버튼 또는 Enter) 때 앞뒤 공백을 제거한 텍스트를 `ws.send`하고, 로그에 `보냄:`으로 표시합니다.
- `onmessage`로 돌아온 값은 로그에 `에코:`로 표시합니다.

## 실행

```bash
npm install
npm start
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 엽니다. 상태가 **연결됨**이면 메시지를 입력하고 보내기를 누릅니다. 같은 내용이 `보냄`과 `에코`로 각각 나타납니다.

# WebSocket Tutorial

브라우저의 `index.html`과 JavaScript(Node.js) 서버로 WebSocket의 연결, 양방향 메시지 전송, 연결 종료를 실습하는 예제입니다. 클라이언트는 브라우저 내장 `WebSocket` API, 서버는 `ws` 라이브러리를 사용합니다.

## 1. 준비 및 실행

- Node.js 22 이상과 npm
- 최신 웹 브라우저

프로젝트 폴더에서 실행합니다.

```powershell
npm install
npm start
```

브라우저에서 **http://127.0.0.1:3000** 을 엽니다. 서버 종료는 터미널에서 `Ctrl+C`를 누릅니다. `index.html`을 직접 여는 것보다 서버 주소로 접속하는 방식을 권장합니다.

개발 중 서버 코드 변경 시 자동으로 재시작하려면:

```powershell
npm run dev
```

서버 재시작 후 브라우저에서 다시 연결해야 합니다. 다른 포트로 실행하려면 PowerShell에서:

```powershell
$env:PORT = '8080'
npm start
# 종료 후 설정 초기화
Remove-Item Env:PORT
```

이 경우 http://127.0.0.1:8080 으로 접속합니다. 기본 바인딩은 로컬 컴퓨터에서만 접근하는 `127.0.0.1`이며 `HOST` 환경 변수로 변경할 수 있습니다.

## 2. 실습 순서

1. 페이지의 **연결** 버튼을 누릅니다. 상태가 `연결됨`으로 바뀌며 내 ID와 접속자 수가 표시됩니다.
2. **에코** 방식으로 메시지를 보냅니다. 송신 로그 다음에 같은 내용의 수신 로그가 나타납니다.
3. 같은 주소를 새 탭에서 열고 연결합니다. 두 탭의 접속자 수가 `2`가 됩니다.
4. 첫 번째 탭에서 **채팅**을 선택하고 메시지를 보냅니다. 두 탭 모두 메시지를 수신합니다.
5. 두 번째 탭에서 에코를 보내면 해당 탭만 응답을 수신합니다.
6. **연결 해제**를 누르면 종료 코드 `1000`이 표시됩니다. 나머지 탭의 접속자 수도 갱신됩니다.
7. 다시 **연결**을 누르면 새 ID로 연결됩니다.

서버를 종료하면 브라우저에 종료 이벤트가 기록되며 전송 버튼이 비활성화됩니다. 자동 재접속은 구현하지 않았으므로 서버 실행 후 연결 버튼을 다시 누릅니다.

## 3. 파일 구성 및 개발 내용

| 파일 | 역할 |
| --- | --- |
| `index.html` | HTML/CSS/JavaScript로 만든 클라이언트. 연결 상태, 에코·채팅 선택, 송수신 로그 제공 |
| `server.js` | HTTP 페이지 제공, WebSocket 연결 및 메시지 처리, 접속자 알림 |
| `package.json` | 의존성 및 실행·개발·테스트 명령 |
| `package-lock.json` | 설치 버전을 기록하여 동일한 의존성 설치 지원 |
| `test/server.test.js` | 실제 임시 서버와 두 클라이언트를 이용하는 통합 테스트 |
| `.gitignore` | 의존성 폴더와 로그 등 제외 |

별도의 프런트엔드 빌드나 데이터베이스가 필요하지 않습니다. 메시지는 메모리에서 즉시 전달하며 저장하지 않습니다. 화면 로그는 최근 200개 항목만 유지합니다.

## 4. 동작 원리

```text
브라우저                           Node.js 서버 (기본 3000 포트)
   | --- HTTP GET / ------------> | index.html 반환
   | --- WebSocket /ws 연결 ----> | HTTP Upgrade 처리
   | <--- welcome, presence ----- | ID와 접속자 수 전달
   | --- {type: echo, text} -----> | 보낸 클라이언트에만 응답
   | <--- {type: echo, ...} ------ |
   | --- {type: chat, text} -----> | 연결된 모든 클라이언트에 전달
   | <--- {type: chat, ...} ------ |
   | --- close(1000) -----------> | 종료 및 접속자 수 갱신
```

HTTP 요청으로 페이지를 받은 뒤, `/ws`에 지속적인 WebSocket 연결을 별도로 엽니다. 이후 연결을 유지한 상태에서 양쪽이 메시지를 보낼 수 있습니다. HTTP 페이지와 WebSocket은 같은 서버와 포트를 공유합니다.

### 클라이언트 핵심 API

```javascript
const socket = new WebSocket('ws://127.0.0.1:3000/ws');
socket.addEventListener('open', () => {
  socket.send(JSON.stringify({ type: 'echo', text: '안녕하세요!' }));
});
socket.addEventListener('message', event => console.log(event.data));
socket.addEventListener('error', () => console.log('통신 오류'));
socket.addEventListener('close', event => console.log(event.code));
// 실습을 마치고 연결을 종료할 때 실행: socket.close(1000, 'Finished');
```

`new WebSocket()`은 비동기로 연결을 시작합니다. 생성 직후 전송하지 말고 `open` 이벤트 또는 `readyState === WebSocket.OPEN`을 확인합니다. `message`의 `event.data`는 이 예제에서 JSON 문자열이므로 `JSON.parse()`로 객체로 변환합니다. 화면은 `textContent`로 메시지를 출력하여 HTML로 해석하지 않습니다.

### 서버 핵심 처리

`createTutorialServer()`는 HTTP 서버와 `WebSocketServer`를 생성합니다. `connection`마다 개별 소켓에 `message`, `close`, `error` 이벤트를 등록합니다. `send()`는 연결 상태를 확인하고 JSON 직렬화와 서버 시각 추가를 담당합니다. `broadcast()`는 `wss.clients`를 순회하여 모든 열린 연결에 전송합니다.

## 5. 메시지 규약

클라이언트 → 서버:

```json
{ "type": "echo", "text": "안녕하세요!" }
```

`type`은 `echo` 또는 `chat`입니다. `text`는 공백만으로 구성되지 않은 문자열이어야 하며 길이는 최대 1000입니다(JavaScript의 문자열 length 기준). 서버는 검증 후 앞뒤 공백을 제거합니다.

서버 → 클라이언트 예시:

```json
{
  "type": "chat",
  "clientId": "a1b2c3d4",
  "text": "안녕하세요!",
  "time": "2026-10-03T00:00:00.000Z"
}
```

| type | 추가 필드 | 의미 |
| --- | --- | --- |
| `welcome` | `clientId`, `text` | 연결한 클라이언트에 ID 전달 |
| `presence` | `count` | 현재 열린 연결 수; 탭마다 별도 접속자로 계산 |
| `echo` | `clientId`, `text` | 요청자에게만 응답 |
| `chat` | `clientId`, `text` | 발신자를 포함한 전체에 전송 |
| `error` | `text` | 잘못된 JSON, 메시지 형식 또는 바이너리 입력 알림 |

모든 서버 메시지에는 ISO 형식의 UTC 시각 `time`이 포함됩니다. 화면 로그 앞의 시각은 브라우저의 현지 수신·송신 시각입니다. 프레임을 포함한 수신 메시지의 페이로드 한도는 16 KiB이며, 초과 시 `ws`가 연결을 종료합니다.

## 6. 검증

```powershell
npm test
```

테스트는 사용 가능한 임시 포트에서 서버를 실행한 뒤 종료합니다. HTML 응답, 소스 파일 접근 차단, 연결 ID, 접속자 수, 에코 수신 범위, 두 클라이언트의 채팅 수신, 잘못된 JSON·타입·공백·길이·바이너리 검증, 오류 이후 정상 송수신, 정상 종료를 확인합니다. 화면 버튼과 로그 표시는 위 실습 순서로 확인할 수 있습니다.

## 7. 문제 해결 및 확장

- `EADDRINUSE`: 이미 사용 중인 포트입니다. 기존 서버를 종료하거나 `PORT`를 바꿉니다.
- 연결 실패: 서버 실행 여부, 포트와 `/ws` 경로를 확인합니다.
- HTTPS 환경: 브라우저 주소에 맞춰 클라이언트가 `wss://`를 선택합니다. 이 서버 자체는 HTTP이므로 배포 시 TLS를 처리하는 프록시 등의 구성이 필요합니다.
- 연결 종료 코드 `1006`: 정상 종료 절차 없이 연결이 끊긴 경우입니다. 서버 또는 네트워크 상태를 확인합니다.

로컬 학습용 예제로 인증, 채팅방, 데이터 저장, 자동 재접속, heartbeat, 전송 속도 제한은 포함하지 않습니다. 외부 서비스로 확장할 때 인증과 Origin 검사, TLS, 접속 및 전송량 제한을 추가하세요.

## 참고 자료

- [ws 공식 문서 및 예제](https://github.com/websockets/ws)
- [ws 서버 API](https://github.com/websockets/ws/blob/master/doc/ws.md)

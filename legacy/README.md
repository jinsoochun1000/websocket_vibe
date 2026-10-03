# WebSocket Tutorial (legacy)

브라우저 클라이언트와 Node.js 에코 서버로 구성한 WebSocket 입문 예제이다. 페이지를 열면 `ws://localhost:8081`에 연결되고, 버튼을 누르면 고정 문자열 `Hi`를 보낸다. 서버는 수신 내용을 콘솔에 출력한 뒤 `서버 에코: ` 접두사를 붙여 그 연결에만 응답한다.

- 프로토콜: WebSocket (`ws://`, 비암호화)
- 포트: `8081` (클라이언트·서버 모두 소스에 고정)
- 메시지 형식: 일반 텍스트. JSON 파싱, 명령 분기, 바이너리 구분은 없다
- 브로드캐스트·방·인증·영속 저장: 없음

서버만 따로 보는 분석은 [server/README.md](server/README.md)에 있다.

## 디렉터리

```text
legacy/
├── README.md              # 이 문서 (클라이언트 + 서버)
├── client/
│   └── index.html         # 브라우저 WebSocket 클라이언트
└── server/
    ├── server.js          # ws 에코 서버
    ├── package.json       # 의존성 선언 (ws)
    ├── package-lock.json  # 잠금 파일 (ws 8.22.0)
    ├── README.md          # 서버 소스 분석
    └── node_modules/      # 설치된 의존성
```

클라이언트는 빌드 도구나 패키지 매니저가 없다. HTML 파일 하나를 브라우저에서 연다. HTTP로 페이지를 제공하는 코드도 서버에 없다.

## 실행

Node.js와 npm이 필요하다. 서버를 먼저 띄운 다음 HTML을 연다.

```powershell
cd server
npm ci
node server.js
```

`npm ci`는 `package-lock.json` 기준으로 `node_modules`를 다시 설치한다. 의존성이 이미 있으면 `node server.js`만 실행해도 된다. 성공하면 콘솔에 다음이 출력된다.

```text
웹소켓 서버가 8081 포트에서 실행 중입니다...
```

이 로그는 서버 객체를 만든 직후에 찍힌다. `listening` 이벤트에서 바인딩 완료를 확인하는 메시지는 아니다. 8081 포트가 이미 쓰이고 있으면 프로세스가 죽는다. 종료는 해당 터미널에서 `Ctrl+C`이다.

`package.json`에는 `start` 스크립트가 없고, `main`은 `index.js`로 되어 있다. 실제 진입점은 `server.js`이므로 `node server.js`로 실행한다.

서버가 떠 있는 상태에서 `client/index.html`을 브라우저로 연다. 파일 더블 클릭(`file://`)으로 열어도 WebSocket 연결 자체는 가능하다. 페이지 상단 로그에 `[연결 완료] 서버에 연결되었습니다.`가 보이면 연결이 된 것이다. **Hi 보내기** 버튼을 누르면 아래 순서로 로그가 쌓인다.

```text
[연결 완료] 서버에 연결되었습니다.
[전송] 서버로 'Hi' 메시지를 전송했습니다.
[수신] 서버로부터 메시지: 서버 에코: Hi
```

서버 콘솔에는 접속과 수신이 찍힌다.

```text
클라이언트가 접속했습니다.
수신된 메시지: Hi
```

탭을 닫거나 페이지를 벗어나면 `클라이언트 연결 종료`가 출력되고, 페이지 로그에는 `[종료] 연결 해제 (코드: …)`가 남는다.

## 통신 흐름

```text
node server.js
  → 8081 포트에서 WebSocket 서버 대기

브라우저가 client/index.html 로드
  → new WebSocket("ws://localhost:8081")
  → 핸드셰이크 성공 시 socket.onopen
      → 로그: [연결 완료]

Hi 보내기 클릭
  → readyState === OPEN 이면 socket.send("Hi")
  → 서버 ws "message"
      → 콘솔: 수신된 메시지: Hi
      → ws.send("서버 에코: Hi")
  → 브라우저 socket.onmessage
      → 로그: [수신] 서버로부터 메시지: 서버 에코: Hi

페이지 종료 또는 socket close
  → 서버: 클라이언트 연결 종료
  → 브라우저: [종료] 연결 해제 (코드)
```

여러 탭을 열면 연결마다 소켓이 생긴다. 각 소켓은 자기가 받은 메시지에만 응답한다. 한 클라이언트의 `Hi`가 다른 클라이언트에게 전달되지는 않는다.

## 클라이언트 (`client/index.html`)

단일 HTML 문서이다. 스타일은 로그 영역 inline style뿐이고, 스크립트도 같은 파일 안에 있다.

### 화면

| 요소 | 역할 |
| --- | --- |
| `#send` 버튼 | `onclick="sendMessage()"`. 라벨은 `Hi 보내기` |
| `#log` | 높이 150px, 세로 스크롤. 연결·전송·수신·에러·종료 로그 |

입력창은 없다. 보내는 문자열은 항상 `Hi`이다.

### 연결

페이지 스크립트가 실행되는 즉시 연결을 시도한다.

```javascript
let socket = new WebSocket("ws://localhost:8081");
```

주소·포트는 상수이다. 쿼리 파라미터, 서브프로토콜, 재연결 로직은 없다.

### 이벤트

| 핸들러 | 하는 일 |
| --- | --- |
| `onopen` | `[연결 완료] 서버에 연결되었습니다.` |
| `onmessage` | `event.data`를 `[수신]` 로그로 출력. 텍스트로만 다룸 |
| `onerror` | `error.message`가 있으면 그 문자열, 없으면 `오류` |
| `onclose` | `event.code`를 `[종료]` 로그에 포함. `reason`은 표시하지 않음 |

`printLog`는 `<p>`를 만들어 `#log`에 붙인다. `textContent`를 쓰므로 수신 문자열이 HTML로 해석되지 않는다.

### 전송

```javascript
function sendMessage() {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send('Hi');
    printLog("[전송] 서버로 'Hi' 메시지를 전송했습니다.");
  } else {
    alert("소켓이 아직 연결되지 않았습니다.");
  }
}
```

`OPEN`(readyState `1`)일 때만 보낸다. 연결 중(`CONNECTING`)이거나 이미 닫힌 상태에서는 alert만 띄운다. 전송 실패를 `try/catch`로 감싸지는 않는다. 한 번 끊기면 같은 `socket`으로 다시 붙이지 않으므로, 재접속하려면 페이지를 새로고침해야 한다.

브라우저 WebSocket API의 `error` 이벤트는 상세 메시지를 거의 주지 않는다. 서버가 꺼져 있으면 `[에러]` 한 줄과 `[종료]`(보통 코드 `1006`)가 함께 보이는 경우가 많다.

## 서버 (`server/server.js`)

Node.js CommonJS 스크립트이다. HTTP 프레임워크 없이 `ws`의 `WebSocket.Server`가 포트만 연다.

```javascript
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8081 });
```

`server` 옵션으로 기존 HTTP 서버를 넘기지 않는다. 정적 파일, REST, TLS 설정은 없다.

### 의존성

| 항목 | 값 |
| --- | --- |
| 패키지 | `server` `1.0.0` |
| 모듈 | `type: commonjs` |
| `ws` | `package.json`은 `^8.22.0`, lock 파일은 `8.22.0` |
| `engines` (`ws`) | Node.js `>=10` |
| 선택적 peer | `bufferutil`, `utf-8-validate` (없어도 동작) |
| 라이선스 선언 | `ISC` (`package.json`) |
| 테스트 스크립트 | 자리표시자. `npm test`는 종료 코드 1 |

### 연결별 동작

`connection` 콜백의 `ws`는 그 클라이언트 하나와의 소켓이다.

| 이벤트 | 동작 |
| --- | --- |
| `connection` | `클라이언트가 접속했습니다.` |
| `message` | `수신된 메시지: …` 출력 후 `ws.send(\`서버 에코: ${message}\`)` |
| `close` | `클라이언트 연결 종료`. 코드·사유는 기록하지 않음 |

`error` 핸들러, ping/pong, 연결 수 제한, 메시지 크기 제한, 프로세스 종료 시 소켓 정리는 없다.

`message` 인자는 `ws` 기본 설정에서 텍스트면 `Buffer`가 될 수 있다. 템플릿 문자열에 넣으면 `toString()`으로 UTF-8 문자열이 된다. 그래서 텍스트 `Hi`는 `서버 에코: Hi`가 되지만, 바이너리 프레임은 원본 바이트가 아니라 문자열로 바뀐 뒤 다시 텍스트로 나간다.

응답 대상은 메시지를 보낸 `ws`뿐이다. `wss.clients`를 순회하지 않는다.

## 메시지 규약

애플리케이션 레벨 프로토콜은 없다. 본문이 곧 메시지이다.

| 방향 | 내용 | 예 |
| --- | --- | --- |
| 클라이언트 → 서버 | 버튼이 보내는 고정 문자열 | `Hi` |
| 서버 → 그 클라이언트 | `서버 에코: ` + 수신 문자열 | `서버 에코: Hi` |

개발자 도구 콘솔에서 같은 서버에 직접 붙여 확인할 수 있다. 페이지가 HTTPS이면 비암호화 `ws://`는 브라우저가 막을 수 있다.

```javascript
const socket = new WebSocket('ws://localhost:8081');
socket.addEventListener('open', () => socket.send('안녕하세요'));
socket.addEventListener('message', (event) => {
  console.log('서버 응답:', event.data);
});
```

기대 출력은 `서버 응답: 서버 에코: 안녕하세요`이다.

## 이 예제가 하지 않는 것

| 구분 | 현재 상태 |
| --- | --- |
| 페이지 제공 | 서버는 HTML을 주지 않는다. 파일로 열거나 별도 정적 서버가 필요하다 |
| 사용자 입력 | 보내는 값은 `Hi` 고정 |
| 재연결 | 끊기면 새로고침 전까지 소켓이 죽은 채로 남는다 |
| 여러 클라이언트 공유 | 에코만 한다. 채팅방 브로드캐스트가 아니다 |
| 설정 | 포트·URL이 소스에 박혀 있다. 환경 변수 없음 |
| 보안 | 인증, Origin 검사, TLS(`wss://`) 없음. `host`를 좁히지 않아 바인딩 범위는 OS 기본값이다 |
| 오류 | 포트 점유·소켓 오류를 잡는 핸들러가 없다 |
| 테스트 | 자동 테스트 없음 |

운영용 서버로 쓰기 전에 손볼 지점(포트 분리, `start` 스크립트, `error` 처리, 종료 시 연결 정리, 하트비트, 메시지 검증)은 [server/README.md](server/README.md) 7절에 정리되어 있다.

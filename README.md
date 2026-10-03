# WebSocket Tutorial

같은 프롬프트로 바이브 코딩한 WebSocket 튜토리얼을 도구별로 모아 둔 저장소다. 클라이언트는 `index.html`, 서버는 JavaScript(또는 다른 언어)로 만들고, 각 폴더의 개발 내용은 그 폴더의 `README.md`에 적혀 있다. 원문 프롬프트는 [PROMPT.md](PROMPT.md)에 있다.

공통 스택은 브라우저 내장 `WebSocket` API와 Node.js [`ws`](https://github.com/websockets/ws)다. HTTP로 페이지를 주고, 같은 프로세스에서 WebSocket 업그레이드를 받는다.

## 폴더 분류

| 도구 | 폴더 | 형태 | 기본 주소 |
| --- | --- | --- | --- |
| Cursor | [cursor_grok47](cursor_grok47/) | 텍스트 에코 | http://localhost:3000 |
| Antigravity | [antigravity_gemini38flash](antigravity_gemini38flash/) | 채팅 + 인스펙터, Python 서버 포함 | http://localhost:8080 |
| Claude Code | [claudecode_opus55](claudecode_opus55/) | 접속자 수가 있는 채팅 | http://localhost:8080 |
| Codex | [codex_astra](codex_astra/) | 에코/채팅 전환, 테스트 포함 | http://127.0.0.1:3000 |
| Copilot | [github_copilot](github_copilot/) | 길이 검증이 있는 채팅 | http://localhost:3000 |

`legacy/`는 이 프롬프트로 만든 결과가 아니다. 페이지와 서버가 분리된 기존 에코 예제(`ws://localhost:8081`, 전송 문자열은 `Hi` 고정)다. 설명은 [legacy/README.md](legacy/README.md)에 있다.

## 한눈에 비교

| | Cursor | Antigravity | Claude Code | Codex | Copilot |
| --- | --- | --- | --- | --- | --- |
| 서버 | `server.js` 29줄 | `server.js` 162줄, `server_python.py` 99줄 | `server.js` 61줄 | `server.js` 92줄 | `server.js` 67줄 |
| 클라이언트 | `index.html` 88줄 | `index.html` 915줄 | `index.html` 104줄 | `index.html` 137줄 | `index.html` 224줄 |
| 모듈 | CommonJS | CommonJS | CommonJS | ESM (`"type": "module"`) | CommonJS (`node:` import) |
| 메시지 | 평문 에코 | JSON | JSON | JSON | JSON |
| 전달 범위 | 보낸 소켓만 | 채팅은 전체 | 채팅은 전체 | 에코는 본인, 채팅은 전체 | 채팅은 전체 |
| 접속자 ID / 인원 | 없음 | `User-N`, 입장·퇴장 | `#N`, 입장·퇴장 | UUID 8자, `presence` | 없음 |
| 입력 검증 | 빈 문자열 무시 | JSON 실패 시 평문 에코 | JSON 파싱만 | 타입·길이·바이너리 | 타입·1~500자 |
| 페이로드 한도 | 기본값 | 기본값 | 기본값 | 16 KiB | 1 KiB |
| 포트 | 3000 고정 | `PORT` 또는 8080 | `PORT` 또는 8080 | `PORT` 또는 3000, `HOST` 기본 `127.0.0.1` | `PORT` 또는 3000 |
| 연결 UI | 페이지 로드 시 자동 | 연결 버튼 | 자동 + 끊기 버튼 | 연결 / 해제 버튼 | 페이지 로드 시 자동 |
| 테스트 | 없음 | 없음 | 없음 | `npm test` (`node --test`) | 없음 |

다섯 구현 모두 인증, 저장, 방(room), 자동 재접속은 없다.

## Cursor — `cursor_grok47`

가장 짧은 에코다. 서버는 받은 텍스트를 그 소켓에만 `ws.send`로 되돌린다. 다른 탭으로는 전달하지 않는다.

- HTTP 핸들러는 경로와 무관하게 `index.html`을 스트림으로 내려준다. 404는 없다.
- 클라이언트는 `ws://${location.host}`로 바로 붙고, 로그에 `보냄` / `에코`를 쌓는다.
- `package.json`의 스크립트는 `npm start`뿐이다.

입문용으로 읽고 실행하기 좋다. 여러 사람 채팅, 환경 변수, 종료 처리는 범위 밖이다.

## Antigravity — `antigravity_gemini38flash`

튜토리얼 문서와 UI를 가장 크게 만든 구현이다. 다크 테마 채팅, 이벤트 인스펙터, Ping RTT, 닉네임 변경, 빠른 테스트 버튼이 `index.html` 한 파일에 들어 있다.

서버 JSON 타입:

| type | 동작 |
| --- | --- |
| `welcome` / `system` | 접속 시 ID 부여, 입장·퇴장 알림 |
| `chat` | 열린 모든 소켓에 전달 |
| `ping` | `pong`과 서버 시각으로 응답 |
| `set-nickname` | 소켓에 붙은 ID를 바꾸고 전체에 알림 |
| 그 외 JSON | 보낸 사람에게 `echo` |
| JSON이 아닌 문자열 | 평문 에코 |

`server_python.py`는 `websockets` + `asyncio`로 같은 메시지 타입을 다시 구현한 대체 서버다. HTML은 서빙하지 않으므로, Python만 띄울 때는 `index.html`을 브라우저에서 직접 연다. Node 서버 주석에는 포트 3000이라고 적혀 있으나 실제 기본값은 8080이다.

HTTP는 요청 URL을 `__dirname` 아래 파일 경로로 이어 읽는다. 나머지 네 구현은 `/`와 `/index.html`만 허용한다. 채팅 본문 길이 제한은 없다. `broadcast()`는 발신자를 빼지만, `chat` 분기는 발신자를 포함해 다시 보낸다.

## Claude Code — `claudecode_opus55`

접속자 수가 보이는 최소 채팅이다. 코드와 폴더 `README.md`의 프로토콜 표가 맞다.

클라이언트 → 서버:

```json
{ "type": "chat", "text": "안녕하세요" }
```

서버 → 클라이언트: `welcome`(본인 ID), `system`(입장·퇴장과 `count`), `chat`(`from`, `text`, `time`), `error`(JSON 파싱 실패).

`/`와 `/index.html`만 200이고 그 외는 404다. 페이지를 열면 자동으로 연결하고, 끊기 버튼이 있다. `text`는 `String()`으로만 넘기므로 길이·공백 검사는 없다. 확장 아이디어(닉네임, 방, 재연결, heartbeat, `wss`)는 README에만 있고 코드에는 없다.

## Codex — `codex_astra`

같은 프롬프트에서 실행·검증까지 닫아 둔 구현이다.

- ESM. `createTutorialServer()`를 export해서 테스트가 임시 포트로 띄운다.
- WebSocket 경로는 `/ws`. 페이지는 `/`와 `/index.html`만.
- 클라이언트가 에코와 채팅을 고른다. 에코는 요청자에게만, 채팅은 `wss.clients` 전체에 간다.
- 서버가 타입(`echo` | `chat`), 공백, 1000자, 바이너리 프레임을 검사하고 `error`로 돌려준다.
- 바인딩 기본값은 `127.0.0.1`. `SIGINT` / `SIGTERM`에서 클라이언트에 close `1001`을 보낸 뒤 서버를 닫는다.
- `npm run dev`는 `node --watch`, `npm test`는 `node --test`. `engines`는 Node.js 22 이상.
- `package.json`에 `ws`만 있다. 테스트 러너는 Node 내장이다.

화면 로그는 최근 200개만 유지하고, 메시지는 `textContent`로 넣는다.

## Copilot — `github_copilot`

채팅만 하는 중간 크기다. 페이지를 열면 `ws:` 또는 `wss:`를 현재 호스트에 맞춰 자동 연결한다.

- `type: "chat"`과 문자열 `text`만 받는다. trim 후 1~500자가 아니면 `error`.
- 브로드캐스트 본문은 `{ type, text, time }`이다. 보낸 사람 ID와 접속자 수는 없다.
- 연결 직후 서버가 `{ type: "system", text: "채팅 서버에 연결되었습니다." }`를 그 소켓에만 보낸다.
- `maxPayload`는 1024바이트. HTTP는 `/`와 `/index.html`만 읽고, 실패 시 500을 한국어 문구로 응답한다.
- 화면은 `textContent`로 렌더링한다. 연결 버튼은 없고, 끊기면 상태가 `연결 종료`로 바뀐다.

## 실행

각 폴더에서 따로 띄운다. 포트가 겹치면(Cursor·Codex·Copilot은 3000, Antigravity·Claude Code는 8080) 하나만 실행한다.

```powershell
cd cursor_grok47
npm install
npm start
```

폴더만 바꿔 같은 순서로 실행하면 된다. Codex는 이어서 `npm test`로 서버 동작을 확인할 수 있다.

| 폴더 | 확인 방법 |
| --- | --- |
| `cursor_grok47` | 메시지를 보내면 같은 탭에 에코가 돌아온다. 다른 탭에는 안 보인다. |
| `antigravity_gemini38flash` | 탭을 둘 이상 열고 연결한 뒤, 채팅·Ping·이벤트 로그를 본다. |
| `claudecode_opus55` | 두 탭에서 채팅이 양쪽 모두에 보이고, 한쪽을 끊으면 퇴장 문구와 인원이 바뀐다. |
| `codex_astra` | 에코는 보낸 탭만, 채팅은 연결된 탭 전체가 받는다. |
| `github_copilot` | 두 탭에 같은 채팅이 표시된다. 빈 문자열과 500자 초과는 거절된다. |

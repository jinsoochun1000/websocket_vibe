/**
 * WebSocket Tutorial Server (Node.js + 'ws' library)
 * 
 * [WebSocket 핵심 원리]
 * 1. 클라이언트가 HTTP GET 요청으로 접속 시도 (Upgrade: websocket 헤더 포함)
 * 2. 서버가 101 Switching Protocols 응답을 반환하여 프로토콜을 HTTP -> WebSocket으로 업그레이드
 * 3. 이후 TCP 연결이 유지된 채로 양방향(Full-Duplex) 실시간 데이터 교환이 가능해집니다.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer, WebSocket } = require('ws');

const PORT = process.env.PORT || 8080;

// 1. 정적 파일(index.html) 서빙을 위한 기본 HTTP 서버 생성
const server = http.createServer((req, res) => {
  // 루트('/') 요청 시 index.html 파일 전송
  let filePath = req.url === '/' ? '/index.html' : req.url;
  const extname = path.extname(filePath);
  const fullPath = path.join(__dirname, filePath);

  // 허용할 Content-Type 매핑
  const contentTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8'
  };

  fs.readFile(fullPath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(`서버 내부 오류: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentTypes[extname] || 'text/plain' });
      res.end(content, 'utf-8');
    }
  });
});

// 2. HTTP 서버 인스턴스를 공유하는 WebSocket 서버 생성
// (동일한 포트 3000에서 HTTP 웹페이지와 ws:// 통신을 모두 처리)
const wss = new WebSocketServer({ server });

let clientCounter = 1;

/**
 * 모든 연결된 클라이언트에게 메시지를 전송하는 브로드캐스트 함수
 * @param {object} payload - 전송할 JSON 데이터 객체
 * @param {WebSocket} [senderWs] - (선택사항) 제외할 발신자 클라이언트
 */
function broadcast(payload, senderWs = null) {
  const data = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    // 연결이 열려있는(OPEN) 클라이언트에게만 전송
    if (client.readyState === WebSocket.OPEN && client !== senderWs) {
      client.send(data);
    }
  });
}

// 3. WebSocket 서버 이벤트 처리
wss.on('connection', (ws, req) => {
  const clientId = `User-${clientCounter++}`;
  const clientIp = req.socket.remoteAddress;
  
  // 클라이언트 소켓에 고유 ID 부여
  ws.clientId = clientId;
  
  console.log(`[연결됨] 새 클라이언트 접속: ${clientId} (${clientIp}) | 총 접속자: ${wss.clients.size}명`);

  // (1) 새로 접속한 클라이언트에게 환영 메시지 및 ID 부여
  ws.send(JSON.stringify({
    type: 'welcome',
    clientId: clientId,
    message: `WebSocket 서버에 오신 것을 환영합니다! 당신의 ID는 [${clientId}] 입니다.`,
    onlineCount: wss.clients.size,
    timestamp: new Date().toLocaleTimeString()
  }));

  // (2) 다른 모든 클라이언트에게 새 사용자 접속 알림 (브로드캐스트)
  broadcast({
    type: 'system',
    message: `📢 [${clientId}] 님이 접속하셨습니다.`,
    onlineCount: wss.clients.size,
    timestamp: new Date().toLocaleTimeString()
  }, ws);

  // (3) 클라이언트로부터 메시지를 수신했을 때 ('message' 이벤트)
  ws.on('message', (data, isBinary) => {
    try {
      const messageString = isBinary ? data : data.toString();
      const parsed = JSON.parse(messageString);

      console.log(`[메시지 수신 - ${ws.clientId}]:`, parsed);

      switch (parsed.type) {
        // 채팅 메시지 브로드캐스트
        case 'chat':
          const chatPayload = {
            type: 'chat',
            sender: parsed.sender || ws.clientId,
            text: parsed.text,
            timestamp: new Date().toLocaleTimeString()
          };
          // 발신자를 포함한 모든 클라이언트에게 전달
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify(chatPayload));
            }
          });
          break;

        // 핑/퐁(Ping-Pong) 지연시간(Latency) 테스트용
        case 'ping':
          ws.send(JSON.stringify({
            type: 'pong',
            clientTimestamp: parsed.clientTimestamp,
            serverTimestamp: Date.now()
          }));
          break;

        // 닉네임 변경 요청
        case 'set-nickname':
          const oldName = ws.clientId;
          ws.clientId = parsed.nickname || ws.clientId;
          broadcast({
            type: 'system',
            message: `🔄 [${oldName}] 님이 닉네임을 [${ws.clientId}] (으)로 변경하셨습니다.`,
            onlineCount: wss.clients.size,
            timestamp: new Date().toLocaleTimeString()
          });
          break;

        default:
          // 기본 에코(Echo) 응답
          ws.send(JSON.stringify({
            type: 'echo',
            data: parsed,
            timestamp: new Date().toLocaleTimeString()
          }));
      }
    } catch (e) {
      // 일반 문자열이 들어온 경우 그대로 에코
      console.warn(`[문자열 메시지 수신]: ${data.toString()}`);
      ws.send(JSON.stringify({
        type: 'echo',
        text: data.toString(),
        timestamp: new Date().toLocaleTimeString()
      }));
    }
  });

  // (4) 소켓 오류 발생 시 ('error' 이벤트)
  ws.on('error', (err) => {
    console.error(`[오류 - ${ws.clientId}]:`, err.message);
  });

  // (5) 클라이언트 연결 종료 시 ('close' 이벤트)
  ws.on('close', (code, reason) => {
    console.log(`[연결 해제] ${ws.clientId} 연결 끊김 (Code: ${code}) | 남은 접속자: ${wss.clients.size}명`);
    // 퇴장 알림 브로드캐스트
    broadcast({
      type: 'system',
      message: `💨 [${ws.clientId}] 님이 퇴장하셨습니다.`,
      onlineCount: wss.clients.size,
      timestamp: new Date().toLocaleTimeString()
    });
  });
});

// 4. 서버 리스닝 시작
server.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`🚀 WebSocket & Web Server가 시작되었습니다!`);
  console.log(`🌐 웹 페이지 접속 (HTTP) : http://localhost:${PORT}`);
  console.log(`🔌 웹소켓 엔드포인트 (WS) : ws://localhost:${PORT}`);
  console.log(`===================================================`);
});

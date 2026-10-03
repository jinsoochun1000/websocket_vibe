// WebSocket 튜토리얼 서버
// - HTTP: index.html 제공 (http://localhost:8080)
// - WebSocket: 같은 포트에서 연결 수락 (ws://localhost:8080)
const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer, WebSocket } = require('ws');

const PORT = process.env.PORT || 8080;

// 1) HTTP 서버: 클라이언트 페이지(index.html)를 내려준다
const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    fs.readFile(path.join(__dirname, 'index.html'), (err, data) => {
      if (err) {
        res.writeHead(500);
        return res.end('index.html 을 읽을 수 없습니다');
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(data);
    });
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

// 2) WebSocket 서버: HTTP 서버에 붙여서 업그레이드 요청을 처리한다
const wss = new WebSocketServer({ server });

let nextId = 1;

// 연결된 모든 클라이언트에게 메시지 전송
function broadcast(obj) {
  const data = JSON.stringify(obj);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) client.send(data);
  }
}

wss.on('connection', (ws, req) => {
  ws.id = nextId++;
  console.log(`[연결] client #${ws.id} (${req.socket.remoteAddress}) / 현재 ${wss.clients.size}명`);

  // 본인에게 환영 메시지, 전체에게 입장 알림
  ws.send(JSON.stringify({ type: 'welcome', id: ws.id }));
  broadcast({ type: 'system', text: `client #${ws.id} 님이 입장했습니다`, count: wss.clients.size });

  // 클라이언트 → 서버 메시지 수신
  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return ws.send(JSON.stringify({ type: 'error', text: 'JSON 형식이 아닙니다' }));
    }
    console.log(`[수신] #${ws.id}:`, msg);

    if (msg.type === 'chat') {
      broadcast({ type: 'chat', from: ws.id, text: String(msg.text), time: new Date().toISOString() });
    }
  });

  // 연결 종료
  ws.on('close', () => {
    console.log(`[종료] client #${ws.id} / 현재 ${wss.clients.size}명`);
    broadcast({ type: 'system', text: `client #${ws.id} 님이 퇴장했습니다`, count: wss.clients.size });
  });
});

server.listen(PORT, () => {
  console.log(`서버 실행: http://localhost:${PORT}`);
});

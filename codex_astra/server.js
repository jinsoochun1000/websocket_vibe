import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import WebSocket, { WebSocketServer } from 'ws';

// 테스트에서도 임시 포트로 실행할 수 있도록 서버 생성과 실행을 분리합니다.
export function createTutorialServer() {
  const server = http.createServer(async (req, res) => {
    if (req.method !== 'GET' || !['/', '/index.html'].includes(req.url)) {
      res.writeHead(404).end('Not found');
      return;
    }
    try {
      const html = await readFile(new URL('./index.html', import.meta.url));
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    } catch (error) {
      console.error(error);
      res.writeHead(500).end('Unable to load index.html');
    }
  });

  // HTTP 서버의 /ws 경로에서 WebSocket 업그레이드를 처리합니다.
  const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 16 * 1024 });
  function send(socket, message) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ ...message, time: new Date().toISOString() }));
    }
  }
  function broadcast(message) {
    for (const client of wss.clients) send(client, message);
  }
  function updatePresence() {
    const count = [...wss.clients].filter(c => c.readyState === WebSocket.OPEN).length;
    broadcast({ type: 'presence', count });
  }

  wss.on('connection', socket => {
    const clientId = randomUUID().slice(0, 8);
    send(socket, { type: 'welcome', clientId, text: '서버에 연결되었습니다.' });
    updatePresence();

    socket.on('message', (data, isBinary) => {
      // 네트워크에서 받은 데이터는 반드시 서버에서도 검증합니다.
      if (isBinary) {
        send(socket, { type: 'error', text: '텍스트 JSON만 전송할 수 있습니다.' });
        return;
      }
      let message;
      try {
        message = JSON.parse(data.toString());
      } catch {
        send(socket, { type: 'error', text: '올바른 JSON 형식이 아닙니다.' });
        return;
      }
      if (!message || !['echo', 'chat'].includes(message.type)
          || typeof message.text !== 'string'
          || !message.text.trim() || message.text.length > 1000) {
        send(socket, { type: 'error', text: 'type은 echo 또는 chat, text는 1~1000자의 문자열이어야 합니다.' });
        return;
      }
      const reply = { type: message.type, clientId, text: message.text.trim() };
      if (message.type === 'echo') send(socket, reply); // 보낸 사람에게만 응답
      else broadcast(reply); // 보낸 사람을 포함한 모든 접속자에게 전달
    });
    socket.on('close', updatePresence);
    socket.on('error', error => console.error('WebSocket 오류:', error.message));
  });

  return { server, wss };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || '127.0.0.1';
  const { server, wss } = createTutorialServer();
  server.on('error', error => {
    console.error('서버 실행 실패:', error.message);
    process.exitCode = 1;
  });
  server.listen(port, host, () => console.log(`WebSocket Tutorial: http://${host}:${server.address().port}`));

  // 종료 시 연결된 클라이언트에도 종료 사실을 알립니다.
  let stopping = false;
  function shutdown() {
    if (stopping) return;
    stopping = true;
    for (const client of wss.clients) client.close(1001, 'Server shutting down');
    const timer = setTimeout(() => {
      for (const client of wss.clients) client.terminate();
    }, 1000);
    timer.unref();
    wss.close();
    server.close();
  }
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

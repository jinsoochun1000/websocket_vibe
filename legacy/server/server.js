const WebSocket = require('ws');

// 8081 포트로 웹소켓 서버 실행
const wss = new WebSocket.Server({ port: 8081 });

console.log("웹소켓 서버가 8081 포트에서 실행 중입니다...");

wss.on('connection', (ws) => {
  console.log("클라이언트가 접속했습니다.");

  // 클라이언트로부터 메시지 수신
  ws.on('message', (message) => {
    console.log(`수신된 메시지: ${message}`);

    // 받은 메시지에 응답 반환 (Echo)
    ws.send(`서버 에코: ${message}`);
  });

  ws.on('close', () => {
    console.log("클라이언트 연결 종료");
  });
});
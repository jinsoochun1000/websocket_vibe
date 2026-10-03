// WebSocket 에코 서버
// HTTP로 index.html을 제공하고, 같은 포트에서 WebSocket 연결을 받는다.
// 클라이언트가 보낸 텍스트는 그 연결로 그대로 돌려준다.

const http = require("http");
const fs = require("fs");
const path = require("path");
const { WebSocketServer } = require("ws");

const PORT = 3000;

const server = http.createServer((req, res) => {
  const file = path.join(__dirname, "index.html");
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  fs.createReadStream(file).pipe(res);
});

const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  console.log("client connected");

  ws.on("message", (data) => {
    const text = data.toString();
    if (text.length === 0) return;
    // 같은 소켓으로 에코. 다른 클라이언트에게는 보내지 않는다.
    ws.send(text);
  });

  ws.on("close", () => {
    console.log("client disconnected");
  });
});

server.listen(PORT, () => {
  console.log(`http://localhost:${PORT}`);
});

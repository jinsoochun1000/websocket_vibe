const http = require("node:http");
const { readFile } = require("node:fs/promises");
const path = require("node:path");
const { WebSocket, WebSocketServer } = require("ws");

const PORT = Number(process.env.PORT) || 3000;
const INDEX_FILE = path.join(__dirname, "index.html");

const server = http.createServer(async (request, response) => {
  if (request.url !== "/" && request.url !== "/index.html") {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("페이지를 찾을 수 없습니다.");
    return;
  }

  try {
    const html = await readFile(INDEX_FILE);
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    response.end(html);
  } catch (error) {
    console.error("index.html을 읽지 못했습니다.", error);
    response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("페이지를 불러오지 못했습니다.");
  }
});

const webSocketServer = new WebSocketServer({
  server,
  maxPayload: 1024,
});

webSocketServer.on("connection", (socket) => {
  console.log("클라이언트가 연결되었습니다.");
  socket.send(JSON.stringify({ type: "system", text: "채팅 서버에 연결되었습니다." }));

  socket.on("message", (data) => {
    let message;

    try {
      message = JSON.parse(data.toString());
    } catch {
      socket.send(JSON.stringify({ type: "error", text: "메시지 형식이 올바르지 않습니다." }));
      return;
    }

    if (message.type !== "chat" || typeof message.text !== "string") {
      socket.send(JSON.stringify({ type: "error", text: "지원하지 않는 메시지입니다." }));
      return;
    }

    const text = message.text.trim();
    if (!text || text.length > 500) {
      socket.send(JSON.stringify({ type: "error", text: "메시지는 1~500자여야 합니다." }));
      return;
    }

    const chatMessage = JSON.stringify({
      type: "chat",
      text,
      time: new Date().toISOString(),
    });

    for (const client of webSocketServer.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(chatMessage);
      }
    }
  });

  socket.on("close", () => {
    console.log("클라이언트 연결이 종료되었습니다.");
  });

  socket.on("error", (error) => {
    console.error("WebSocket 오류:", error);
  });
});

server.listen(PORT, () => {
  console.log(`서버가 실행 중입니다: http://localhost:${PORT}`);
});

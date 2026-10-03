import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import WebSocket from 'ws';
import { createTutorialServer } from '../server.js';

// 이벤트가 테스트 코드보다 먼저 도착해도 놓치지 않도록 큐에 보관합니다.
function inbox(socket) {
  const messages = [];
  socket.on('message', data => messages.push(JSON.parse(data.toString())));
  return async predicate => {
    const end = Date.now() + 2000;
    while (Date.now() < end) {
      const index = messages.findIndex(predicate);
      if (index >= 0) return messages.splice(index, 1)[0];
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    throw new Error('메시지 수신 시간 초과');
  };
}

test('HTTP 제공, 두 클라이언트 송수신, 입력 검증 및 접속자 갱신', { timeout: 10000 }, async t => {
  const { server, wss } = createTutorialServer();
  const sockets = [];
  t.after(async () => {
    for (const socket of sockets) socket.terminate();
    for (const socket of wss.clients) socket.terminate();
    await new Promise(resolve => wss.close(resolve));
    await new Promise(resolve => server.close(resolve));
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `127.0.0.1:${server.address().port}`;
  const response = await fetch(`http://${base}/`);
  assert.equal(response.status, 200);
  assert.match(await response.text(), /WebSocket 튜토리얼/);
  assert.equal((await fetch(`http://${base}/server.js`)).status, 404);

  const a = new WebSocket(`ws://${base}/ws`);
  sockets.push(a);
  const readA = inbox(a);
  await once(a, 'open');
  const welcome = await readA(m => m.type === 'welcome');
  assert.ok(welcome.clientId);
  const b = new WebSocket(`ws://${base}/ws`);
  sockets.push(b);
  const readB = inbox(b);
  await once(b, 'open');
  await readA(m => m.type === 'presence' && m.count === 2);
  await readB(m => m.type === 'presence' && m.count === 2);

  const receivedByB = [];
  b.on('message', data => receivedByB.push(JSON.parse(data.toString())));
  a.send(JSON.stringify({ type: 'echo', text: '안녕하세요' }));
  const echo = await readA(m => m.type === 'echo');
  assert.equal(echo.text, '안녕하세요');
  assert.equal(echo.clientId, welcome.clientId);
  a.send(JSON.stringify({ type: 'chat', text: '<b>모두 안녕하세요</b>' }));
  assert.equal((await readA(m => m.type === 'chat')).text, '<b>모두 안녕하세요</b>');
  assert.equal((await readB(m => m.type === 'chat')).text, '<b>모두 안녕하세요</b>');
  assert.equal(receivedByB.some(m => m.type === 'echo'), false);

  for (const invalid of ['not-json', 'null', '{}', '{"type":"other","text":"x"}',
    JSON.stringify({ type: 'echo', text: ' ' }),
    JSON.stringify({ type: 'chat', text: 'x'.repeat(1001) }), Buffer.from('binary')]) {
    a.send(invalid);
    assert.equal((await readA(m => m.type === 'error')).type, 'error');
  }
  // 잘못된 메시지를 받은 후에도 정상 메시지를 처리해야 합니다.
  a.send(JSON.stringify({ type: 'echo', text: '계속 연결됨' }));
  assert.equal((await readA(m => m.type === 'echo')).text, '계속 연결됨');
  const closed = once(b, 'close');
  b.close(1000, 'Test complete');
  assert.equal((await closed)[0], 1000);
  await readA(m => m.type === 'presence' && m.count === 1);
});

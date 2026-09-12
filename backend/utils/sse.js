let clients = [];

export function sseStream(req, res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders(); // flush the headers to establish SSE

  // Tell the client that connection is established
  res.write('data: "connected"\n\n');

  clients.push(res);

  // Keep-alive heartbeat comment every 25s
  const heartbeat = setInterval(() => {
    try {
      res.write(': keepalive\n\n');
    } catch (e) {
      clearInterval(heartbeat);
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    clients = clients.filter((client) => client !== res);
  });
}

export function notifyUpdate() {
  clients.forEach((client) => {
    try {
      client.write('data: "update"\n\n');
    } catch (err) {
      // client dropped
    }
  });
}

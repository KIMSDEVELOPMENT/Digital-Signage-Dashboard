let clients = [];

export function sseStream(req, res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders(); // flush the headers to establish SSE

  // Tell the client that connection is established
  res.write('data: "connected"\n\n');

  clients.push(res);

  req.on('close', () => {
    clients = clients.filter((client) => client !== res);
  });
}

export function notifyUpdate() {
  clients.forEach((client) => {
    // We can send any data payload here, but a simple string event is enough to trigger a refetch
    client.write('data: "update"\n\n');
  });
}

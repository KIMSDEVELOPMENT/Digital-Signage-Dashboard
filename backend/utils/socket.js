import { Server } from 'socket.io';

let ioInstance = null;

/**
 * Initialize Socket.IO with the HTTP server
 * @param {import('http').Server} httpServer
 */
export function initSocket(httpServer) {
  ioInstance = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
    },
    pingTimeout: 30000,
    pingInterval: 25000,
  });

  ioInstance.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // Allow display screens to join specific branch/location rooms
    socket.on('join:display', (data) => {
      if (data && data.branch) {
        const branchRoom = `branch:${String(data.branch).toLowerCase()}`;
        socket.join(branchRoom);

        if (data.location) {
          const locRoom = `branch:${String(data.branch).toLowerCase()}:location:${String(data.location).toLowerCase()}`;
          socket.join(locRoom);
          console.log(`[Socket.IO] Display ${socket.id} joined rooms: ${branchRoom}, ${locRoom}`);
        } else {
          console.log(`[Socket.IO] Display ${socket.id} joined room: ${branchRoom}`);
        }
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id} (reason: ${reason})`);
    });
  });

  console.log('⚡ [Socket.IO] Real-time engine initialized successfully.');
  return ioInstance;
}

/**
 * Get the active Socket.IO server instance
 */
export function getIO() {
  return ioInstance;
}

/**
 * Broadcast a real-time signage refresh event to connected display screens & dashboard
 * @param {object} payload - Optional event metadata e.g. { type: 'roster', branch, location }
 */
export function emitSignageRefresh(payload = {}) {
  if (!ioInstance) return;

  try {
    // Broadcast globally to all connected displays and dashboard tabs
    ioInstance.emit('signage:refresh', {
      ...payload,
      timestamp: new Date().toISOString(),
    });

    // Also emit to targeted branch/location room if provided
    if (payload.branch) {
      const bRoom = `branch:${String(payload.branch).toLowerCase()}`;
      ioInstance.to(bRoom).emit('signage:refresh', payload);

      if (payload.location) {
        const lRoom = `branch:${String(payload.branch).toLowerCase()}:location:${String(payload.location).toLowerCase()}`;
        ioInstance.to(lRoom).emit('signage:refresh', payload);
      }
    }

    console.log('[Socket.IO] Broadcasted signage:refresh', payload);
  } catch (err) {
    console.error('[Socket.IO] Error emitting signage:refresh:', err);
  }
}

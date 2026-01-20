/**
 * White Board Server
 * Express + Socket.io server for real-time collaborative drawing
 */

const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const RoomManager = require('./rooms');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Initialize room manager
const roomManager = new RoomManager();

// Serve static files from client directory
app.use(express.static(path.join(__dirname, '../client')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    stats: roomManager.getStats()
  });
});

// Root endpoint serves the client
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

/**
 * Socket.io connection handler
 */
io.on('connection', (socket) => {
  console.log(`[CONNECTION] New connection: ${socket.id}`);

  let currentRoom = null;
  let currentUser = null;

  /**
   * Handle user joining a room
   */
  socket.on('join-room', (data) => {
    try {
      const { roomId, userName } = data;

      if (!roomId || !userName) {
        socket.emit('error', { message: 'Room ID and user name are required' });
        return;
      }

      // Leave previous room if any
      if (currentRoom) {
        socket.leave(currentRoom);
        roomManager.removeUserFromRoom(currentRoom, socket.id);
      }

      // Join new room
      socket.join(roomId);
      currentRoom = roomId;

      // Add user to room
      currentUser = roomManager.addUserToRoom(roomId, socket.id, userName);

      // Get all users in the room
      const users = roomManager.getRoomUsers(roomId);

      // Send current canvas state to the new user
      const drawingState = roomManager.getDrawingState(roomId);
      socket.emit('canvas-state', {
        operations: drawingState.getAllOperations(),
        canUndo: drawingState.getOperationCount() > 0,
        canRedo: drawingState.getRedoCount() > 0
      });

      // Notify the new user about all existing users
      socket.emit('user-joined', {
        userId: currentUser.id,
        userName: currentUser.name,
        color: currentUser.color,
        users: users
      });

      // Notify other users about the new user
      socket.to(roomId).emit('user-joined', {
        userId: currentUser.id,
        userName: currentUser.name,
        color: currentUser.color,
        users: users
      });

      console.log(`[JOIN] ${userName} (${socket.id}) joined room ${roomId}`);
    } catch (error) {
      console.error('[ERROR] join-room:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  /**
   * Handle drawing start event
   */
  socket.on('draw-start', (data) => {
    try {
      if (!currentRoom || !currentUser) return;

      // Broadcast to other users in the room
      socket.to(currentRoom).emit('draw-start', {
        userId: socket.id,
        userName: currentUser.name,
        color: currentUser.color,
        ...data
      });
    } catch (error) {
      console.error('[ERROR] draw-start:', error);
    }
  });

  /**
   * Handle drawing move event (high frequency)
   * This is where we receive drawing data in real-time
   */
  socket.on('draw-move', (data) => {
    try {
      if (!currentRoom || !currentUser) return;

      // Broadcast to other users in the room
      socket.to(currentRoom).emit('draw-move', {
        userId: socket.id,
        ...data
      });
    } catch (error) {
      console.error('[ERROR] draw-move:', error);
    }
  });

  /**
   * Handle drawing end event
   * When a stroke is complete, add it to the operation history
   */
  socket.on('draw-end', (data) => {
    try {
      if (!currentRoom || !currentUser) return;

      const drawingState = roomManager.getDrawingState(currentRoom);

      // Create operation object
      const operation = drawingState.addOperation({
        userId: socket.id,
        userName: currentUser.name,
        userColor: currentUser.color,
        type: 'stroke',
        data: data
      });

      // Broadcast the complete operation to all users (including sender)
      io.to(currentRoom).emit('drawing-update', {
        operation: operation,
        canUndo: drawingState.getOperationCount() > 0,
        canRedo: drawingState.getRedoCount() > 0
      });

      // Also notify completion to other users
      socket.to(currentRoom).emit('draw-end', {
        userId: socket.id
      });
    } catch (error) {
      console.error('[ERROR] draw-end:', error);
    }
  });

  /**
   * Handle undo request (global undo)
   */
  socket.on('undo', () => {
    try {
      if (!currentRoom) return;

      const drawingState = roomManager.getDrawingState(currentRoom);
      const operation = drawingState.undo();

      if (operation) {
        // Notify all users to undo the operation
        io.to(currentRoom).emit('operation-undone', {
          operationId: operation.id,
          canUndo: drawingState.getOperationCount() > 0,
          canRedo: drawingState.getRedoCount() > 0
        });

        console.log(`[UNDO] Operation ${operation.id} undone in room ${currentRoom}`);
      }
    } catch (error) {
      console.error('[ERROR] undo:', error);
    }
  });

  /**
   * Handle redo request (global redo)
   */
  socket.on('redo', () => {
    try {
      if (!currentRoom) return;

      const drawingState = roomManager.getDrawingState(currentRoom);
      const operation = drawingState.redo();

      if (operation) {
        // Notify all users to redo the operation
        io.to(currentRoom).emit('operation-redone', {
          operation: operation,
          canUndo: drawingState.getOperationCount() > 0,
          canRedo: drawingState.getRedoCount() > 0
        });

        console.log(`[REDO] Operation ${operation.id} redone in room ${currentRoom}`);
      }
    } catch (error) {
      console.error('[ERROR] redo:', error);
    }
  });

  /**
   * Handle cursor move event
   * Shows where other users are pointing
   */
  socket.on('cursor-move', (data) => {
    try {
      if (!currentRoom || !currentUser) return;

      const { x, y } = data;
      roomManager.updateUserCursor(currentRoom, socket.id, x, y);

      // Broadcast cursor position to other users
      socket.to(currentRoom).emit('cursor-update', {
        userId: socket.id,
        userName: currentUser.name,
        color: currentUser.color,
        x,
        y
      });
    } catch (error) {
      console.error('[ERROR] cursor-move:', error);
    }
  });

  /**
   * Handle clear canvas request
   */
  socket.on('clear-canvas', () => {
    try {
      if (!currentRoom) return;

      const drawingState = roomManager.getDrawingState(currentRoom);
      drawingState.clear();

      // Notify all users to clear their canvas
      io.to(currentRoom).emit('canvas-cleared', {
        canUndo: false,
        canRedo: false
      });

      console.log(`[CLEAR] Canvas cleared in room ${currentRoom}`);
    } catch (error) {
      console.error('[ERROR] clear-canvas:', error);
    }
  });

  /**
   * Handle disconnection
   */
  socket.on('disconnect', () => {
    try {
      if (currentRoom && currentUser) {
        // Remove user from room
        roomManager.removeUserFromRoom(currentRoom, socket.id);

        // Notify other users
        socket.to(currentRoom).emit('user-left', {
          userId: socket.id,
          userName: currentUser.name,
          users: roomManager.getRoomUsers(currentRoom)
        });

        console.log(`[DISCONNECT] ${currentUser.name} (${socket.id}) left room ${currentRoom}`);
      } else {
        console.log(`[DISCONNECT] ${socket.id} disconnected`);
      }
    } catch (error) {
      console.error('[ERROR] disconnect:', error);
    }
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║   White Board Server Started               ║
╠════════════════════════════════════════════╣
║   Port: ${PORT.toString().padEnd(36)}║
║   URL:  http://localhost:${PORT.toString().padEnd(24)}║
╚════════════════════════════════════════════╝

Server is ready to accept connections.
Open multiple browser tabs to test collaboration!
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

/**
 * WebSocket Manager
 * Handles all Socket.io communication with the server
 */

class WebSocketManager {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.currentRoom = null;
    this.currentUser = null;
    this.users = new Map(); // userId -> user object

    // Event callbacks
    this.callbacks = {
      onConnected: null,
      onDisconnected: null,
      onUserJoined: null,
      onUserLeft: null,
      onCanvasState: null,
      onDrawingUpdate: null,
      onDrawStart: null,
      onDrawMove: null,
      onDrawEnd: null,
      onOperationUndone: null,
      onOperationRedone: null,
      onCursorUpdate: null,
      onCanvasCleared: null,
      onError: null
    };
  }

  /**
   * Connect to the WebSocket server
   */
  connect() {
    // Connect to server (assumes server is on same host)
    this.socket = io({
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    this.setupSocketListeners();
  }

  /**
   * Setup Socket.io event listeners
   */
  setupSocketListeners() {
    // Connection events
    this.socket.on('connect', () => {
      console.log('[WebSocket] Connected to server');
      this.isConnected = true;

      if (this.callbacks.onConnected) {
        this.callbacks.onConnected();
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[WebSocket] Disconnected:', reason);
      this.isConnected = false;

      if (this.callbacks.onDisconnected) {
        this.callbacks.onDisconnected(reason);
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('[WebSocket] Connection error:', error);

      if (this.callbacks.onError) {
        this.callbacks.onError('Connection error: ' + error.message);
      }
    });

    // Room events
    this.socket.on('user-joined', (data) => {
      console.log('[WebSocket] User joined:', data);

      // Update users list
      if (data.users) {
        this.users.clear();
        data.users.forEach(user => {
          this.users.set(user.id, user);
        });
      }

      // If this is our join event, store current user info
      if (data.userId === this.socket.id) {
        this.currentUser = {
          id: data.userId,
          name: data.userName,
          color: data.color
        };
      }

      if (this.callbacks.onUserJoined) {
        this.callbacks.onUserJoined(data);
      }
    });

    this.socket.on('user-left', (data) => {
      console.log('[WebSocket] User left:', data);

      // Remove user from map
      this.users.delete(data.userId);

      // Update users list
      if (data.users) {
        this.users.clear();
        data.users.forEach(user => {
          this.users.set(user.id, user);
        });
      }

      if (this.callbacks.onUserLeft) {
        this.callbacks.onUserLeft(data);
      }
    });

    // Canvas state (sent when joining a room)
    this.socket.on('canvas-state', (data) => {
      console.log('[WebSocket] Received canvas state:', data.operations.length, 'operations');

      if (this.callbacks.onCanvasState) {
        this.callbacks.onCanvasState(data);
      }
    });

    // Drawing events
    this.socket.on('drawing-update', (data) => {
      if (this.callbacks.onDrawingUpdate) {
        this.callbacks.onDrawingUpdate(data);
      }
    });

    this.socket.on('draw-start', (data) => {
      if (this.callbacks.onDrawStart) {
        this.callbacks.onDrawStart(data);
      }
    });

    this.socket.on('draw-move', (data) => {
      if (this.callbacks.onDrawMove) {
        this.callbacks.onDrawMove(data);
      }
    });

    this.socket.on('draw-end', (data) => {
      if (this.callbacks.onDrawEnd) {
        this.callbacks.onDrawEnd(data);
      }
    });

    // Undo/Redo events
    this.socket.on('operation-undone', (data) => {
      console.log('[WebSocket] Operation undone:', data.operationId);

      if (this.callbacks.onOperationUndone) {
        this.callbacks.onOperationUndone(data);
      }
    });

    this.socket.on('operation-redone', (data) => {
      console.log('[WebSocket] Operation redone:', data.operation.id);

      if (this.callbacks.onOperationRedone) {
        this.callbacks.onOperationRedone(data);
      }
    });

    // Cursor events
    this.socket.on('cursor-update', (data) => {
      if (this.callbacks.onCursorUpdate) {
        this.callbacks.onCursorUpdate(data);
      }
    });

    // Canvas cleared
    this.socket.on('canvas-cleared', (data) => {
      console.log('[WebSocket] Canvas cleared');

      if (this.callbacks.onCanvasCleared) {
        this.callbacks.onCanvasCleared(data);
      }
    });

    // Error events
    this.socket.on('error', (data) => {
      console.error('[WebSocket] Server error:', data.message);

      if (this.callbacks.onError) {
        this.callbacks.onError(data.message);
      }
    });
  }

  /**
   * Join a room
   */
  joinRoom(roomId, userName) {
    if (!this.socket || !this.isConnected) {
      console.error('[WebSocket] Cannot join room: not connected');
      return;
    }

    this.currentRoom = roomId;

    this.socket.emit('join-room', {
      roomId: roomId,
      userName: userName
    });

    console.log('[WebSocket] Joining room:', roomId);
  }

  /**
   * Emit draw start event
   */
  emitDrawStart(data) {
    if (!this.socket || !this.isConnected) return;

    this.socket.emit('draw-start', data);
  }

  /**
   * Emit draw move event
   */
  emitDrawMove(data) {
    if (!this.socket || !this.isConnected) return;

    this.socket.emit('draw-move', data);
  }

  /**
   * Emit draw end event
   */
  emitDrawEnd(data) {
    if (!this.socket || !this.isConnected) return;

    this.socket.emit('draw-end', data);
  }

  /**
   * Emit undo request
   */
  emitUndo() {
    if (!this.socket || !this.isConnected) return;

    this.socket.emit('undo');
    console.log('[WebSocket] Undo requested');
  }

  /**
   * Emit redo request
   */
  emitRedo() {
    if (!this.socket || !this.isConnected) return;

    this.socket.emit('redo');
    console.log('[WebSocket] Redo requested');
  }

  /**
   * Emit cursor move event
   */
  emitCursorMove(x, y) {
    if (!this.socket || !this.isConnected) return;

    this.socket.emit('cursor-move', { x, y });
  }

  /**
   * Emit clear canvas request
   */
  emitClearCanvas() {
    if (!this.socket || !this.isConnected) return;

    this.socket.emit('clear-canvas');
    console.log('[WebSocket] Clear canvas requested');
  }

  /**
   * Register event callback
   */
  on(event, callback) {
    if (this.callbacks.hasOwnProperty('on' + event.charAt(0).toUpperCase() + event.slice(1))) {
      this.callbacks['on' + event.charAt(0).toUpperCase() + event.slice(1)] = callback;
    }
  }

  /**
   * Get current user
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Get all users
   */
  getUsers() {
    return Array.from(this.users.values());
  }

  /**
   * Check if connected
   */
  isSocketConnected() {
    return this.isConnected;
  }

  /**
   * Disconnect from server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.currentRoom = null;
      this.currentUser = null;
      this.users.clear();
    }
  }
}

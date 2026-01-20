/**
 * Main Application
 * Coordinates between Canvas and WebSocket managers
 */

class CollaborativeCanvas {
  constructor() {
    // Managers
    this.canvasManager = null;
    this.wsManager = null;

    // DOM elements
    this.elements = {
      joinModal: document.getElementById('join-modal'),
      app: document.getElementById('app'),
      usernameInput: document.getElementById('username-input'),
      roomInput: document.getElementById('room-input'),
      joinBtn: document.getElementById('join-btn'),
      canvas: document.getElementById('canvas'),
      currentRoom: document.getElementById('current-room'),
      currentUser: document.getElementById('current-user'),
      connectionStatus: document.getElementById('connection-status'),
      colorPicker: document.getElementById('color-picker'),
      widthSlider: document.getElementById('width-slider'),
      widthValue: document.getElementById('width-value'),
      undoBtn: document.getElementById('undo-btn'),
      redoBtn: document.getElementById('redo-btn'),
      clearBtn: document.getElementById('clear-btn'),
      usersList: document.getElementById('users-list'),
      userCount: document.getElementById('user-count'),
      activityFeed: document.getElementById('activity-feed'),
      cursorsContainer: document.getElementById('cursors-container')
    };

    // Cursor tracking for remote users
    this.cursors = new Map(); // userId -> cursor element

    // Activity feed
    this.activityLog = [];
    this.maxActivityItems = 20;

    this.init();
  }

  /**
   * Initialize the application
   */
  init() {
    // Setup WebSocket manager
    this.wsManager = new WebSocketManager();
    this.wsManager.connect();

    // Setup event listeners
    this.setupWebSocketCallbacks();
    this.setupUIEventListeners();
    this.setupKeyboardShortcuts();

    // Check for room in URL
    const urlParams = new URLSearchParams(window.location.search);
    const roomFromUrl = urlParams.get('room');
    if (roomFromUrl) {
      this.elements.roomInput.value = roomFromUrl;
    }

    // Focus username input
    this.elements.usernameInput.focus();
  }

  /**
   * Setup WebSocket event callbacks
   */
  setupWebSocketCallbacks() {
    // Connection status
    this.wsManager.on('connected', () => {
      this.updateConnectionStatus('connected', 'Connected');
    });

    this.wsManager.on('disconnected', (reason) => {
      this.updateConnectionStatus('disconnected', 'Disconnected');
      this.addActivity('Connection lost: ' + reason, 'error');
    });

    // User events
    this.wsManager.on('userJoined', (data) => {
      this.updateUsersList();

      if (data.userId !== this.wsManager.socket.id) {
        this.addActivity(`${data.userName} joined the room`, 'user-join');
      } else {
        this.addActivity('You joined the room', 'user-join');
      }
    });

    this.wsManager.on('userLeft', (data) => {
      this.updateUsersList();
      this.removeCursor(data.userId);
      this.addActivity(`${data.userName} left the room`, 'user-leave');
    });

    // Canvas state (when joining)
    this.wsManager.on('canvasState', (data) => {
      if (this.canvasManager) {
        this.canvasManager.redrawFromOperations(data.operations);
        this.updateUndoRedoButtons(data.canUndo, data.canRedo);
      }
    });

    // Drawing events from other users
    this.wsManager.on('drawStart', (data) => {
      if (this.canvasManager && data.userId !== this.wsManager.socket.id) {
        this.canvasManager.startRemoteStroke(data.userId, data);
      }
    });

    this.wsManager.on('drawMove', (data) => {
      if (this.canvasManager && data.userId !== this.wsManager.socket.id) {
        this.canvasManager.continueRemoteStroke(data.userId, data);
      }
    });

    this.wsManager.on('drawEnd', (data) => {
      if (this.canvasManager && data.userId !== this.wsManager.socket.id) {
        this.canvasManager.endRemoteStroke(data.userId);
      }
    });

    // Drawing update (operation added)
    this.wsManager.on('drawingUpdate', (data) => {
      this.updateUndoRedoButtons(data.canUndo, data.canRedo);
    });

    // Undo/Redo events
    this.wsManager.on('operationUndone', (data) => {
      if (this.canvasManager) {
        // Remove the last operation and redraw
        this.canvasManager.operations.pop();
        this.canvasManager.redrawFromOperations(this.canvasManager.operations);
        this.updateUndoRedoButtons(data.canUndo, data.canRedo);
        this.addActivity('Operation undone', 'undo');
      }
    });

    this.wsManager.on('operationRedone', (data) => {
      if (this.canvasManager) {
        // Add the operation back and redraw
        this.canvasManager.operations.push(data.operation);
        this.canvasManager.redrawFromOperations(this.canvasManager.operations);
        this.updateUndoRedoButtons(data.canUndo, data.canRedo);
        this.addActivity('Operation redone', 'redo');
      }
    });

    // Cursor tracking
    this.wsManager.on('cursorUpdate', (data) => {
      this.updateRemoteCursor(data);
    });

    // Canvas cleared
    this.wsManager.on('canvasCleared', (data) => {
      if (this.canvasManager) {
        this.canvasManager.operations = [];
        this.canvasManager.clear();
        this.updateUndoRedoButtons(data.canUndo, data.canRedo);
        this.addActivity('Canvas cleared', 'clear');
      }
    });

    // Errors
    this.wsManager.on('error', (message) => {
      this.addActivity('Error: ' + message, 'error');
      alert('Error: ' + message);
    });
  }

  /**
   * Setup UI event listeners
   */
  setupUIEventListeners() {
    // Join button
    this.elements.joinBtn.addEventListener('click', () => this.joinRoom());

    // Enter key in inputs
    this.elements.usernameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.joinRoom();
    });

    this.elements.roomInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.joinRoom();
    });

    // Tool buttons
    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tool = btn.dataset.tool;
        this.setTool(tool);
      });
    });

    // Color picker
    this.elements.colorPicker.addEventListener('input', (e) => {
      if (this.canvasManager) {
        this.canvasManager.setColor(e.target.value);
      }
    });

    // Width slider
    this.elements.widthSlider.addEventListener('input', (e) => {
      const width = parseInt(e.target.value);
      this.elements.widthValue.textContent = width;
      if (this.canvasManager) {
        this.canvasManager.setWidth(width);
      }
    });

    // Undo/Redo buttons
    this.elements.undoBtn.addEventListener('click', () => this.undo());
    this.elements.redoBtn.addEventListener('click', () => this.redo());

    // Clear button
    this.elements.clearBtn.addEventListener('click', () => this.clearCanvas());
  }

  /**
   * Setup keyboard shortcuts
   */
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ignore if typing in input
      if (e.target.tagName === 'INPUT') return;

      // Tool shortcuts
      if (e.key.toLowerCase() === 'b') {
        this.setTool('brush');
      } else if (e.key.toLowerCase() === 'e') {
        this.setTool('eraser');
      }

      // Undo/Redo shortcuts
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          this.undo();
        } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
          e.preventDefault();
          this.redo();
        }
      }
    });
  }

  /**
   * Join a room
   */
  joinRoom() {
    const username = this.elements.usernameInput.value.trim();
    const room = this.elements.roomInput.value.trim();

    if (!username) {
      alert('Please enter your name');
      this.elements.usernameInput.focus();
      return;
    }

    if (!room) {
      alert('Please enter a room ID');
      this.elements.roomInput.focus();
      return;
    }

    // Hide modal, show app
    this.elements.joinModal.style.display = 'none';
    this.elements.app.style.display = 'flex';

    // Update UI
    this.elements.currentRoom.textContent = room;
    this.elements.currentUser.textContent = username;

    // Initialize canvas manager
    this.canvasManager = new CanvasManager(this.elements.canvas);

    // Setup canvas callbacks
    this.canvasManager.onDrawStart = (data) => {
      this.wsManager.emitDrawStart(data);
    };

    this.canvasManager.onDrawMove = (data) => {
      this.wsManager.emitDrawMove(data);
    };

    this.canvasManager.onDrawEnd = (data) => {
      this.wsManager.emitDrawEnd(data);
    };

    this.canvasManager.onCursorMove = (x, y) => {
      this.wsManager.emitCursorMove(x, y);
    };

    this.canvasManager.lastCursorEmitTime = 0;

    // Join room via WebSocket
    this.wsManager.joinRoom(room, username);

    // Update URL
    const url = new URL(window.location);
    url.searchParams.set('room', room);
    window.history.pushState({}, '', url);
  }

  /**
   * Set drawing tool
   */
  setTool(tool) {
    // Update tool buttons
    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tool === tool);
    });

    // Update canvas manager
    if (this.canvasManager) {
      this.canvasManager.setTool(tool);
    }
  }

  /**
   * Undo last operation
   */
  undo() {
    this.wsManager.emitUndo();
  }

  /**
   * Redo last undone operation
   */
  redo() {
    this.wsManager.emitRedo();
  }

  /**
   * Clear canvas
   */
  clearCanvas() {
    if (confirm('Are you sure you want to clear the entire canvas? This will affect all users.')) {
      this.wsManager.emitClearCanvas();
    }
  }

  /**
   * Update connection status indicator
   */
  updateConnectionStatus(status, text) {
    const dot = this.elements.connectionStatus.querySelector('.status-dot');
    const statusText = this.elements.connectionStatus.querySelector('.status-text');

    dot.className = 'status-dot ' + status;
    statusText.textContent = text;
  }

  /**
   * Update undo/redo button states
   */
  updateUndoRedoButtons(canUndo, canRedo) {
    this.elements.undoBtn.disabled = !canUndo;
    this.elements.redoBtn.disabled = !canRedo;
  }

  /**
   * Update users list
   */
  updateUsersList() {
    const users = this.wsManager.getUsers();
    const currentUserId = this.wsManager.socket ? this.wsManager.socket.id : null;

    // Update count
    this.elements.userCount.textContent = users.length;

    // Clear and rebuild list
    this.elements.usersList.innerHTML = '';

    users.forEach(user => {
      const userItem = document.createElement('div');
      userItem.className = 'user-item';

      const colorIndicator = document.createElement('div');
      colorIndicator.className = 'user-color';
      colorIndicator.style.backgroundColor = user.color;

      const userName = document.createElement('span');
      userName.className = 'user-name';
      userName.textContent = user.name;

      userItem.appendChild(colorIndicator);
      userItem.appendChild(userName);

      // Add "You" indicator
      if (user.id === currentUserId) {
        const youBadge = document.createElement('span');
        youBadge.className = 'user-you';
        youBadge.textContent = 'YOU';
        userItem.appendChild(youBadge);
      }

      this.elements.usersList.appendChild(userItem);
    });
  }

  /**
   * Update remote cursor position
   */
  updateRemoteCursor(data) {
    const { userId, userName, color, x, y } = data;

    let cursor = this.cursors.get(userId);

    if (!cursor) {
      // Create cursor element
      cursor = document.createElement('div');
      cursor.className = 'user-cursor';
      cursor.innerHTML = `
        <div class="cursor-dot" style="background-color: ${color}"></div>
        <div class="cursor-label">${userName}</div>
      `;
      this.elements.cursorsContainer.appendChild(cursor);
      this.cursors.set(userId, cursor);
    }

    // Update position
    cursor.style.transform = `translate(${x}px, ${y}px)`;
  }

  /**
   * Remove cursor for disconnected user
   */
  removeCursor(userId) {
    const cursor = this.cursors.get(userId);
    if (cursor) {
      cursor.remove();
      this.cursors.delete(userId);
    }
  }

  /**
   * Add activity to feed
   */
  addActivity(message, type = 'info') {
    const time = new Date().toLocaleTimeString();

    const activityItem = document.createElement('div');
    activityItem.className = 'activity-item';
    activityItem.innerHTML = `
      <div>${message}</div>
      <div class="time">${time}</div>
    `;

    // Add to top of feed
    this.elements.activityFeed.insertBefore(activityItem, this.elements.activityFeed.firstChild);

    // Keep only last N items
    while (this.elements.activityFeed.children.length > this.maxActivityItems) {
      this.elements.activityFeed.removeChild(this.elements.activityFeed.lastChild);
    }
  }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new CollaborativeCanvas();
  });
} else {
  new CollaborativeCanvas();
}

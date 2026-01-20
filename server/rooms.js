/**
 * Room Manager
 * Handles room creation, user management, and room-specific state
 */

const DrawingState = require('./drawing-state');

class RoomManager {
  constructor() {
    // Map of roomId -> Room object
    this.rooms = new Map();

    // User colors for visual identification
    this.userColors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
      '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788'
    ];

    this.colorIndex = 0;
  }

  /**
   * Get or create a room
   * @param {string} roomId - The room identifier
   * @returns {Object} The room object
   */
  getOrCreateRoom(roomId) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, {
        id: roomId,
        users: new Map(), // userId -> user object
        drawingState: new DrawingState(),
        createdAt: Date.now()
      });
    }

    return this.rooms.get(roomId);
  }

  /**
   * Add a user to a room
   * @param {string} roomId - The room identifier
   * @param {string} userId - The user's socket ID
   * @param {string} userName - The user's display name
   * @returns {Object} The user object with assigned color
   */
  addUserToRoom(roomId, userId, userName) {
    const room = this.getOrCreateRoom(roomId);

    // Assign a unique color to the user
    const color = this.userColors[this.colorIndex % this.userColors.length];
    this.colorIndex++;

    const user = {
      id: userId,
      name: userName,
      color: color,
      joinedAt: Date.now(),
      cursor: { x: 0, y: 0 }
    };

    room.users.set(userId, user);

    return user;
  }

  /**
   * Remove a user from a room
   * @param {string} roomId - The room identifier
   * @param {string} userId - The user's socket ID
   * @returns {boolean} True if user was removed, false if not found
   */
  removeUserFromRoom(roomId, userId) {
    const room = this.rooms.get(roomId);

    if (!room) {
      return false;
    }

    const removed = room.users.delete(userId);

    // Clean up empty rooms
    if (room.users.size === 0) {
      this.rooms.delete(roomId);
    }

    return removed;
  }

  /**
   * Get all users in a room
   * @param {string} roomId - The room identifier
   * @returns {Array} Array of user objects
   */
  getRoomUsers(roomId) {
    const room = this.rooms.get(roomId);

    if (!room) {
      return [];
    }

    return Array.from(room.users.values());
  }

  /**
   * Get a specific user from a room
   * @param {string} roomId - The room identifier
   * @param {string} userId - The user's socket ID
   * @returns {Object|null} The user object or null if not found
   */
  getUser(roomId, userId) {
    const room = this.rooms.get(roomId);

    if (!room) {
      return null;
    }

    return room.users.get(userId) || null;
  }

  /**
   * Update user's cursor position
   * @param {string} roomId - The room identifier
   * @param {string} userId - The user's socket ID
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   */
  updateUserCursor(roomId, userId, x, y) {
    const user = this.getUser(roomId, userId);

    if (user) {
      user.cursor = { x, y };
    }
  }

  /**
   * Get the drawing state for a room
   * @param {string} roomId - The room identifier
   * @returns {DrawingState|null} The drawing state or null if room doesn't exist
   */
  getDrawingState(roomId) {
    const room = this.rooms.get(roomId);
    return room ? room.drawingState : null;
  }

  /**
   * Get statistics about all rooms
   * @returns {Object} Statistics object
   */
  getStats() {
    const stats = {
      totalRooms: this.rooms.size,
      totalUsers: 0,
      rooms: []
    };

    this.rooms.forEach((room, roomId) => {
      stats.totalUsers += room.users.size;
      stats.rooms.push({
        id: roomId,
        userCount: room.users.size,
        operationCount: room.drawingState.getOperationCount(),
        redoCount: room.drawingState.getRedoCount()
      });
    });

    return stats;
  }

  /**
   * Check if a room exists
   * @param {string} roomId - The room identifier
   * @returns {boolean} True if room exists
   */
  roomExists(roomId) {
    return this.rooms.has(roomId);
  }
}

module.exports = RoomManager;

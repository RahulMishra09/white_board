/**
 * Drawing State Manager
 * Manages the canvas state including operations history for undo/redo functionality
 * Uses an operation-based approach where each drawing action is stored as an operation
 */

class DrawingState {
  constructor() {
    // Ordered list of all drawing operations
    // Each operation: { id, userId, userName, type, data, timestamp }
    this.operations = [];

    // Stack for redo operations (when undo is called)
    this.redoStack = [];

    // Counter for generating unique operation IDs
    this.operationCounter = 0;
  }

  /**
   * Add a new drawing operation
   * @param {Object} operation - The drawing operation to add
   * @returns {Object} The operation with assigned ID
   */
  addOperation(operation) {
    const op = {
      id: this.operationCounter++,
      timestamp: Date.now(),
      ...operation
    };

    this.operations.push(op);

    // Clear redo stack when new operation is added
    this.redoStack = [];

    return op;
  }

  /**
   * Undo the last operation (global undo)
   * @returns {Object|null} The undone operation or null if nothing to undo
   */
  undo() {
    if (this.operations.length === 0) {
      return null;
    }

    const operation = this.operations.pop();
    this.redoStack.push(operation);

    return operation;
  }

  /**
   * Redo the last undone operation
   * @returns {Object|null} The redone operation or null if nothing to redo
   */
  redo() {
    if (this.redoStack.length === 0) {
      return null;
    }

    const operation = this.redoStack.pop();
    this.operations.push(operation);

    return operation;
  }

  /**
   * Get all current operations (for sending to newly joined users)
   * @returns {Array} Array of all operations
   */
  getAllOperations() {
    return [...this.operations];
  }

  /**
   * Get the number of operations that can be undone
   * @returns {number} Number of operations
   */
  getOperationCount() {
    return this.operations.length;
  }

  /**
   * Get the number of operations that can be redone
   * @returns {number} Number of redo operations
   */
  getRedoCount() {
    return this.redoStack.length;
  }

  /**
   * Clear all operations and redo stack
   */
  clear() {
    this.operations = [];
    this.redoStack = [];
  }

  /**
   * Get summary of current state (for debugging)
   * @returns {Object} State summary
   */
  getSummary() {
    return {
      totalOperations: this.operations.length,
      redoStackSize: this.redoStack.length,
      lastOperationId: this.operations.length > 0
        ? this.operations[this.operations.length - 1].id
        : null
    };
  }
}

module.exports = DrawingState;

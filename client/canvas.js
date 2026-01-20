/**
 * Canvas Manager
 * Handles all canvas drawing operations using raw Canvas API
 */

class CanvasManager {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: false });

    // Drawing state
    this.isDrawing = false;
    this.currentTool = 'brush';
    this.currentColor = '#000000';
    this.currentWidth = 5;

    // Current stroke data (for batching)
    this.currentStroke = null;

    // All operations history (for undo/redo)
    this.operations = [];

    // Remote users' active strokes
    this.remoteStrokes = new Map(); // userId -> stroke data

    // Event throttling
    this.lastEmitTime = 0;
    this.emitInterval = 16; // ~60fps

    // Initialize canvas
    this.setupCanvas();
    this.setupEventListeners();

    // Drawing performance optimization
    this.requestId = null;
  }

  /**
   * Setup canvas dimensions to match container
   */
  setupCanvas() {
    const container = this.canvas.parentElement;
    const rect = container.getBoundingClientRect();

    // Set canvas size (accounting for device pixel ratio for crisp rendering)
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;

    // Scale context to match device pixel ratio
    this.ctx.scale(dpr, dpr);

    // Set display size
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';

    // Store logical dimensions
    this.width = rect.width;
    this.height = rect.height;

    // Set rendering quality
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.imageSmoothingEnabled = true;
  }

  /**
   * Setup mouse/touch event listeners
   */
  setupEventListeners() {
    // Mouse events
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.handleMouseUp.bind(this));

    // Touch events for mobile
    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));

    // Window resize
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  /**
   * Get mouse/touch coordinates relative to canvas
   */
  getCoordinates(event) {
    const rect = this.canvas.getBoundingClientRect();
    const clientX = event.clientX || (event.touches && event.touches[0].clientX);
    const clientY = event.clientY || (event.touches && event.touches[0].clientY);

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }

  /**
   * Handle mouse down event
   */
  handleMouseDown(event) {
    event.preventDefault();
    this.startDrawing(event);
  }

  /**
   * Handle mouse move event
   */
  handleMouseMove(event) {
    event.preventDefault();

    if (this.isDrawing) {
      this.draw(event);
    }

    // Emit cursor position (throttled)
    if (this.onCursorMove) {
      const now = Date.now();
      if (now - this.lastCursorEmitTime > 50) { // 20fps for cursor
        const coords = this.getCoordinates(event);
        this.onCursorMove(coords.x, coords.y);
        this.lastCursorEmitTime = now;
      }
    }
  }

  /**
   * Handle mouse up event
   */
  handleMouseUp(event) {
    if (this.isDrawing) {
      this.stopDrawing(event);
    }
  }

  /**
   * Handle touch start event
   */
  handleTouchStart(event) {
    event.preventDefault();
    this.startDrawing(event);
  }

  /**
   * Handle touch move event
   */
  handleTouchMove(event) {
    event.preventDefault();
    if (this.isDrawing) {
      this.draw(event);
    }
  }

  /**
   * Handle touch end event
   */
  handleTouchEnd(event) {
    if (this.isDrawing) {
      this.stopDrawing(event);
    }
  }

  /**
   * Handle window resize
   */
  handleResize() {
    // Save current canvas state
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);

    // Resize canvas
    this.setupCanvas();

    // Restore canvas state
    this.ctx.putImageData(imageData, 0, 0);
  }

  /**
   * Start drawing
   */
  startDrawing(event) {
    this.isDrawing = true;
    const coords = this.getCoordinates(event);

    // Initialize current stroke
    this.currentStroke = {
      tool: this.currentTool,
      color: this.currentColor,
      width: this.currentWidth,
      points: [{ x: coords.x, y: coords.y, timestamp: Date.now() }]
    };

    // Begin path
    this.ctx.beginPath();
    this.ctx.moveTo(coords.x, coords.y);

    // Set drawing style
    if (this.currentTool === 'eraser') {
      this.ctx.globalCompositeOperation = 'destination-out';
      this.ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      this.ctx.globalCompositeOperation = 'source-over';
      this.ctx.strokeStyle = this.currentColor;
    }

    this.ctx.lineWidth = this.currentWidth;

    // Emit draw start event
    if (this.onDrawStart) {
      this.onDrawStart({
        tool: this.currentTool,
        color: this.currentColor,
        width: this.currentWidth
      });
    }
  }

  /**
   * Draw (handle mouse/touch move while drawing)
   */
  draw(event) {
    if (!this.isDrawing || !this.currentStroke) return;

    const coords = this.getCoordinates(event);

    // Add point to current stroke
    this.currentStroke.points.push({
      x: coords.x,
      y: coords.y,
      timestamp: Date.now()
    });

    // Draw line segment
    this.ctx.lineTo(coords.x, coords.y);
    this.ctx.stroke();

    // Emit draw move event (throttled for network efficiency)
    const now = Date.now();
    if (this.onDrawMove && now - this.lastEmitTime >= this.emitInterval) {
      // Send only new points since last emit
      const newPoints = this.currentStroke.points.slice(-5); // Send last 5 points for smoothness
      this.onDrawMove({ points: newPoints });
      this.lastEmitTime = now;
    }
  }

  /**
   * Stop drawing
   */
  stopDrawing(event) {
    if (!this.isDrawing || !this.currentStroke) return;

    this.isDrawing = false;

    // Finalize the path
    this.ctx.closePath();

    // Emit draw end event with complete stroke data
    if (this.onDrawEnd && this.currentStroke) {
      this.onDrawEnd(this.currentStroke);
    }

    // Clear current stroke
    this.currentStroke = null;
  }

  /**
   * Draw a stroke from operation data (for remote users and undo/redo)
   */
  drawStroke(strokeData) {
    if (!strokeData || !strokeData.points || strokeData.points.length === 0) {
      return;
    }

    const { tool, color, width, points } = strokeData;

    // Save current context state
    this.ctx.save();

    // Set drawing style
    if (tool === 'eraser') {
      this.ctx.globalCompositeOperation = 'destination-out';
      this.ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      this.ctx.globalCompositeOperation = 'source-over';
      this.ctx.strokeStyle = color;
    }

    this.ctx.lineWidth = width;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    // Draw the stroke
    this.ctx.beginPath();
    this.ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
      this.ctx.lineTo(points[i].x, points[i].y);
    }

    this.ctx.stroke();
    this.ctx.closePath();

    // Restore context state
    this.ctx.restore();
  }

  /**
   * Start drawing a remote user's stroke
   */
  startRemoteStroke(userId, data) {
    this.remoteStrokes.set(userId, {
      tool: data.tool,
      color: data.color,
      width: data.width,
      points: []
    });

    // Set up context for this user's stroke
    this.ctx.save();

    if (data.tool === 'eraser') {
      this.ctx.globalCompositeOperation = 'destination-out';
      this.ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      this.ctx.globalCompositeOperation = 'source-over';
      this.ctx.strokeStyle = data.color;
    }

    this.ctx.lineWidth = data.width;
    this.ctx.beginPath();
  }

  /**
   * Continue drawing a remote user's stroke
   */
  continueRemoteStroke(userId, data) {
    const stroke = this.remoteStrokes.get(userId);
    if (!stroke) return;

    const points = data.points || [];

    for (const point of points) {
      if (stroke.points.length === 0) {
        this.ctx.moveTo(point.x, point.y);
      } else {
        this.ctx.lineTo(point.x, point.y);
      }
      stroke.points.push(point);
    }

    this.ctx.stroke();
  }

  /**
   * End drawing a remote user's stroke
   */
  endRemoteStroke(userId) {
    if (this.remoteStrokes.has(userId)) {
      this.ctx.closePath();
      this.ctx.restore();
      this.remoteStrokes.delete(userId);
    }
  }

  /**
   * Redraw canvas from operations history
   */
  redrawFromOperations(operations) {
    // Clear canvas
    this.clear();

    // Store a copy of operations to avoid reference issues
    this.operations = [...operations];

    // Redraw all operations in order
    for (const operation of this.operations) {
      if (operation.type === 'stroke' && operation.data) {
        this.drawStroke(operation.data);
      }
    }
  }

  /**
   * Clear the canvas
   */
  clear() {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  /**
   * Set current tool
   */
  setTool(tool) {
    this.currentTool = tool;
  }

  /**
   * Set current color
   */
  setColor(color) {
    this.currentColor = color;
  }

  /**
   * Set current width
   */
  setWidth(width) {
    this.currentWidth = width;
  }

  /**
   * Get current canvas as data URL
   */
  toDataURL() {
    return this.canvas.toDataURL('image/png');
  }

  /**
   * Destroy canvas manager
   */
  destroy() {
    // Remove event listeners
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas.removeEventListener('mouseleave', this.handleMouseUp);
    this.canvas.removeEventListener('touchstart', this.handleTouchStart);
    this.canvas.removeEventListener('touchmove', this.handleTouchMove);
    this.canvas.removeEventListener('touchend', this.handleTouchEnd);
    window.removeEventListener('resize', this.handleResize);
  }
}

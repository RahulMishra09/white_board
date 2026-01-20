# Architecture Documentation

This document provides detailed technical documentation of the White Board application architecture, data flow, and design decisions.

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Component Details](#component-details)
4. [Data Flow](#data-flow)
5. [WebSocket Protocol](#websocket-protocol)
6. [Undo/Redo Strategy](#undoredo-strategy)
7. [Conflict Resolution](#conflict-resolution)
8. [Performance Optimizations](#performance-optimizations)
9. [Design Decisions](#design-decisions)

---

## System Overview

The White Board is a real-time, multi-user drawing application built on a client-server architecture using WebSocket communication for real-time synchronization.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Browser                        │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │CollaborativeCanvas  │CanvasManager│  │WebSocketMgr │      │
│  │(Coordinator) │  │(Drawing)     │  │(Comm)        │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
│         └──────────────────┴──────────────────┘              │
│                            │                                 │
└────────────────────────────┼─────────────────────────────────┘
                             │ WebSocket (Socket.io)
                             │
┌────────────────────────────┼─────────────────────────────────┐
│                            │         Server                   │
├────────────────────────────┼─────────────────────────────────┤
│  ┌──────────────┐  ┌───────▼──────┐  ┌──────────────┐      │
│  │Express Server│  │Socket.io     │  │RoomManager   │      │
│  │(HTTP)        │  │(WebSocket)   │  │(State)       │      │
│  └──────────────┘  └──────┬───────┘  └──────┬───────┘      │
│                            │                  │              │
│                            │         ┌────────▼────────┐     │
│                            └─────────►DrawingState     │     │
│                                      │(History)        │     │
│                                      └─────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

---

## Architecture Diagram

### Client-Side Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CollaborativeCanvas                      │
│                    (Main Coordinator)                        │
├─────────────────────────────────────────────────────────────┤
│  • Initializes managers                                      │
│  • Coordinates between Canvas and WebSocket                  │
│  • Manages UI state and user interactions                    │
│  • Handles activity feed and user list                       │
└──────────────┬─────────────────────────┬────────────────────┘
               │                         │
    ┌──────────▼──────────┐   ┌─────────▼──────────┐
    │  CanvasManager      │   │ WebSocketManager   │
    ├─────────────────────┤   ├────────────────────┤
    │• Mouse/Touch Events │   │• Socket.io Client  │
    │• Drawing Logic      │   │• Event Handling    │
    │• Rendering          │   │• Connection Mgmt   │
    │• Stroke Batching    │   │• Emit/Receive      │
    │• Remote Drawing     │   │• Reconnection      │
    └─────────────────────┘   └────────────────────┘
```

### Server-Side Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Express + Socket.io                     │
│                         (Server)                             │
├─────────────────────────────────────────────────────────────┤
│  • HTTP Server (static files)                                │
│  • WebSocket Server (Socket.io)                              │
│  • Event routing and broadcasting                            │
└──────────────┬─────────────────────────────────────────────┘
               │
    ┌──────────▼──────────┐
    │  RoomManager        │
    ├─────────────────────┤
    │• Room Creation      │
    │• User Management    │
    │• Color Assignment   │
    │• Room Isolation     │
    └──────────┬──────────┘
               │
    ┌──────────▼──────────┐
    │  DrawingState       │
    ├─────────────────────┤
    │• Operation History  │
    │• Undo/Redo Stacks   │
    │• Operation IDs      │
    │• State Management   │
    └─────────────────────┘
```

---

## Component Details

### Client Components

#### 1. CollaborativeCanvas (main.js)

**Responsibilities:**
- Application initialization and coordination
- UI event handling (buttons, inputs, modals)
- User management (list, cursors)
- Activity feed management
- Bridge between CanvasManager and WebSocketManager

**Key Methods:**
- `init()` - Initialize application
- `joinRoom()` - Join a drawing room
- `updateUsersList()` - Sync user list with UI
- `updateRemoteCursor()` - Update remote user cursor positions
- `addActivity()` - Add entries to activity feed

#### 2. CanvasManager (canvas.js)

**Responsibilities:**
- Canvas setup and configuration
- Drawing operations (brush, eraser)
- Mouse/touch event handling
- Stroke rendering and batching
- Remote stroke rendering
- Canvas state management

**Key Methods:**
- `setupCanvas()` - Initialize canvas with proper dimensions
- `startDrawing()` - Begin a stroke
- `draw()` - Continue stroke (mousemove)
- `stopDrawing()` - Complete stroke
- `drawStroke()` - Render a stroke from data
- `startRemoteStroke()` - Begin rendering remote stroke
- `continueRemoteStroke()` - Continue remote stroke
- `endRemoteStroke()` - Complete remote stroke
- `redrawFromOperations()` - Redraw entire canvas from history

**Event Callbacks:**
- `onDrawStart` - Called when drawing starts
- `onDrawMove` - Called during drawing (throttled)
- `onDrawEnd` - Called when drawing ends
- `onCursorMove` - Called on mouse movement

#### 3. WebSocketManager (websocket.js)

**Responsibilities:**
- Socket.io connection management
- Event emission to server
- Event reception from server
- Connection state tracking
- Reconnection handling

**Key Methods:**
- `connect()` - Establish WebSocket connection
- `joinRoom()` - Join a room
- `emitDrawStart()` - Send draw start event
- `emitDrawMove()` - Send draw move event
- `emitDrawEnd()` - Send draw end event
- `emitUndo()` - Request undo
- `emitRedo()` - Request redo
- `emitCursorMove()` - Send cursor position

**Event Handlers:**
- Connection events (connect, disconnect, error)
- User events (joined, left)
- Drawing events (start, move, end, update)
- Undo/redo events
- Cursor events
- Canvas cleared event

### Server Components

#### 1. Express + Socket.io Server (server.js)

**Responsibilities:**
- HTTP server for static file serving
- WebSocket server for real-time communication
- Event routing and broadcasting
- Connection lifecycle management

**Socket Events Handled:**
- `join-room` - User joins a room
- `draw-start` - User starts drawing
- `draw-move` - User continues drawing
- `draw-end` - User completes stroke
- `undo` - Undo request
- `redo` - Redo request
- `cursor-move` - Cursor position update
- `clear-canvas` - Clear canvas request
- `disconnect` - User disconnection

#### 2. RoomManager (rooms.js)

**Responsibilities:**
- Room lifecycle management
- User-to-room association
- User color assignment
- Room state tracking
- Automatic room cleanup

**Key Methods:**
- `getOrCreateRoom()` - Get existing or create new room
- `addUserToRoom()` - Add user with color assignment
- `removeUserFromRoom()` - Remove user and cleanup
- `getRoomUsers()` - Get all users in room
- `updateUserCursor()` - Update user cursor position
- `getDrawingState()` - Get room's drawing state
- `getStats()` - Get server statistics

**Data Structures:**
```javascript
Room {
  id: string,
  users: Map<userId, User>,
  drawingState: DrawingState,
  createdAt: timestamp
}

User {
  id: string,
  name: string,
  color: string,
  joinedAt: timestamp,
  cursor: { x, y }
}
```

#### 3. DrawingState (drawing-state.js)

**Responsibilities:**
- Maintain operation history
- Manage undo/redo stacks
- Generate unique operation IDs
- Provide state snapshots

**Key Methods:**
- `addOperation()` - Add new operation to history
- `undo()` - Remove last operation, move to redo stack
- `redo()` - Restore last undone operation
- `getAllOperations()` - Get full history (for new users)
- `clear()` - Clear all operations

**Data Structures:**
```javascript
Operation {
  id: number,
  userId: string,
  userName: string,
  userColor: string,
  type: 'stroke',
  data: StrokeData,
  timestamp: number
}

StrokeData {
  tool: 'brush' | 'eraser',
  color: string,
  width: number,
  points: Point[]
}

Point {
  x: number,
  y: number,
  timestamp: number
}
```

---

## Data Flow

### Drawing Flow (Happy Path)

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   User A    │         │   Server    │         │   User B    │
└──────┬──────┘         └──────┬──────┘         └──────┬──────┘
       │                       │                       │
       │ 1. mousedown          │                       │
       │──────────────────────>│                       │
       │ draw-start            │                       │
       │                       │ draw-start            │
       │                       │──────────────────────>│
       │                       │                       │
       │ 2. mousemove (x60fps) │                       │
       │──────────────────────>│                       │
       │ draw-move (throttled) │                       │
       │                       │ draw-move             │
       │                       │──────────────────────>│
       │                       │                   [renders]
       │                       │                       │
       │ 3. mouseup            │                       │
       │──────────────────────>│                       │
       │ draw-end (full stroke)│                       │
       │                       │                       │
       │                   [stores op]                 │
       │                       │                       │
       │ drawing-update        │ drawing-update        │
       │<──────────────────────┼──────────────────────>│
       │                       │                       │
```

### Undo Flow

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   User A    │         │   Server    │         │   User B    │
└──────┬──────┘         └──────┬──────┘         └──────┬──────┘
       │                       │                       │
       │ 1. Ctrl+Z             │                       │
       │──────────────────────>│                       │
       │ undo                  │                       │
       │                       │                       │
       │                   [pop op]                    │
       │                   [add to redo]               │
       │                       │                       │
       │ operation-undone      │ operation-undone      │
       │<──────────────────────┼──────────────────────>│
       │                       │                       │
       │  [redraw canvas]      │       [redraw canvas] │
       │  [from history]       │       [from history]  │
       │                       │                       │
```

### User Join Flow

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   User B    │         │   Server    │         │   User A    │
│   (new)     │         │             │         │  (existing) │
└──────┬──────┘         └──────┬──────┘         └──────┬──────┘
       │                       │                       │
       │ 1. join-room          │                       │
       │──────────────────────>│                       │
       │                       │                       │
       │                   [add user]                  │
       │                   [assign color]              │
       │                       │                       │
       │ 2. canvas-state       │                       │
       │<──────────────────────┤                       │
       │ (all operations)      │                       │
       │                       │                       │
       │  [renders full canvas]│                       │
       │                       │                       │
       │ 3. user-joined        │ 3. user-joined        │
       │<──────────────────────┼──────────────────────>│
       │                       │                       │
```

---

## WebSocket Protocol

### Client → Server Events

#### join-room
```javascript
{
  roomId: string,      // Room identifier
  userName: string     // Display name
}
```

#### draw-start
```javascript
{
  tool: 'brush' | 'eraser',
  color: string,       // Hex color
  width: number        // Stroke width in pixels
}
```

#### draw-move
```javascript
{
  points: [           // Batched points
    { x: number, y: number, timestamp: number },
    ...
  ]
}
```

#### draw-end
```javascript
{
  tool: 'brush' | 'eraser',
  color: string,
  width: number,
  points: [          // All points in stroke
    { x: number, y: number, timestamp: number },
    ...
  ]
}
```

#### undo
```javascript
// No payload
```

#### redo
```javascript
// No payload
```

#### cursor-move
```javascript
{
  x: number,         // Canvas X coordinate
  y: number          // Canvas Y coordinate
}
```

#### clear-canvas
```javascript
// No payload
```

### Server → Client Events

#### user-joined
```javascript
{
  userId: string,
  userName: string,
  color: string,      // Assigned color
  users: [           // All users in room
    { id, name, color, joinedAt, cursor },
    ...
  ]
}
```

#### user-left
```javascript
{
  userId: string,
  userName: string,
  users: [           // Remaining users
    { id, name, color, joinedAt, cursor },
    ...
  ]
}
```

#### canvas-state
```javascript
{
  operations: [      // Full operation history
    {
      id: number,
      userId: string,
      userName: string,
      userColor: string,
      type: 'stroke',
      data: StrokeData,
      timestamp: number
    },
    ...
  ],
  canUndo: boolean,
  canRedo: boolean
}
```

#### drawing-update
```javascript
{
  operation: {       // New operation added
    id: number,
    userId: string,
    userName: string,
    userColor: string,
    type: 'stroke',
    data: StrokeData,
    timestamp: number
  },
  canUndo: boolean,
  canRedo: boolean
}
```

#### operation-undone
```javascript
{
  operationId: number,
  canUndo: boolean,
  canRedo: boolean
}
```

#### operation-redone
```javascript
{
  operation: {       // Operation being redone
    id: number,
    ...
  },
  canUndo: boolean,
  canRedo: boolean
}
```

#### cursor-update
```javascript
{
  userId: string,
  userName: string,
  color: string,
  x: number,
  y: number
}
```

#### canvas-cleared
```javascript
{
  canUndo: false,
  canRedo: false
}
```

#### error
```javascript
{
  message: string
}
```

---

## Undo/Redo Strategy

### Design Choice: Global Undo/Redo

We implemented a **global undo/redo system** rather than per-user undo. This means:

**Pros:**
- Simpler to implement and reason about
- Consistent state across all clients
- Clear mental model: "undo last action"
- Prevents conflicts and race conditions
- Works well for small collaborative teams

**Cons:**
- Any user can undo any other user's work
- No protection against accidental or malicious undo
- Users can't undo just their own mistakes

### Alternative Approaches Considered

#### 1. Per-User Undo
- Each user has their own undo stack
- Only undoes their own operations
- **Problem**: Complex state synchronization, operations might depend on each other

#### 2. Operational Transformation (OT)
- Transform operations based on concurrent edits
- More sophisticated conflict resolution
- **Problem**: Very complex to implement correctly for drawing

#### 3. CRDT (Conflict-free Replicated Data Types)
- Mathematically guaranteed convergence
- Can handle concurrent operations
- **Problem**: Difficult to apply to drawing operations

### Implementation Details

#### Operation Structure
```javascript
{
  id: 123,                    // Unique sequential ID
  userId: 'socket-id',
  userName: 'Alice',
  userColor: '#FF6B6B',
  type: 'stroke',
  data: {
    tool: 'brush',
    color: '#000000',
    width: 5,
    points: [...]
  },
  timestamp: 1234567890
}
```

#### Undo Process

1. User clicks undo or presses Ctrl+Z
2. Client sends `undo` event to server (no operation ID)
3. Server:
   ```javascript
   const operation = operations.pop();  // Remove last
   redoStack.push(operation);           // Move to redo
   ```
4. Server broadcasts `operation-undone` with operation ID
5. All clients:
   ```javascript
   operations.pop();                    // Remove from local history
   redrawFromOperations(operations);    // Redraw canvas
   ```

#### Redo Process

1. User clicks redo or presses Ctrl+Y
2. Client sends `redo` event to server
3. Server:
   ```javascript
   const operation = redoStack.pop();   // Remove from redo
   operations.push(operation);          // Add back to history
   ```
4. Server broadcasts `operation-redone` with operation
5. All clients:
   ```javascript
   operations.push(operation);          // Add to local history
   redrawFromOperations(operations);    // Redraw canvas
   ```

#### Consistency Guarantees

- Server is the source of truth
- All operations have unique sequential IDs
- Undo/redo operations are processed sequentially on server
- All clients receive same operation order
- Full canvas redraw ensures visual consistency

#### Edge Cases Handled

1. **New operation clears redo stack**
   - When any user draws, redo stack is cleared
   - Prevents invalid state from redoing after new drawing

2. **Late-joining users**
   - Receive full operation history on join
   - Canvas state is fully synchronized

3. **Concurrent undo requests**
   - Processed sequentially by server
   - Each undo removes one operation

4. **Empty undo/redo stacks**
   - Server checks before popping
   - Returns null if empty
   - Clients update button states

---

## Conflict Resolution

### Drawing Conflicts

**Scenario**: Two users draw at the same time in the same area.

**Resolution**: Last-write-wins with operation ordering
- All operations are timestamped
- Server assigns sequential IDs
- Operations are applied in order received
- No visual conflicts - both strokes appear

### Undo Conflicts

**Scenario**: User A undoes while User B is drawing.

**Resolution**: Sequential processing
- Drawing completes first → becomes last operation
- Undo removes the most recent operation
- All clients stay synchronized

**Example Timeline**:
```
Time  User A Action       User B Action       Operation Stack
0     -                   -                   [Op1, Op2, Op3]
1     Clicks Undo         -                   [Op1, Op2]
2     -                   Completes stroke    [Op1, Op2, Op4]
3     Clicks Undo again   -                   [Op1, Op2]
```

### Network Partition

**Scenario**: User temporarily loses connection.

**Resolution**: Reconnection sync
- Socket.io automatically reconnects
- User rejoins room
- Receives full canvas state
- Local unsent operations are lost
- **Trade-off**: Simplicity over perfect consistency

### Race Conditions

**Scenario**: Multiple users click undo simultaneously.

**Resolution**: Server-side serialization
- Socket.io processes events sequentially
- Each undo request is handled atomically
- Operations are removed one at a time
- All clients receive updates in same order

---

## Performance Optimizations

### 1. Event Throttling

**Problem**: Mouse move events fire at very high frequency (~200-300 Hz), overwhelming network and CPU.

**Solution**: Throttle to ~60fps (16ms interval)

```javascript
const now = Date.now();
if (now - lastEmitTime >= emitInterval) {
  emit('draw-move', data);
  lastEmitTime = now;
}
```

**Impact**: 80-90% reduction in network traffic without visible quality loss.

### 2. Point Batching

**Problem**: Sending individual points creates many small packets.

**Solution**: Batch multiple points together

```javascript
// Send last 5 points instead of just 1
const newPoints = stroke.points.slice(-5);
emit('draw-move', { points: newPoints });
```

**Impact**: Reduces packet count, improves smoothness on receiving end.

### 3. Canvas Optimization

**Problem**: Canvas operations can be slow on high-DPI displays.

**Solution**: Optimize canvas context settings

```javascript
const ctx = canvas.getContext('2d', {
  willReadFrequently: false,  // Optimize for drawing
  alpha: false                 // Opaque canvas
});

ctx.imageSmoothingEnabled = true;
ctx.lineCap = 'round';
ctx.lineJoin = 'round';
```

**Impact**: Smoother drawing, especially on retina displays.

### 4. Device Pixel Ratio

**Problem**: Canvas appears blurry on high-DPI displays.

**Solution**: Scale canvas for device pixel ratio

```javascript
const dpr = window.devicePixelRatio || 1;
canvas.width = rect.width * dpr;
canvas.height = rect.height * dpr;
ctx.scale(dpr, dpr);
```

**Impact**: Crisp rendering on all displays.

### 5. Cursor Update Throttling

**Problem**: Cursor position updates don't need to be as frequent as drawing.

**Solution**: Throttle cursor updates to 20fps (50ms)

```javascript
if (now - lastCursorEmitTime > 50) {
  emit('cursor-move', { x, y });
  lastCursorEmitTime = now;
}
```

**Impact**: Reduces unnecessary network traffic.

### 6. Remote Stroke Optimization

**Problem**: Remote strokes need to render in real-time as points arrive.

**Solution**: Incremental rendering without full redraw

```javascript
startRemoteStroke(userId) {
  ctx.save();
  ctx.beginPath();
  // Set up context once
}

continueRemoteStroke(userId, points) {
  // Just draw new segments
  points.forEach(point => ctx.lineTo(point.x, point.y));
  ctx.stroke();
}
```

**Impact**: Smooth real-time rendering without flicker.

### 7. Memory Management

**Problem**: Long drawing sessions accumulate many operations.

**Solution**: (Not yet implemented) Could add:
- Operation count limits
- Periodic canvas snapshots
- Operation compression

**Future Optimization**: Implement canvas snapshots every N operations, allowing quick restore without replaying all operations.

---

## Design Decisions

### 1. Why Vanilla JavaScript?

**Decision**: Use vanilla JavaScript instead of React/Vue/Angular.

**Reasons**:
- Direct DOM manipulation is faster for canvas
- Smaller bundle size
- Simpler debugging for canvas operations
- Better control over render timing
- Learning opportunity for fundamental concepts

**Trade-offs**:
- More boilerplate code
- Manual state management
- No component reusability

### 2. Why Socket.io over Raw WebSockets?

**Decision**: Use Socket.io instead of raw WebSocket API.

**Reasons**:
- Automatic reconnection handling
- Room support built-in
- Fallback to polling if WebSocket unavailable
- Event-based API easier to work with
- Broadcast functionality

**Trade-offs**:
- Larger library size
- Additional abstraction layer
- Slight overhead

### 3. Why Global Undo instead of Per-User?

**Decision**: Implement global undo/redo instead of per-user.

**Reasons**:
- Simpler to implement correctly
- Easier to maintain consistency
- Clear mental model for users
- Prevents complex conflict resolution
- Works well for small teams

**Trade-offs**:
- Users can undo each other's work
- No individual undo history
- Might frustrate users in large teams

### 4. Why Full Canvas Redraw on Undo?

**Decision**: Redraw entire canvas from operation history.

**Reasons**:
- Guarantees consistency across clients
- Simple implementation
- Handles eraser tool correctly
- Prevents visual artifacts
- Easy to debug

**Trade-offs**:
- Slower with many operations
- More CPU intensive
- Not optimal for performance

**Alternative Considered**: Layer-based undo
- Each operation on separate canvas layer
- Show/hide layers for undo/redo
- **Problem**: Memory intensive, complex z-index management

### 5. Why In-Memory State?

**Decision**: Store all state in memory instead of database.

**Reasons**:
- Simpler implementation
- Lower latency
- No database dependency
- Suitable for demo/learning

**Trade-offs**:
- State lost on server restart
- Not suitable for production
- Doesn't scale horizontally

**Future Enhancement**: Add Redis or database for persistence.

### 6. Why No Authentication?

**Decision**: No user authentication or authorization.

**Reasons**:
- Keeps demo simple
- Faster to get started
- No account management overhead
- Good for quick collaboration

**Trade-offs**:
- Anyone can join any room
- No user accountability
- No private rooms
- No drawing history per user

**Future Enhancement**: Add optional authentication with OAuth/JWT.

### 7. Why Single Canvas Layer?

**Decision**: Use single canvas instead of multiple layers.

**Reasons**:
- Simpler rendering logic
- Less memory usage
- Easier to understand
- Sufficient for basic drawing

**Trade-offs**:
- Eraser affects all layers
- Can't rearrange drawing order
- No layer-specific operations
- Less flexible

**Alternative**: Multi-layer system like Photoshop
- **Benefit**: More powerful
- **Cost**: Much more complex

---

## Scalability Considerations

### Current Limitations

1. **In-Memory State**
   - Limited to single server instance
   - State lost on restart
   - Can't scale horizontally

2. **No Load Balancing**
   - All connections to single server
   - Limited by single server capacity

3. **No Persistence**
   - Drawings lost when server stops
   - No drawing history

### Scaling Strategy (Future)

#### Phase 1: Add Persistence
- Store operations in Redis or PostgreSQL
- Load state from database on server start
- Persist operations as they arrive

#### Phase 2: Horizontal Scaling
- Use Redis for shared state
- Socket.io Redis adapter for broadcasting
- Load balancer for connection distribution

#### Phase 3: Optimization
- Canvas snapshots to reduce replay time
- Operation compression
- Selective operation history (keep recent + snapshots)

---

## Testing Strategy

### Unit Testing (Potential)

- `DrawingState`: Test undo/redo logic
- `RoomManager`: Test user and room management
- `CanvasManager`: Test coordinate calculations

### Integration Testing

- Test drawing synchronization across clients
- Test undo/redo consistency
- Test user join/leave scenarios
- Test reconnection behavior

### Manual Testing

- Open multiple browser tabs
- Test drawing in same area
- Test rapid undo/redo
- Test network disconnection (DevTools throttling)
- Test mobile touch drawing

### Performance Testing

- Measure event frequency
- Monitor memory usage
- Test with many operations (1000+)
- Test with many users (10+)

---

## Future Improvements

### Short-term
- [ ] Canvas export (download as PNG)
- [ ] Drawing shapes (rectangle, circle, line)
- [ ] Color palette presets
- [ ] Mobile UI improvements

### Medium-term
- [ ] Database persistence
- [ ] Per-user undo option
- [ ] Canvas snapshots for performance
- [ ] Text tool
- [ ] Fill/bucket tool

### Long-term
- [ ] Layer support
- [ ] Zoom and pan
- [ ] Authentication
- [ ] Private rooms
- [ ] Drawing replay
- [ ] Horizontal scaling

---

## Conclusion

This architecture prioritizes **simplicity and clarity** over sophisticated features. It demonstrates core concepts of real-time collaboration, WebSocket communication, and canvas manipulation without unnecessary complexity.

The design makes conscious trade-offs:
- Global undo over per-user undo (simpler)
- Full redraw over layer management (consistent)
- In-memory state over persistence (faster development)
- Vanilla JS over frameworks (learning opportunity)

For production use, consider adding:
- Authentication and authorization
- Database persistence
- Rate limiting and validation
- Comprehensive error handling
- Monitoring and logging
- Horizontal scaling support

This architecture serves as a solid foundation that can be extended based on specific requirements and scale.

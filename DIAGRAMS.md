# Visual Diagrams

## System Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                        Browser Tab 1                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    User: Alice                           │  │
│  │  ┌────────────┐  ┌────────────┐  ┌─────────────┐       │  │
│  │  │   Canvas   │  │ WebSocket  │  │     UI      │       │  │
│  │  │  Manager   │←→│  Manager   │←→│  Controls   │       │  │
│  │  └────────────┘  └────────────┘  └─────────────┘       │  │
│  └──────────────────────┼───────────────────────────────────┘  │
└─────────────────────────┼──────────────────────────────────────┘
                          │
                          │ WebSocket
                          │ (Socket.io)
                          │
┌─────────────────────────▼──────────────────────────────────────┐
│                      Server (Node.js)                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Express + Socket.io Server                  │  │
│  │  ┌────────────┐  ┌────────────┐  ┌─────────────┐       │  │
│  │  │   Room     │  │  Drawing   │  │   Event     │       │  │
│  │  │  Manager   │←→│   State    │←→│ Broadcast   │       │  │
│  │  └────────────┘  └────────────┘  └─────────────┘       │  │
│  └──────────────────────┬───────────────────────────────────┘  │
└─────────────────────────┼──────────────────────────────────────┘
                          │
                          │ WebSocket
                          │ (Socket.io)
                          │
┌─────────────────────────▼──────────────────────────────────────┐
│                        Browser Tab 2                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    User: Bob                             │  │
│  │  ┌────────────┐  ┌────────────┐  ┌─────────────┐       │  │
│  │  │   Canvas   │  │ WebSocket  │  │     UI      │       │  │
│  │  │  Manager   │←→│  Manager   │←→│  Controls   │       │  │
│  │  └────────────┘  └────────────┘  └─────────────┘       │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

## Data Flow: Drawing a Stroke

```
Alice's Browser                Server                    Bob's Browser
─────────────────────────────────────────────────────────────────────

1. Mouse Down
   │
   │ draw-start
   │ {tool, color, width}
   ├────────────────────►
   │                       │
   │                       │ Broadcast
   │                       │ draw-start
   │                       ├──────────────────────►
   │                       │                        │
   │                       │                    [Show remote
   │                       │                     stroke start]
   │
2. Mouse Move (60fps)
   │
   │ draw-move
   │ {points: [...]}
   ├────────────────────►
   │                       │
   │                       │ Broadcast
   │                       │ draw-move
   │                       ├──────────────────────►
   │                       │                        │
   │                       │                    [Draw remote
   │                       │                     points]
   │
3. Mouse Up
   │
   │ draw-end
   │ {tool, color, width, points: [...]}
   ├────────────────────►
   │                       │
   │                   [Store in history]
   │                   [Assign operation ID]
   │                       │
   │  drawing-update       │  drawing-update
   │  {operation: {...}}   │  {operation: {...}}
   │◄────────────────────┼─────────────────────►
   │                       │                        │
   │                       │                    [Update
   │                       │                     history]
```

## Data Flow: Undo Operation

```
Alice's Browser                Server                    Bob's Browser
─────────────────────────────────────────────────────────────────────

1. Press Ctrl+Z
   │
   │ undo
   ├────────────────────►
   │                       │
   │                   [Pop last operation]
   │                   [Move to redo stack]
   │                       │
   │  operation-undone     │  operation-undone
   │  {operationId: 123}   │  {operationId: 123}
   │◄────────────────────┼─────────────────────►
   │                       │                        │
   [Remove operation]      │                    [Remove operation]
   [Redraw canvas]         │                    [Redraw canvas]
   [from history]          │                    [from history]
```

## Component Interaction Diagram

```
┌─────────────────────────────────────────────────────────┐
│              CollaborativeCanvas (main.js)              │
│                  Main Coordinator                       │
├─────────────────────────────────────────────────────────┤
│  • Initializes all components                           │
│  • Manages UI state                                     │
│  • Coordinates between Canvas and WebSocket             │
│  • Handles user interactions                            │
└────────┬────────────────────────────────┬───────────────┘
         │                                │
         │                                │
    ┌────▼────────────────┐        ┌─────▼──────────────┐
    │  CanvasManager      │        │ WebSocketManager   │
    │  (canvas.js)        │        │ (websocket.js)     │
    ├─────────────────────┤        ├────────────────────┤
    │                     │        │                    │
    │ Drawing Operations: │        │ Communication:     │
    │ • Mouse Events     │        │ • Socket.io        │
    │ • Touch Events     │        │ • Emit Events      │
    │ • Stroke Rendering │        │ • Receive Events   │
    │ • Canvas State     │        │ • Reconnection     │
    │                     │        │                    │
    │ Callbacks:          │        │ Events:            │
    │ • onDrawStart      │─emit──►│ • draw-start       │
    │ • onDrawMove       │─emit──►│ • draw-move        │
    │ • onDrawEnd        │─emit──►│ • draw-end         │
    │ • onCursorMove     │─emit──►│ • cursor-move      │
    │                     │        │                    │
    │                     │◄render─│ • draw-start       │
    │                     │◄render─│ • draw-move        │
    │                     │◄render─│ • draw-end         │
    │                     │◄redraw─│ • operation-undone │
    └─────────────────────┘        └────────────────────┘
```

## Server-Side Component Diagram

```
┌─────────────────────────────────────────────────────────┐
│           Express + Socket.io Server                    │
│                (server.js)                              │
├─────────────────────────────────────────────────────────┤
│  • HTTP Server (static files)                           │
│  • WebSocket Server (Socket.io)                         │
│  • Event routing and broadcasting                       │
└────────┬────────────────────────────────┬───────────────┘
         │                                │
         │                                │
    ┌────▼────────────────┐        ┌─────▼──────────────┐
    │  RoomManager        │        │  DrawingState      │
    │  (rooms.js)         │        │  (drawing-state.js)│
    ├─────────────────────┤        ├────────────────────┤
    │                     │        │                    │
    │ Manages:            │        │ Maintains:         │
    │ • Rooms             │        │ • Operations[]     │
    │ • Users             │        │ • redoStack[]      │
    │ • Colors            │        │ • operationCounter │
    │ • Cursors           │        │                    │
    │                     │        │ Operations:        │
    │ Methods:            │        │ • addOperation()   │
    │ • getOrCreateRoom() │        │ • undo()           │
    │ • addUserToRoom()   │        │ • redo()           │
    │ • removeUser()      │        │ • getAllOperations()│
    │ • getUsers()        │        │ • clear()          │
    │ • getDrawingState()─┼───────►│                    │
    │                     │        │                    │
    └─────────────────────┘        └────────────────────┘
```

## Operation History Structure

```
DrawingState {
  operations: [
    {
      id: 0,
      userId: "socket-abc123",
      userName: "Alice",
      userColor: "#FF6B6B",
      type: "stroke",
      timestamp: 1234567890,
      data: {
        tool: "brush",
        color: "#000000",
        width: 5,
        points: [
          { x: 100, y: 100, timestamp: 1234567890 },
          { x: 101, y: 102, timestamp: 1234567906 },
          { x: 103, y: 105, timestamp: 1234567922 },
          ...
        ]
      }
    },
    {
      id: 1,
      userId: "socket-def456",
      userName: "Bob",
      userColor: "#4ECDC4",
      type: "stroke",
      timestamp: 1234567900,
      data: {
        tool: "eraser",
        color: "#FFFFFF",
        width: 20,
        points: [...]
      }
    },
    ...
  ],

  redoStack: [
    // Previously undone operations
  ],

  operationCounter: 2
}
```

## User Flow: Joining a Room

```
┌──────────────┐
│ Open Browser │
│ Load App     │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Join Modal   │
│ - Enter Name │
│ - Enter Room │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Click Join   │
└──────┬───────┘
       │
       ▼
┌─────────────────────────┐
│ WebSocket Connect       │
│ - Establish connection  │
│ - Join room             │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ Server Response         │
│ - Assign user color     │
│ - Send canvas state     │
│ - Send user list        │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ Render Canvas           │
│ - Redraw all operations │
│ - Show user list        │
│ - Enable controls       │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ Ready to Draw!          │
└─────────────────────────┘
```

## Event Flow Timeline

```
Time    Alice                Server              Bob
─────────────────────────────────────────────────────────
0s      [Joins room]
        ──join-room─────►    [Add Alice]
                             [Assign color #FF6B6B]
        ◄─canvas-state──     [Empty operations]
        ◄─user-joined───     users: [Alice]

        [Renders UI]

2s
                             [Bob joins]
        ◄─user-joined───     ◄──join-room────
                             [Add Bob]
                             [Assign color #4ECDC4]
                             ──canvas-state─►
                             ──user-joined──►
                                              [Renders UI]
                                              users: [Alice, Bob]

5s      [Starts drawing]
        ──draw-start────►
                             ──draw-start───►
                                              [Shows Alice's cursor]

        [Mouse move 60fps]
        ──draw-move─────►
                             ──draw-move────►
                                              [Draws Alice's stroke]

        [Mouse up]
        ──draw-end──────►    [Store operation #0]
        ◄─drawing-update─    ──drawing-update►
                                              [Updates history]

8s                                            [Starts drawing]
                             ◄──draw-start───
        ◄─draw-start────
        [Shows Bob's cursor]
                             ◄──draw-move────
        ◄─draw-move─────
        [Draws Bob's stroke]
                             ◄──draw-end─────
                             [Store operation #1]
        ◄─drawing-update─    ──drawing-update►

10s     [Presses Ctrl+Z]
        ──undo──────────►    [Pop operation #1]
                             [Move to redo stack]
        ◄─operation-undone   ──operation-undone►
        [Redraws canvas]                       [Redraws canvas]
        [Only op #0 visible]                   [Only op #0 visible]
```

## Room Isolation

```
┌────────────────────────────────────────────────────────────┐
│                        Server                              │
│                                                            │
│  ┌─────────────────┐      ┌─────────────────┐           │
│  │   Room: "room1" │      │   Room: "room2" │           │
│  ├─────────────────┤      ├─────────────────┤           │
│  │ Users:          │      │ Users:          │           │
│  │ • Alice         │      │ • Charlie       │           │
│  │ • Bob           │      │ • Diana         │           │
│  │                 │      │                 │           │
│  │ DrawingState:   │      │ DrawingState:   │           │
│  │ operations: [   │      │ operations: [   │           │
│  │   op0, op1, ... │      │   op5, op6, ... │           │
│  │ ]               │      │ ]               │           │
│  │                 │      │                 │           │
│  │ Events:         │      │ Events:         │           │
│  │ Only broadcasted│      │ Only broadcasted│           │
│  │ within this room│      │ within this room│           │
│  └─────────────────┘      └─────────────────┘           │
│                                                            │
└────────────────────────────────────────────────────────────┘

Alice and Bob draw together in "room1"
Charlie and Diana draw together in "room2"
They cannot see each other's drawings
```

## Performance Optimization Flow

```
Mouse Move Event Stream (300 Hz)
│
│  [Every ~3ms]
│  ▼
┌─────────────────────┐
│ Event Throttling    │
│ (60 fps / 16ms)     │
└─────────┬───────────┘
          │
          │  [Every 16ms]
          ▼
┌─────────────────────┐
│ Point Batching      │
│ (Last 5 points)     │
└─────────┬───────────┘
          │
          │  [Batch of 5 points]
          ▼
┌─────────────────────┐
│ Network Transmission│
│ (Socket.io)         │
└─────────┬───────────┘
          │
          │  [To server]
          ▼
┌─────────────────────┐
│ Server Broadcast    │
│ (To all clients)    │
└─────────┬───────────┘
          │
          │  [To other clients]
          ▼
┌─────────────────────┐
│ Remote Rendering    │
│ (Incremental)       │
└─────────────────────┘

Result: 300 Hz → 60 Hz = 80% reduction in network traffic
```

## Memory Structure

```
Client Memory (per tab):
┌────────────────────────────────────┐
│ CanvasManager                      │
│ ├─ canvas: HTMLCanvasElement       │
│ ├─ ctx: CanvasRenderingContext2D   │
│ ├─ operations: Operation[]         │
│ ├─ remoteStrokes: Map<userId, ...> │
│ └─ currentStroke: StrokeData       │
│                                     │
│ WebSocketManager                    │
│ ├─ socket: Socket                  │
│ ├─ users: Map<userId, User>        │
│ └─ callbacks: {...}                │
│                                     │
│ CollaborativeCanvas                 │
│ ├─ cursors: Map<userId, Element>   │
│ └─ activityLog: Activity[]         │
└────────────────────────────────────┘

Server Memory (global):
┌────────────────────────────────────┐
│ RoomManager                        │
│ ├─ rooms: Map<roomId, Room>        │
│ │   └─ Room                        │
│ │       ├─ users: Map<userId, User>│
│ │       └─ drawingState: DrawingState
│ │           ├─ operations: []      │
│ │           └─ redoStack: []       │
│ └─ userColors: string[]            │
└────────────────────────────────────┘
```

## Error Handling Flow

```
┌──────────────────┐
│ User Action      │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Try Execute      │
└────────┬─────────┘
         │
    ┌────┴────┐
    │         │
Success     Error
    │         │
    ▼         ▼
┌────────┐  ┌─────────────────┐
│ Normal │  │ Error Handler   │
│ Flow   │  │ - Log error     │
│        │  │ - Show message  │
│        │  │ - Recover state │
└────────┘  └────────┬────────┘
                     │
                ┌────┴────┐
                │         │
            Recoverable  Fatal
                │         │
                ▼         ▼
           ┌─────────┐  ┌──────────┐
           │ Retry   │  │ Disconnect│
           │ Continue│  │ Show error│
           └─────────┘  └──────────┘
```

---

These diagrams provide a visual understanding of how the collaborative canvas application works at various levels of abstraction.

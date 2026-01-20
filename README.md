# Collaborative Drawing Canvas

A real-time collaborative drawing application built with WebSockets that allows multiple users to draw simultaneously on the same canvas with synchronized undo/redo functionality.

## Features

- **Real-time Collaboration**: Multiple users can draw on the same canvas simultaneously
- **Drawing Tools**: Brush and eraser with adjustable stroke width and colors
- **Global Undo/Redo**: Synchronized undo/redo that works across all users
- **User Management**: See who's online with unique color indicators
- **Cursor Tracking**: See where other users are pointing in real-time
- **Room System**: Multiple isolated drawing sessions
- **Smooth Performance**: Optimized event handling and rendering
- **Mobile Support**: Touch events for drawing on mobile devices

## Tech Stack

- **Frontend**: Vanilla JavaScript with raw Canvas API (no drawing libraries)
- **Backend**: Node.js + Express + Socket.io
- **Real-time Communication**: WebSocket (Socket.io)
- **Styling**: Pure CSS3

## Installation

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd collaborative-canvas
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

4. Open your browser and navigate to:
```
http://localhost:3000
```

### Development Mode

For development with auto-restart on file changes:
```bash
npm run dev
```

## Usage

### Starting a Drawing Session

1. When you open the application, you'll see a join modal
2. Enter your name (this will be displayed to other users)
3. Enter a room ID (e.g., "room1", "my-team", etc.)
4. Click "Join Room"

### Inviting Others

Share the room URL with others:
```
http://localhost:3000?room=your-room-id
```

Or simply share the room ID and have them enter it in the join modal.

### Drawing

- **Select Tool**: Click on Brush or Eraser buttons (or use keyboard shortcuts)
- **Change Color**: Click the color picker to choose a drawing color
- **Adjust Width**: Use the width slider to change stroke thickness
- **Draw**: Click and drag on the canvas to draw

### Keyboard Shortcuts

- `B` - Switch to Brush tool
- `E` - Switch to Eraser tool
- `Ctrl+Z` (or `Cmd+Z`) - Undo last operation (global)
- `Ctrl+Y` (or `Cmd+Y`) - Redo last undone operation (global)

### Collaboration Features

- **Real-time Drawing**: See other users' strokes appear as they draw
- **Cursor Tracking**: See labeled cursors showing where other users are pointing
- **User List**: View all online users in the sidebar with their assigned colors
- **Activity Feed**: Monitor join/leave events and actions
- **Global Undo/Redo**: Any user can undo the last operation, regardless of who made it

## Testing

### Testing with Multiple Users

The easiest way to test the collaborative features:

1. Start the server: `npm start`
2. Open multiple browser tabs or windows
3. Navigate to `http://localhost:3000` in each
4. Join the same room with different usernames
5. Start drawing in one tab and watch it appear in the others

### Testing Network Latency

To simulate network latency, you can use browser DevTools:

1. Open Chrome DevTools (F12)
2. Go to Network tab
3. Select "Network throttling" (e.g., "Slow 3G")
4. Test drawing performance under slow network conditions

## Architecture

The application follows a client-server architecture with WebSocket-based real-time communication.

### Project Structure

```
collaborative-canvas/
├── client/
│   ├── index.html          # Main HTML structure
│   ├── style.css           # Application styling
│   ├── canvas.js           # Canvas drawing logic (CanvasManager)
│   ├── websocket.js        # WebSocket client (WebSocketManager)
│   └── main.js             # Application coordinator
├── server/
│   ├── server.js           # Express + Socket.io server
│   ├── rooms.js            # Room management (RoomManager)
│   └── drawing-state.js    # Canvas state management (DrawingState)
├── package.json
├── README.md
└── ARCHITECTURE.md         # Detailed architecture documentation
```

### Key Components

**Client-side:**
- **CanvasManager**: Handles all canvas drawing operations, mouse/touch events, and rendering
- **WebSocketManager**: Manages Socket.io connection and all real-time communication
- **CollaborativeCanvas**: Main application class that coordinates between managers and UI

**Server-side:**
- **Express Server**: Serves static files and handles HTTP requests
- **Socket.io Server**: Manages WebSocket connections and real-time events
- **RoomManager**: Handles room creation, user management, and room isolation
- **DrawingState**: Maintains operation history for undo/redo functionality

For detailed architecture information, see [ARCHITECTURE.md](ARCHITECTURE.md).

## How It Works

### Drawing Synchronization

1. User starts drawing (mousedown/touchstart)
2. Client sends `draw-start` event to server
3. Server broadcasts to all other users in room
4. As user moves mouse, client batches points and sends `draw-move` events (~60fps)
5. Other clients receive and render the stroke in real-time
6. When user releases mouse, client sends `draw-end` with complete stroke data
7. Server stores the operation in history and broadcasts `drawing-update`

### Global Undo/Redo System

The application implements a **global undo/redo system** where any user can undo any operation:

1. Each drawing operation is assigned a unique ID and stored on the server
2. Operations are maintained in a chronological array
3. When a user clicks undo, the server removes the last operation from the array
4. The server broadcasts `operation-undone` to all clients
5. All clients redraw the entire canvas from the operation history
6. Redo works similarly but restores from a redo stack

This approach ensures consistency across all clients but means:
- **Undo is truly global** - User A can undo User B's stroke
- **Last operation is undone** - Not user-specific undo
- **Full canvas redraw** - Necessary to maintain consistency

### Room Isolation

- Each room maintains its own operation history
- Users in different rooms don't see each other's drawing
- Rooms are automatically created when the first user joins
- Rooms are automatically deleted when the last user leaves

## Performance Optimizations

- **Event Throttling**: Mouse move events are throttled to ~60fps to reduce network traffic
- **Batch Point Updates**: Multiple drawing points are batched together before sending
- **Canvas Optimization**: Uses `willReadFrequently: false` and proper context settings
- **Device Pixel Ratio**: Accounts for high-DPI displays for crisp rendering
- **Efficient Redrawing**: Only redraws when necessary
- **Connection Pooling**: Socket.io handles efficient WebSocket connection management

## Known Limitations

1. **Canvas State Persistence**: Canvas state is not persisted to a database. When the server restarts, all drawings are lost.
2. **Scalability**: Current implementation stores all state in memory. For production, consider using Redis or a database.
3. **Large Canvas History**: With many operations, full canvas redraws (on undo) may become slow. Consider implementing canvas snapshots.
4. **Network Disconnections**: While reconnection is supported, the canvas state might not sync perfectly if disconnected during active drawing.
5. **Concurrent Undo**: If multiple users click undo simultaneously, race conditions might occur. Current implementation processes requests sequentially.
6. **Mobile Performance**: Drawing on mobile devices may have slight lag compared to desktop due to touch event handling.

## Browser Support

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (iOS 13+)
- Opera: Full support

Requires:
- WebSocket support
- HTML5 Canvas API
- ES6+ JavaScript features

## Future Enhancements

Potential features to add:

- [ ] Canvas persistence (save to database)
- [ ] Export canvas as image (PNG/JPG)
- [ ] Drawing shapes (rectangle, circle, line)
- [ ] Text tool
- [ ] Fill/bucket tool
- [ ] Layers support
- [ ] Per-user undo (instead of global)
- [ ] Canvas history snapshots for performance
- [ ] Authentication and user accounts
- [ ] Private rooms with passwords
- [ ] Canvas size customization
- [ ] Zoom and pan functionality
- [ ] Performance metrics display
- [ ] Drawing replay/animation

## Troubleshooting

### Port Already in Use

If port 3000 is already in use, you can specify a different port:
```bash
PORT=3001 npm start
```

### Connection Issues

If you can't connect to the server:

1. Check that the server is running (`npm start`)
2. Verify firewall settings aren't blocking port 3000
3. Try accessing via `http://127.0.0.1:3000` instead of `localhost`
4. Check browser console for error messages

### Drawing Lag

If drawing feels laggy:

1. Try closing other browser tabs
2. Check network latency (use browser DevTools)
3. Reduce stroke width (thinner strokes render faster)
4. Check system resources (CPU/memory usage)

### Canvas Not Displaying

If the canvas doesn't appear:

1. Check browser console for JavaScript errors
2. Ensure browser supports Canvas API
3. Try a different browser
4. Hard refresh the page (Ctrl+Shift+R)

## Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues.

## License

MIT License - feel free to use this project for learning or commercial purposes.

## Credits

Built with:
- [Socket.io](https://socket.io/) - Real-time communication
- [Express](https://expressjs.com/) - Web server
- Raw Canvas API - Drawing functionality

---

**Note**: This is a learning project demonstrating real-time collaborative features. For production use, consider adding authentication, database persistence, error recovery, and comprehensive testing.

# Quick Start Guide

## Installation & Setup (30 seconds)

```bash
# 1. Navigate to project directory
cd collaborative-canvas

# 2. Install dependencies
npm install

# 3. Start the server
npm start
```

The server will start on **http://localhost:3000**

## Testing Multi-User Collaboration (1 minute)

### Option 1: Multiple Browser Tabs
1. Open **http://localhost:3000** in your browser
2. Enter your name: "Alice"
3. Enter room ID: "test-room"
4. Click "Join Room"
5. Open another tab: **http://localhost:3000**
6. Enter name: "Bob"
7. Enter same room ID: "test-room"
8. Click "Join Room"

Now you'll see:
- Both users in the users list
- Drawing in one tab appears in the other
- Cursor positions are tracked
- Undo/redo works across both tabs

### Option 2: Direct Room Link
1. Start server: `npm start`
2. Open: **http://localhost:3000?room=my-room**
3. Share this URL with others on your network

## Key Features to Test

### 1. Real-time Drawing
- Draw in one tab, watch it appear instantly in the other
- Both users can draw simultaneously

### 2. Tools
- **B key** or click Brush button
- **E key** or click Eraser button
- Change color with color picker
- Adjust stroke width with slider

### 3. Global Undo/Redo
- **Ctrl+Z** (or Cmd+Z) to undo last operation
- **Ctrl+Y** (or Cmd+Y) to redo
- Works globally - any user can undo any operation

### 4. Cursor Tracking
- Move your mouse in one tab
- See your cursor position in the other tab

### 5. User Management
- Watch users join/leave in the sidebar
- Each user gets a unique color
- Activity feed shows all events

## Project Structure

```
collaborative-canvas/
├── client/              # Frontend files
│   ├── index.html      # Main HTML
│   ├── style.css       # Styling
│   ├── canvas.js       # Canvas drawing logic
│   ├── websocket.js    # WebSocket client
│   └── main.js         # App coordinator
├── server/             # Backend files
│   ├── server.js       # Express + Socket.io server
│   ├── rooms.js        # Room management
│   └── drawing-state.js # State management
├── package.json        # Dependencies
├── README.md          # Full documentation
└── ARCHITECTURE.md    # Technical details
```

## Common Commands

```bash
# Start server (production)
npm start

# Start with auto-reload (development)
npm run dev

# Install dependencies
npm install

# Change port
PORT=3001 npm start
```

## Troubleshooting

**Server won't start?**
- Check if port 3000 is available
- Try: `PORT=3001 npm start`

**Can't connect?**
- Ensure server is running
- Check browser console for errors
- Try hard refresh (Ctrl+Shift+R)

**Drawing is laggy?**
- Close unnecessary browser tabs
- Check network connection
- Try reducing stroke width

## Next Steps

1. Read [README.md](README.md) for full feature documentation
2. Read [ARCHITECTURE.md](ARCHITECTURE.md) for technical details
3. Experiment with multiple users
4. Test on mobile devices
5. Try different network conditions

## Demo Scenarios

### Scenario 1: Team Brainstorming
- Multiple team members join same room
- Sketch ideas collaboratively
- Use undo to iterate on designs

### Scenario 2: Remote Teaching
- Teacher draws in one browser
- Students watch in real-time
- Interactive explanations

### Scenario 3: Game Design
- Sketch game levels together
- Each person uses different color
- Iterate quickly with undo/redo

## Architecture Highlights

**Client-Side:**
- `CanvasManager` - Handles drawing with raw Canvas API
- `WebSocketManager` - Manages Socket.io communication
- `CollaborativeCanvas` - Coordinates everything

**Server-Side:**
- `Express` - Serves static files
- `Socket.io` - Real-time WebSocket communication
- `RoomManager` - Manages users and rooms
- `DrawingState` - Maintains operation history

**Key Design Choice:**
- **Global Undo/Redo**: Any user can undo any operation
- **Operation-based**: Each stroke is stored as an operation
- **Server Authority**: Server is source of truth
- **Full Redraw**: Canvas redraws from history on undo

## Performance Notes

- Events throttled to ~60fps
- Points batched for network efficiency
- Cursor updates at 20fps
- Canvas optimized for high-DPI displays
- Automatic reconnection on disconnect

## Security Notes

⚠️ **This is a demo application** - not production ready!

Missing security features:
- No authentication
- No authorization
- No rate limiting
- No input validation
- Anyone can join any room

For production use, add:
- User authentication (OAuth/JWT)
- Private rooms with passwords
- Rate limiting on draw events
- Input validation
- HTTPS/WSS encryption
- Database persistence

## Contributing

This is a complete, working example. To extend it:

1. **Add shapes** - Implement rectangle, circle, line tools
2. **Add text** - Implement text drawing tool
3. **Add layers** - Multiple drawing layers
4. **Add persistence** - Save to database
5. **Add export** - Download as PNG/JPG
6. **Add auth** - User accounts and private rooms

## Resources

- [Socket.io Documentation](https://socket.io/docs/)
- [Canvas API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [Express Documentation](https://expressjs.com/)

---

**Enjoy building real-time collaborative applications!**

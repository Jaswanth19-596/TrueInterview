const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const { Server } = require('socket.io');

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);

// CORS configuration
const corsOptions = {
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

app.use(cors(corsOptions));

// Socket.io configuration
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware
app.use(express.json());

// Add headers middleware
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With, Accept'
  );
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  next();
});

// Database connection
mongoose
  .connect(
    process.env.MONGODB_URI || 'mongodb://localhost:27017/interview-monitoring'
  )
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Import routes
const authRoutes = require('./routes/auth');
const roomRoutes = require('./routes/rooms');

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);

// Store active rooms with their details
const activeRooms = new Map();

// Track rooms with pending deletion (both users disconnected)
const pendingDeletions = new Map();

// Add debug function for displaying room information
function debugRoom(roomId) {
  if (activeRooms.has(roomId)) {
    const room = activeRooms.get(roomId);
    const roomSockets = io.sockets.adapter.rooms.get(roomId);
    console.log(`[ROOM DEBUG] Room ${roomId}:`, {
      id: roomId,
      interviewer: room.interviewer,
      interviewee: room.interviewee,
      status: room.status,
      memberCount: roomSockets ? [...roomSockets].length : 0,
      members: roomSockets ? [...roomSockets] : [],
      createdAt: room.createdAt,
      lastActive: room.lastActive,
    });
  } else {
    console.log(`[ROOM DEBUG] Room ${roomId} not found`);
  }
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('create-room', () => {
    try {
      // Generate a unique room ID
      const roomId = generateRoomId();
      console.log(
        '[CREATE] Creating new room:',
        roomId,
        'for interviewer:',
        socket.id
      );

      // Store roomId on socket object
      socket.roomId = roomId;
      console.log(`[STORE] Added roomId ${roomId} to socket ${socket.id}`);

      // Create room with initial state
      activeRooms.set(roomId, {
        id: roomId,
        interviewer: socket.id,
        interviewee: null,
        interviewerConnected: true,
        intervieweeConnected: false,
        code: '',
        status: 'waiting',
        createdAt: new Date(),
        lastActive: new Date(),
      });

      // Force leave any existing rooms to prevent issues
      socket.rooms.forEach((room) => {
        if (room !== socket.id) {
          console.log(
            `[LEAVE] Forcing interviewer ${socket.id} to leave room ${room}`
          );
          socket.leave(room);
        }
      });

      // Join the new room
      socket.join(roomId);
      console.log(`[JOIN] Interviewer ${socket.id} joined room ${roomId}`);

      // Debug room state
      debugRoom(roomId);

      // Emit the room ID back to the client - CRITICAL for URL update
      socket.emit('room-created', { roomId });
      console.log(`[EMIT] Sent room-created event with roomId: ${roomId}`);
    } catch (error) {
      console.error(`[ERROR] Failed to create room:`, error);
      socket.emit('room-creation-failed', {
        message: 'Failed to create room due to server error',
      });
    }
  });

  socket.on('join-room', (roomId) => {
    console.log('Attempting to join room:', roomId, 'by socket:', socket.id);

    // Store roomId on socket object
    socket.roomId = roomId;
    console.log(`[STORE] Added roomId ${roomId} to socket ${socket.id}`);

    // Auto-create room if it doesn't exist
    let room = activeRooms.get(roomId);
    if (!room) {
      console.log(`[AUTO-CREATE] Room ${roomId} not found, creating it`);
      room = {
        id: roomId,
        interviewer: null, // Will be set when interviewer connects
        interviewee: socket.id,
        interviewerConnected: false,
        intervieweeConnected: true,
        code: '',
        status: 'waiting',
        createdAt: new Date(),
        lastActive: new Date(),
      };
      activeRooms.set(roomId, room);
    } else if (
      room.interviewee &&
      room.interviewee !== socket.id &&
      room.intervieweeConnected
    ) {
      console.log('Room is full:', roomId);
      socket.emit('room-full');
      return;
    } else {
      // Cancel any pending deletion timer
      if (pendingDeletions.has(roomId)) {
        console.log(
          `[RECONNECT] Cancelling pending deletion for room ${roomId}`
        );
        clearTimeout(pendingDeletions.get(roomId));
        pendingDeletions.delete(roomId);
      }

      // Case where interviewee reconnects or a new interviewee joins
      room.interviewee = socket.id;
      room.intervieweeConnected = true;
      room.status = 'active';
      room.lastActive = new Date();
      activeRooms.set(roomId, room);
    }

    // Force leave any existing rooms to prevent issues
    socket.rooms.forEach((existingRoom) => {
      if (existingRoom !== socket.id) {
        console.log(
          `[LEAVE] Forcing interviewee ${socket.id} to leave room ${existingRoom}`
        );
        socket.leave(existingRoom);
      }
    });

    socket.join(roomId);
    console.log(`[JOIN] Interviewee ${socket.id} joined room ${roomId}`);

    // Debug room state
    debugRoom(roomId);

    io.to(roomId).emit('interviewee-joined', { roomId });
    socket.emit('start-session', { roomId });
  });

  socket.on('join-session', ({ roomId, role }) => {
    try {
      console.log('Joining session:', { roomId, role, socketId: socket.id });

      // Validate required parameters
      if (!roomId) {
        console.log('[ERROR] Missing roomId in join-session request');
        socket.emit('error', { message: 'Room ID is required' });
        return;
      }

      // Store roomId on socket object for later use
      socket.roomId = roomId;
      console.log(`[STORE] Added roomId ${roomId} to socket ${socket.id}`);

      // Auto-create room if needed
      let room = activeRooms.get(roomId);

      if (!room) {
        console.log(`[AUTO-CREATE] Creating room ${roomId} for direct join`);
        room = {
          id: roomId,
          interviewer: role === 'interviewer' ? socket.id : null,
          interviewee: role === 'interviewee' ? socket.id : null,
          interviewerConnected: role === 'interviewer',
          intervieweeConnected: role === 'interviewee',
          code: '',
          status: role === 'interviewee' ? 'active' : 'waiting',
          createdAt: new Date(),
          lastActive: new Date(),
        };
        activeRooms.set(roomId, room);
      } else {
        // Cancel any pending deletion timer
        if (pendingDeletions.has(roomId)) {
          console.log(
            `[RECONNECT] Cancelling pending deletion for room ${roomId}`
          );
          clearTimeout(pendingDeletions.get(roomId));
          pendingDeletions.delete(roomId);
        }

        // Update room's last active timestamp
        room.lastActive = new Date();

        // Update role-specific information
        if (role === 'interviewer') {
          // Handle reconnection case - recognize if this is the same interviewer reconnecting
          if (room.interviewer && room.interviewer !== socket.id) {
            // Allow reconnection if this matches the stored interviewer ID (which would happen after page reload)
            console.log(
              `[INTERVIEWER CHANGE] Updating interviewer from ${room.interviewer} to ${socket.id} in room ${roomId}`
            );
          }

          // Update interviewer socket ID
          room.interviewer = socket.id;
          room.interviewerConnected = true;
          activeRooms.set(roomId, room);
          console.log(
            `[UPDATE] Set interviewer for room ${roomId} to ${socket.id}`
          );

          // Notify interviewee that interviewer has reconnected
          if (room.interviewee) {
            io.to(room.interviewee).emit('interviewer-reconnected');
          }
        } else if (role === 'interviewee') {
          // Handle reconnection case for interviewee
          if (room.interviewee && room.interviewee !== socket.id) {
            console.log(
              `[INTERVIEWEE CHANGE] Updating interviewee from ${room.interviewee} to ${socket.id} in room ${roomId}`
            );
          }

          // Update interviewee socket ID
          room.interviewee = socket.id;
          room.intervieweeConnected = true;
          room.status = 'active';
          activeRooms.set(roomId, room);
          console.log(
            `[UPDATE] Set interviewee for room ${roomId} to ${socket.id}`
          );

          // Notify the interviewer if present
          if (room.interviewer) {
            io.to(room.interviewer).emit('interviewee-joined', { roomId });
          }
        }
      }

      // Force socket to leave any existing rooms
      socket.rooms.forEach((existingRoom) => {
        if (existingRoom !== socket.id && existingRoom !== roomId) {
          console.log(
            `[LEAVE] Forcing ${socket.id} to leave room ${existingRoom}`
          );
          socket.leave(existingRoom);
        }
      });

      // Ensure the socket joins the room
      socket.join(roomId);
      console.log(`[JOIN] ${role} ${socket.id} joined room ${roomId}`);

      // Debug room state
      debugRoom(roomId);

      // Send any existing metrics immediately after joining
      if (room.latestMetrics && role === 'interviewer') {
        console.log(`[INITIAL METRICS] Sending to interviewer ${socket.id}`);
        socket.emit('processUpdate', {
          roomId,
          data: room.latestMetrics,
        });

        // Also send via the interviewers broadcast channel for consistency
        io.to(socket.id).emit('processUpdate-interviewers', {
          roomId,
          data: room.latestMetrics,
        });
      }

      socket.emit('session-joined', {
        roomId,
        code: room.code,
        status: room.status,
        hasInterviewee: !!room.interviewee,
      });
    } catch (error) {
      console.error(`[ERROR] Failed to join session:`, error);
      socket.emit('error', {
        message: 'Failed to join session due to server error',
      });
    }
  });

  socket.on('code-update', ({ roomId, code, activeEditor }) => {
    console.log('Code update received:', { roomId, activeEditor });
    const room = activeRooms.get(roomId);

    if (room) {
      room.code = code;
      activeRooms.set(roomId, room);
      // Broadcast the code update along with who is editing
      socket.to(roomId).emit('code-update', { code, activeEditor });
    }
  });

  // Handle active editor updates
  socket.on('active-editor-update', ({ roomId, activeEditor }) => {
    console.log('Active editor update received:', { roomId, activeEditor });
    if (roomId) {
      // Broadcast to everyone in the room except the sender
      socket.to(roomId).emit('active-editor-update', { activeEditor });
    }
  });

  socket.on('end-session', ({ roomId }) => {
    console.log('Ending session:', roomId);
    const room = activeRooms.get(roomId);

    if (room && room.interviewer === socket.id) {
      // Clear any pending deletion timers
      if (pendingDeletions.has(roomId)) {
        clearTimeout(pendingDeletions.get(roomId));
        pendingDeletions.delete(roomId);
      }

      // Notify all participants
      io.to(roomId).emit('room-ended', {
        reason: 'Interview ended by interviewer',
      });

      // Delete the room immediately - this is intentional termination
      activeRooms.delete(roomId);
      console.log(
        `[END] Room ${roomId} has been ended by interviewer ${socket.id}`
      );
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);

    // Find rooms where this socket was a participant
    for (const [roomId, room] of activeRooms.entries()) {
      if (room.interviewer === socket.id || room.interviewee === socket.id) {
        // Update the room's lastActive timestamp
        room.lastActive = new Date();

        // Check if this was the interviewer
        if (room.interviewer === socket.id) {
          console.log(
            `[DISCONNECT] Interviewer ${socket.id} disconnected from room ${roomId}`
          );

          // Mark the interviewer as disconnected but preserve their ID for reconnection
          room.interviewerConnected = false;

          // Only notify others in the room
          socket.to(roomId).emit('interviewer-disconnected');
        }

        // Check if this was the interviewee
        if (room.interviewee === socket.id) {
          console.log(
            `[DISCONNECT] Interviewee ${socket.id} disconnected from room ${roomId}`
          );

          // Mark the interviewee as disconnected but preserve their ID for reconnection
          room.intervieweeConnected = false;

          // Notify others in the room
          socket.to(roomId).emit('interviewee-left');
        }

        // Update the room state
        activeRooms.set(roomId, room);

        // If both participants are now disconnected, start a deletion timer
        if (!room.interviewerConnected && !room.intervieweeConnected) {
          console.log(
            `[PENDING] Room ${roomId} has no connected participants, starting 5-minute grace period`
          );

          // Cancel any existing timer
          if (pendingDeletions.has(roomId)) {
            clearTimeout(pendingDeletions.get(roomId));
          }

          // Set a 5-minute timer to delete the room if no one reconnects
          const timer = setTimeout(() => {
            console.log(
              `[CLEANUP] Room ${roomId} grace period expired, deleting room`
            );
            activeRooms.delete(roomId);
            pendingDeletions.delete(roomId);
          }, 5 * 60 * 1000); // 5 minutes

          // Store the timer so we can cancel it if someone reconnects
          pendingDeletions.set(roomId, timer);
        }

        debugRoom(roomId);
      }
    }
  });

  // Handle chat messages
  socket.on('chat-message', (data) => {
    const { roomId, message } = data;
    if (activeRooms.has(roomId)) {
      io.to(roomId).emit('chat-message', {
        userId: socket.id,
        message,
        timestamp: new Date(),
      });
    }
  });

  // Handle metrics request
  socket.on('request-metrics', (data) => {
    try {
      const { roomId, role } = data;
      console.log(
        `[METRICS REQUEST] For room: ${roomId} from socket: ${socket.id}, role: ${role}`
      );

      // Skip invalid room IDs
      if (!roomId || roomId.trim() === '') {
        console.log(`[ERROR] Invalid roomId in metrics request: ${roomId}`);
        socket.emit('processUpdate', {
          roomId: roomId || 'invalid',
          data: { message: 'Invalid room ID provided' },
        });
        return;
      }

      // Skip if the request is from an interviewee
      if (role === 'interviewee') {
        console.log(
          `[SKIP] Ignoring metrics request from interviewee ${socket.id}`
        );
        socket.emit('processUpdate', {
          roomId,
          data: {
            message: 'System metrics are only available to interviewers',
          },
        });
        return;
      }

      // Auto-create the room if it doesn't exist
      const room = getOrCreateRoom(roomId, socket);

      // Verify socket is authorized for this room and is an interviewer
      let isAuthorized = false;
      if (role === 'interviewer') {
        // Auto-update interviewer socket ID
        if (room.interviewer !== socket.id) {
          console.log(
            `[UPDATE] Updating interviewer socket from ${room.interviewer} to ${socket.id}`
          );
          room.interviewer = socket.id;
          activeRooms.set(roomId, room);
        }
        isAuthorized = true;
      }

      console.log(
        `[AUTH CHECK] Socket ${socket.id} as ${role} is ${
          isAuthorized ? 'authorized' : 'unauthorized'
        }`
      );

      // Make sure socket is in the room
      if (!socket.rooms.has(roomId)) {
        console.log(`[JOIN] Adding socket ${socket.id} to room ${roomId}`);
        socket.join(roomId);
      }

      if (!isAuthorized) {
        console.log(`[WARNING] Unauthorized metrics request from ${socket.id}`);
        socket.emit('processUpdate', {
          roomId,
          data: {
            message: 'Unauthorized to request metrics for this room',
          },
        });
        return;
      }

      if (room.latestMetrics) {
        // Format metrics data for consistency
        let formattedMetrics = room.latestMetrics;

        // Detailed logging of what we're sending
        if (Array.isArray(formattedMetrics)) {
          console.log(
            `[METRICS DATA] Sending array with ${formattedMetrics.length} items`
          );
        } else if (typeof formattedMetrics === 'object') {
          console.log(
            `[METRICS DATA] Sending object with keys: ${Object.keys(
              formattedMetrics
            ).join(', ')}`
          );
        } else {
          console.log(
            `[METRICS DATA] Sending data of type: ${typeof formattedMetrics}`
          );
        }

        // Send the cached metrics back to the interviewer only
        console.log(
          `[SENDING] Cached metrics for room: ${roomId} to interviewer`
        );

        try {
          // Direct socket reference
          const requestingSocket = io.sockets.sockets.get(socket.id);
          if (requestingSocket) {
            requestingSocket.emit('processUpdate', {
              roomId,
              data: formattedMetrics,
            });
            console.log(
              `[DIRECT EMIT] Sent metrics directly to interviewer socket ${socket.id}`
            );
          } else {
            console.log(
              `[FALLBACK] Socket object not found, using socket.emit`
            );
            socket.emit('processUpdate', { roomId, data: formattedMetrics });
          }

          // Last resort - broadcast to interviewers only channel
          io.emit('processUpdate-interviewers', {
            roomId,
            data: formattedMetrics,
          });
        } catch (error) {
          console.error(
            `[ERROR] Failed to send metrics in request-metrics:`,
            error
          );
        }
      } else {
        // Inform client that no metrics are available yet
        console.log(`[INFO] No metrics available for room: ${roomId}`);
        socket.emit('processUpdate', {
          roomId,
          data: {
            message: 'No metrics available yet. Waiting for first update...',
          },
        });
      }
    } catch (error) {
      console.error(`[ERROR] Failed to handle metrics request:`, error);
      socket.emit('error', {
        message: 'Failed to handle metrics request due to server error',
      });
    }
  });

  // Handle metrics data from the interviewee
  socket.on('handle-metrics', (payload) => {
    try {
      // Get roomId from socket or from payload
      let roomId = socket.roomId;
      let metricsData;

      // Check if the payload is in the new format with roomId and data properties
      if (payload && typeof payload === 'object' && payload.roomId) {
        roomId = payload.roomId;
        metricsData = payload.data;
        // Store room ID on socket for future use
        if (socket.roomId !== roomId) {
          socket.roomId = roomId;
          console.log(
            `[UPDATE] Setting socket.roomId to ${roomId} from payload`
          );
        }
      } else {
        // Legacy format - entire payload is the metrics data
        metricsData = payload;
      }

      console.log(
        `Received metrics from ${socket.id} in room ${roomId}:`,
        typeof metricsData
      );

      if (!roomId) {
        console.error('Socket has no roomId when sending metrics');
        return;
      }

      const room = activeRooms.get(roomId);
      if (!room) {
        console.error(`Room ${roomId} not found for metrics update`);
        return;
      }

      // Format metrics data for better display
      let formattedMetrics = [];

      try {
        if (Array.isArray(metricsData) && metricsData.length > 0) {
          // Format process data from array
          formattedMetrics = metricsData.map((process) => ({
            processName: process.processName || 'Unknown Process',
            cpu:
              typeof process.cpu === 'number'
                ? Number(process.cpu.toFixed(1))
                : 0,
            memory: typeof process.memory === 'number' ? process.memory : 0,
            memoryMB:
              typeof process.memory === 'number'
                ? Number((process.memory / (1024 * 1024)).toFixed(1))
                : 0,
          }));
        } else if (typeof metricsData === 'object' && metricsData !== null) {
          // Try to extract process information from object
          const processes = metricsData.processes || [];
          formattedMetrics = Array.isArray(processes)
            ? processes.map((p) => ({
                processName: p.name || p.processName || 'Unknown',
                cpu: typeof p.cpu === 'number' ? Number(p.cpu.toFixed(1)) : 0,
                memory: typeof p.memory === 'number' ? p.memory : 0,
                memoryMB:
                  typeof p.memory === 'number'
                    ? Number((p.memory / (1024 * 1024)).toFixed(1))
                    : 0,
              }))
            : [];
        }

        // Filter out entries without a process name
        formattedMetrics = formattedMetrics.filter((p) => p.processName);

        // Sort by CPU usage (highest first)
        formattedMetrics.sort((a, b) => b.cpu - a.cpu);

        // Limit to 15 processes to avoid overwhelming the UI
        formattedMetrics = formattedMetrics.slice(0, 15);

        console.log(
          `Formatted ${formattedMetrics.length} processes for room ${roomId}`
        );
      } catch (err) {
        console.error('Error formatting metrics:', err);
        formattedMetrics = [];
      }

      // Store the formatted metrics
      room.latestMetrics = formattedMetrics;

      // Only send to interviewer sockets in the room
      if (room.interviewer) {
        io.to(room.interviewer).emit('processUpdate-interviewers', {
          roomId,
          data: formattedMetrics,
        });
        console.log(`Sent metrics to interviewer ${room.interviewer}`);
      } else {
        console.log('No interviewer available to receive metrics');
      }
    } catch (err) {
      console.error('Error handling metrics:', err);
    }
  });
});

function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Interview Room Server' });
});

app.post('/send_processes/:roomId', (req, res) => {
  const roomId = req.params.roomId;
  const data = req.body;

  console.log(`[RECEIVED] Process data for room ${roomId}`);

  // Log a sample of the data for debugging
  if (Array.isArray(data)) {
    console.log(`[DATA SAMPLE] Received ${data.length} processes:`);
    // Show first 3 processes or all if less than 3
    const sample = data.slice(0, 3);
    console.log(JSON.stringify(sample, null, 2));
    if (data.length > 3) {
      console.log(`... and ${data.length - 3} more processes`);
    }
  } else if (data && typeof data === 'object') {
    console.log(
      `[DATA] Received object with keys: ${Object.keys(data).join(', ')}`
    );
  } else {
    console.log(`[DATA] Received data of type: ${typeof data}`);
  }

  // Ensure data is properly formatted for the frontend
  let formattedData = data;

  // Check if the data is usable
  if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
    console.log(`[WARNING] Received empty data for room ${roomId}`);
    formattedData = { error: 'Received empty data' };
  }

  // Validate if data is an array
  if (Array.isArray(data)) {
    // Ensure each element in the array has processName for display
    formattedData = data.map((process, index) => {
      if (!process.processName) {
        process.processName = `Process_${index}`;
      }
      return process;
    });
    console.log(
      `[TRANSFORM] Formatted array data with ${formattedData.length} processes`
    );
  }

  // Auto-create room if it doesn't exist (using null as socket since this is from API)
  if (!activeRooms.has(roomId)) {
    console.log(`[AUTO-CREATE] Creating room ${roomId} from API request`);
    activeRooms.set(roomId, {
      id: roomId,
      interviewer: null,
      interviewee: null,
      code: '',
      status: 'waiting',
      createdAt: new Date(),
    });
  }

  // Store the latest metrics in the room
  const room = activeRooms.get(roomId);
  room.latestMetrics = formattedData;
  activeRooms.set(roomId, room);

  // Debug room members
  const roomSockets = io.sockets.adapter.rooms.get(roomId);
  console.log(
    `[ROOM INFO] Room ${roomId} has members:`,
    roomSockets ? [...roomSockets].length : 0,
    'Interviewer:',
    room.interviewer,
    'Interviewee:',
    room.interviewee
  );

  // List all sockets in the room for debugging
  if (roomSockets) {
    console.log(`[SOCKET LIST] Sockets in room ${roomId}:`, [...roomSockets]);
  }

  try {
    // IMPORTANT: Only send metrics to the interviewer, not to the interviewee
    // Do NOT use room broadcast since it would send to both

    // Direct send to interviewer only
    if (room.interviewer) {
      const interviewerSocket = io.sockets.sockets.get(room.interviewer);
      if (interviewerSocket) {
        console.log(
          `[SENDING] Metrics payload to interviewer with keys:`,
          Array.isArray(formattedData)
            ? `Array with ${formattedData.length} items`
            : Object.keys(formattedData)
        );
        interviewerSocket.emit('processUpdate', {
          roomId,
          data: formattedData,
        });
        console.log(
          `[DIRECT] Metrics sent to interviewer ${room.interviewer} (connected)`
        );
      } else {
        console.log(
          `[ERROR] Interviewer socket ${room.interviewer} not found or disconnected`
        );
        // Try broadcast to interviewer ID anyway as fallback
        io.to(room.interviewer).emit('processUpdate', {
          roomId,
          data: formattedData,
        });
      }
    } else {
      console.log(`[WARNING] No interviewer assigned to room ${roomId}`);
    }

    // Skip sending to interviewee as per requirement
    console.log(`[SKIP] Not sending metrics to interviewee as requested`);

    // Last resort: broadcast only to interviewers using a special channel
    io.emit('processUpdate-interviewers', { roomId, data: formattedData });
    console.log(
      `[BROADCAST-INTERVIEWERS] Metrics sent only to interviewers as last resort`
    );
  } catch (error) {
    console.error(`[ERROR] Failed to send metrics:`, error);
  }

  res
    .status(200)
    .json({ message: 'Data received and sent to interviewer only' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Find or create a room for a given roomId
function getOrCreateRoom(roomId, socket) {
  if (roomId && !activeRooms.has(roomId)) {
    console.log(
      `[CREATE] Creating missing room: ${roomId} for socket: ${socket.id}`
    );
    activeRooms.set(roomId, {
      id: roomId,
      interviewer: socket.id, // Assume requesting socket is interviewer
      interviewee: null,
      code: '',
      status: 'waiting',
      createdAt: new Date(),
    });
  }
  return activeRooms.get(roomId);
}

// Clean up old rooms periodically
function cleanupInactiveRooms() {
  const now = new Date();
  let count = 0;

  for (const [roomId, room] of activeRooms.entries()) {
    // If room is older than 24 hours, clean it up
    if (room.createdAt && now - room.createdAt > 24 * 60 * 60 * 1000) {
      // If there's a pending deletion timer, clear it
      if (pendingDeletions.has(roomId)) {
        clearTimeout(pendingDeletions.get(roomId));
        pendingDeletions.delete(roomId);
      }

      activeRooms.delete(roomId);
      count++;
    }
  }

  if (count > 0) {
    console.log(
      `[CLEANUP] Removed ${count} inactive rooms. Active rooms: ${activeRooms.size}`
    );
  }
}

// Set up room cleanup interval
const cleanupInterval = setInterval(cleanupInactiveRooms, 3600000); // Clean every hour

// Clean up resources on server shutdown
process.on('SIGINT', () => {
  console.log('Server shutting down...');
  clearInterval(cleanupInterval);

  // Close all socket connections
  io.close();

  console.log('Exiting process');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Server terminating...');
  clearInterval(cleanupInterval);

  // Close all socket connections
  io.close();

  console.log('Exiting process');
  process.exit(0);
});

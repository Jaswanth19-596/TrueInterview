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

// Utility functions
function logWithPrefix(prefix, message, data = '') {}

function debugRoom(roomId) {
  if (activeRooms.has(roomId)) {
    const room = activeRooms.get(roomId);
    const roomSockets = io.sockets.adapter.rooms.get(roomId);
    logWithPrefix('ROOM DEBUG', `Room ${roomId}:`, {
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
    logWithPrefix('ROOM DEBUG', `Room ${roomId} not found`);
  }
}

function ensureSocketInRoom(socket, roomId) {
  // Force socket to leave any existing rooms except its own ID and the target room
  socket.rooms.forEach((existingRoom) => {
    if (existingRoom !== socket.id && existingRoom !== roomId) {
      logWithPrefix(
        'LEAVE',
        `Forcing ${socket.id} to leave room ${existingRoom}`
      );
      socket.leave(existingRoom);
    }
  });

  // Ensure the socket joins the room if not already in it
  if (!socket.rooms.has(roomId)) {
    socket.join(roomId);
    logWithPrefix('JOIN', `Socket ${socket.id} joined room ${roomId}`);
  }
}

function handlePendingDeletion(roomId, cancel = false) {
  if (cancel && pendingDeletions.has(roomId)) {
    logWithPrefix(
      'RECONNECT',
      `Cancelling pending deletion for room ${roomId}`
    );
    clearTimeout(pendingDeletions.get(roomId));
    pendingDeletions.delete(roomId);
    return;
  }

  if (!cancel) {
    // Cancel any existing timer first
    if (pendingDeletions.has(roomId)) {
      clearTimeout(pendingDeletions.get(roomId));
    }

    logWithPrefix(
      'PENDING',
      `Room ${roomId} has no connected participants, starting 5-minute grace period`
    );

    // Set a 5-minute timer to delete the room if no one reconnects
    const timer = setTimeout(() => {
      logWithPrefix(
        'CLEANUP',
        `Room ${roomId} grace period expired, deleting room`
      );
      activeRooms.delete(roomId);
      pendingDeletions.delete(roomId);
    }, 5 * 60 * 1000); // 5 minutes

    // Store the timer so we can cancel it if someone reconnects
    pendingDeletions.set(roomId, timer);
  }
}

function sendMetricsToInterviewer(roomId, metrics) {
  const room = activeRooms.get(roomId);
  if (!room || !room.interviewer) {
    logWithPrefix('WARNING', `No interviewer available for room ${roomId}`);
    return;
  }

  try {
    // Direct socket reference
    const interviewerSocket = io.sockets.sockets.get(room.interviewer);
    if (interviewerSocket) {
      interviewerSocket.emit('processUpdate', {
        roomId,
        data: metrics,
      });

      interviewerSocket.emit('processUpdate-interviewers', {
        roomId,
        data: metrics,
      });

      logWithPrefix(
        'DIRECT',
        `Metrics sent to interviewer ${room.interviewer}`
      );
    } else {
      logWithPrefix(
        'FALLBACK',
        `Interviewer socket not found, using broadcast`
      );
      io.to(room.interviewer).emit('processUpdate', { roomId, data: metrics });
      io.to(room.interviewer).emit('processUpdate-interviewers', {
        roomId,
        data: metrics,
      });
    }
  } catch (error) {
    console.error('[ERROR] Failed to send metrics:', error);
  }
}

function clearRoomMetrics(roomId) {
  const room = activeRooms.get(roomId);
  if (room && room.latestMetrics) {
    logWithPrefix('METRICS', `Clearing metrics data for room ${roomId}`);
    room.latestMetrics = null;
    activeRooms.set(roomId, room);
  }
}

function notifyMonitoringStatus(roomId, isMonitoring, message) {
  const room = activeRooms.get(roomId);
  if (!room || !room.interviewer) return;

  if (!isMonitoring) {
    io.to(room.interviewer).emit('monitoring-stopped', {
      roomId,
      message: message || 'Monitoring stopped',
    });
    logWithPrefix(
      'MONITORING',
      `Notified interviewer that monitoring stopped: ${message}`
    );
  }
}

function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function generateSessionKey() {
  // Generate a 6-digit numeric code that's easy to communicate verbally
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function getOrCreateRoom(roomId) {
  return activeRooms.get(roomId);
}

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
    logWithPrefix(
      'CLEANUP',
      `Removed ${count} inactive rooms. Active rooms: ${activeRooms.size}`
    );
  }
}

function formatMetricsData(metricsData) {
  let formattedMetrics = [];

  try {
    if (typeof metricsData === 'object' && metricsData !== null) {
      // Handle the new app status dictionary format
      formattedMetrics = Object.entries(metricsData).map(
        ([appName, isRunning]) => ({
          processName: appName,
          isRunning: isRunning,
        })
      );
    }

    return formattedMetrics;
  } catch (err) {
    console.error('Error formatting metrics:', err);
    return [];
  }
}

io.on('connection', (socket) => {
  logWithPrefix('CONNECT', `User connected: ${socket.id}`);

  socket.on('create-room', () => {
    try {
      // Generate a unique room ID and session key
      const roomId = generateRoomId();
      const sessionKey = generateSessionKey();

      logWithPrefix(
        'CREATE',
        `Creating new room: ${roomId} with session key: ${sessionKey} for interviewer: ${socket.id}`
      );

      // Store roomId on socket object
      socket.roomId = roomId;
      logWithPrefix('STORE', `Added roomId ${roomId} to socket ${socket.id}`);

      // Create room with initial state including session key
      activeRooms.set(roomId, {
        id: roomId,
        sessionKey: sessionKey,
        interviewer: socket.id,
        interviewee: null,
        interviewerConnected: true,
        intervieweeConnected: false,
        code: '',
        status: 'waiting',
        createdAt: new Date(),
        lastActive: new Date(),
        messages: [],
      });

      // Ensure socket is in the room
      ensureSocketInRoom(socket, roomId);

      // Debug room state
      debugRoom(roomId);

      // Emit the room ID and session key back to the client
      socket.emit('room-created', { roomId, sessionKey });
      logWithPrefix('EMIT', `Sent room-created event with roomId: ${roomId}`);
    } catch (error) {
      console.error('[ERROR] Failed to create room:', error);
      socket.emit('room-creation-failed', {
        message: 'Failed to create room due to server error',
      });
    }
  });

  socket.on('join-room', (roomId) => {
    // Store roomId on socket object
    socket.roomId = roomId;

    // Check if room exists
    let room = activeRooms.get(roomId);
    if (!room) {
      socket.emit('room-not-found');
      return;
    } else if (
      room.interviewee &&
      room.interviewee !== socket.id &&
      room.intervieweeConnected
    ) {
      socket.emit('room-full');
      return;
    } else {
      // Cancel any pending deletion timer
      if (pendingDeletions.has(roomId)) {
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
        socket.leave(existingRoom);
      }
    });

    socket.join(roomId);

    // Debug room state
    debugRoom(roomId);

    io.to(roomId).emit('interviewee-joined', { roomId });
    socket.emit('start-session', { roomId });
  });

  socket.on('join-session', ({ roomId, role, os }) => {
    try {
      logWithPrefix(
        'SESSION',
        `Joining session: roomId=${roomId}, role=${role}, socketId=${
          socket.id
        }, os=${os || 'unknown'}`
      );

      // Validate required parameters
      if (!roomId) {
        logWithPrefix('ERROR', 'Missing roomId in join-session request');
        socket.emit('error', { message: 'Room ID is required' });
        return;
      }

      // Store roomId on socket object for later use
      socket.roomId = roomId;
      logWithPrefix('STORE', `Added roomId ${roomId} to socket ${socket.id}`);

      // Get room if it exists
      let room = activeRooms.get(roomId);

      // If room doesn't exist, return room-not-found for both roles
      if (!room) {
        logWithPrefix(
          'REJECT',
          `Socket ${socket.id} tried to join non-existent room ${roomId}`
        );
        socket.emit('room-not-found');
        return;
      }

      // Room exists, proceed with joining logic
      // Cancel any pending deletion timer
      handlePendingDeletion(roomId, true);

      // Update room's last active timestamp
      room.lastActive = new Date();

      // Update role-specific information
      if (role === 'interviewer') {
        // Handle reconnection case
        if (room.interviewer && room.interviewer !== socket.id) {
          logWithPrefix(
            'INTERVIEWER CHANGE',
            `Updating interviewer from ${room.interviewer} to ${socket.id} in room ${roomId}`
          );
        }

        // Update interviewer socket ID
        room.interviewer = socket.id;
        room.interviewerConnected = true;
        activeRooms.set(roomId, room);
        logWithPrefix(
          'UPDATE',
          `Set interviewer for room ${roomId} to ${socket.id}`
        );

        // Notify interviewee that interviewer has reconnected
        if (room.interviewee) {
          io.to(room.interviewee).emit('interviewer-reconnected');
        }
      } else if (role === 'interviewee') {
        // Handle reconnection case for interviewee
        if (room.interviewee && room.interviewee !== socket.id) {
          logWithPrefix(
            'INTERVIEWEE CHANGE',
            `Updating interviewee from ${room.interviewee} to ${socket.id} in room ${roomId}`
          );
        }

        // Update interviewee socket ID and store OS information
        room.interviewee = socket.id;
        room.intervieweeConnected = true;
        room.status = 'active';

        // Store OS information if provided
        if (os) {
          room.intervieweeOs = os;
          logWithPrefix(
            'OS',
            `Stored interviewee OS: ${os} for room ${roomId}`
          );
        }

        activeRooms.set(roomId, room);
        logWithPrefix(
          'UPDATE',
          `Set interviewee for room ${roomId} to ${socket.id}`
        );

        // Notify the interviewer if present
        if (room.interviewer) {
          io.to(room.interviewer).emit('interviewee-joined', {
            roomId,
            intervieweeConnected: true,
            intervieweeOs: room.intervieweeOs || 'unknown',
          });
        }
      }

      // Ensure socket is in the proper room
      ensureSocketInRoom(socket, roomId);

      // Debug room state
      debugRoom(roomId);

      // Send any existing metrics immediately after joining (only to interviewer)
      if (
        room.latestMetrics &&
        role === 'interviewer' &&
        room.intervieweeConnected
      ) {
        logWithPrefix('INITIAL METRICS', `Sending to interviewer ${socket.id}`);
        sendMetricsToInterviewer(roomId, room.latestMetrics);
      }

      // If this is the interviewer joining, notify the interviewee
      if (role === 'interviewer' && room.interviewee) {
        io.to(room.interviewee).emit('interviewer-joined', {
          roomId,
          interviewerConnected: true,
        });
      }

      socket.emit('session-joined', {
        roomId: room.id,
        code: room.code,
        status: room.status,
        hasInterviewee: !!room.interviewee,
        interviewerConnected: room.interviewerConnected,
        intervieweeConnected: room.intervieweeConnected,
        intervieweeOs: room.intervieweeOs || '',
        ...(socket.id === room.interviewer && { sessionKey: room.sessionKey }),
        messages: room.messages || [], // Include message history
      });
    } catch (error) {
      console.error('[ERROR] Failed to join session:', error);
      socket.emit('error', {
        message: 'Failed to join session due to server error',
      });
    }
  });

  socket.on('code-update', ({ roomId, code, activeEditor }) => {
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
    if (roomId) {
      // Broadcast to everyone in the room except the sender
      socket.to(roomId).emit('active-editor-update', { activeEditor });
    }
  });

  socket.on('end-session', ({ roomId }) => {
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
    }
  });

  socket.on('disconnect', () => {
    logWithPrefix('DISCONNECT', `User disconnected: ${socket.id}`);

    // Find rooms where this socket was a participant
    for (const [roomId, room] of activeRooms.entries()) {
      if (room.interviewer === socket.id || room.interviewee === socket.id) {
        // Update the room's lastActive timestamp
        room.lastActive = new Date();

        // Check if this was the interviewer
        if (room.interviewer === socket.id) {
          logWithPrefix(
            'DISCONNECT',
            `Interviewer ${socket.id} disconnected from room ${roomId}`
          );

          // Mark the interviewer as disconnected but preserve their ID for reconnection
          room.interviewerConnected = false;

          // Only notify others in the room
          socket.to(roomId).emit('interviewer-disconnected', {
            roomId,
            interviewerConnected: false,
          });
        }

        // Check if this was the interviewee
        if (room.interviewee === socket.id) {
          logWithPrefix(
            'DISCONNECT',
            `Interviewee ${socket.id} disconnected from room ${roomId}`
          );

          // Mark the interviewee as disconnected but preserve their ID for reconnection
          room.intervieweeConnected = false;

          // Clear metrics and notify monitoring stopped
          clearRoomMetrics(roomId);

          // Notify others that interviewee left
          socket.to(roomId).emit('interviewee-left', {
            roomId,
            intervieweeConnected: false,
          });

          // Explicitly notify interviewer that monitoring has stopped
          notifyMonitoringStatus(
            roomId,
            false,
            'Monitoring stopped: interviewee has left the session'
          );
        }

        // Update the room state
        activeRooms.set(roomId, room);

        // If both participants are now disconnected, start a deletion timer
        if (!room.interviewerConnected && !room.intervieweeConnected) {
          handlePendingDeletion(roomId);
        }

        debugRoom(roomId);
      }
    }
  });

  // Handle chat messages
  socket.on('chat-message', (data) => {
    const { roomId, message, sender, timestamp } = data;
    if (!activeRooms.has(roomId)) {
      return;
    }

    const room = activeRooms.get(roomId);
    const messageData = {
      userId: socket.id,
      message,
      sender:
        sender ||
        (socket.id === room.interviewer ? 'interviewer' : 'interviewee'),
      timestamp: timestamp || new Date(),
    };

    // Store the message in the room's message history
    if (!room.messages) {
      room.messages = [];
    }
    room.messages.push(messageData);

    // Ensure we update the room in the activeRooms Map with the new messages
    activeRooms.set(roomId, room);

    // Update the room's last activity timestamp
    room.lastActive = new Date();

    // Broadcast the message to all users in the room
    io.to(roomId).emit('chat-message', messageData);
  });

  // Handle metrics request
  socket.on('request-metrics', (data) => {
    try {
      const { roomId, role } = data;
      logWithPrefix(
        'METRICS REQUEST',
        `For room: ${roomId} from socket: ${socket.id}, role: ${role}`
      );

      // Skip invalid room IDs
      if (!roomId || roomId.trim() === '') {
        logWithPrefix('ERROR', `Invalid roomId in metrics request: ${roomId}`);
        socket.emit('processUpdate', {
          roomId: roomId || 'invalid',
          data: { message: 'Invalid room ID provided' },
        });
        return;
      }

      // Skip if the request is from an interviewee
      if (role === 'interviewee') {
        logWithPrefix(
          'SKIP',
          `Ignoring metrics request from interviewee ${socket.id}`
        );
        socket.emit('processUpdate', {
          roomId,
          data: {
            message: 'System metrics are only available to interviewers',
          },
        });
        return;
      }

      // Check if room exists
      const room = activeRooms.get(roomId);

      // If room doesn't exist, return an error
      if (!room) {
        logWithPrefix('ERROR', `Room ${roomId} not found for metrics request`);
        socket.emit('processUpdate', {
          roomId,
          data: { message: 'Room not found. Please create a room first.' },
        });
        return;
      }

      // Verify socket is authorized for this room and is an interviewer
      let isAuthorized = false;
      if (role === 'interviewer') {
        // Auto-update interviewer socket ID
        if (room.interviewer !== socket.id) {
          logWithPrefix(
            'UPDATE',
            `Updating interviewer socket from ${room.interviewer} to ${socket.id}`
          );
          room.interviewer = socket.id;
          activeRooms.set(roomId, room);
        }
        isAuthorized = true;
      }

      logWithPrefix(
        'AUTH CHECK',
        `Socket ${socket.id} as ${role} is ${
          isAuthorized ? 'authorized' : 'unauthorized'
        }`
      );

      // Make sure socket is in the room
      ensureSocketInRoom(socket, roomId);

      if (!isAuthorized) {
        logWithPrefix(
          'WARNING',
          `Unauthorized metrics request from ${socket.id}`
        );
        socket.emit('processUpdate', {
          roomId,
          data: { message: 'Unauthorized to request metrics for this room' },
        });
        return;
      }

      // Check if interviewee is connected, if not, don't send metrics
      if (!room.intervieweeConnected) {
        logWithPrefix(
          'METRICS',
          `Interviewee not connected in room ${roomId}, sending empty metrics`
        );
        socket.emit('processUpdate', {
          roomId,
          data: {
            message:
              'Interviewee is not connected. No monitoring data available.',
          },
        });

        // Clear any cached metrics
        clearRoomMetrics(roomId);

        // Notify monitoring stopped
        notifyMonitoringStatus(roomId, false, 'Interviewee is not connected');
        return;
      }

      if (room.latestMetrics) {
        // Send the cached metrics to the interviewer only
        logWithPrefix(
          'SENDING',
          `Cached metrics for room: ${roomId} to interviewer`
        );
        sendMetricsToInterviewer(roomId, room.latestMetrics);
      } else {
        // Inform client that no metrics are available yet
        logWithPrefix('INFO', `No metrics available for room: ${roomId}`);
        socket.emit('processUpdate', {
          roomId,
          data: {
            message: 'No metrics available yet. Waiting for first update...',
          },
        });
      }
    } catch (error) {
      console.error('[ERROR] Failed to handle metrics request:', error);
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
          logWithPrefix(
            'UPDATE',
            `Setting socket.roomId to ${roomId} from payload`
          );
        }
      } else {
        // Legacy format - entire payload is the metrics data
        metricsData = payload;
      }

      logWithPrefix(
        'METRICS RECEIVED',
        `From ${socket.id} in room ${roomId}:`,
        typeof metricsData
      );

      if (!roomId) {
        logWithPrefix('ERROR', 'Socket has no roomId when sending metrics');
        return;
      }

      const room = activeRooms.get(roomId);
      if (!room) {
        logWithPrefix('ERROR', `Room ${roomId} not found for metrics update`);
        return;
      }

      // Format metrics data for better display
      const formattedMetrics = formatMetricsData(metricsData);
      logWithPrefix(
        'FORMATTED',
        `${formattedMetrics.length} processes for room ${roomId}`
      );

      // Store the formatted metrics
      room.latestMetrics = formattedMetrics;
      activeRooms.set(roomId, room);

      // Send metrics to interviewer
      if (room.interviewer) {
        sendMetricsToInterviewer(roomId, formattedMetrics);
      } else {
        logWithPrefix('WARNING', 'No interviewer available to receive metrics');
      }
    } catch (err) {
      console.error('Error handling metrics:', err);
    }
  });
});

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Interview Room Server' });
});

// Room status API endpoint
app.get('/room-status/:roomId', (req, res) => {
  const roomId = req.params.roomId;
  const sessionKey = req.headers['x-session-key']; // Get session key from headers

  // Check if room exists
  if (!activeRooms.has(roomId)) {
    return res.status(404).json({
      status: 'error',
      message: 'Room not found',
    });
  }

  const room = activeRooms.get(roomId);

  // If session key is provided, validate it (but don't require it for basic status check)
  if (sessionKey && room.sessionKey && sessionKey !== room.sessionKey) {
    return res.status(403).json({
      status: 'error',
      message: 'Invalid session key',
    });
  }

  // Check if anyone is connected
  if (room.interviewerConnected && room.intervieweeConnected) {
    return res.status(200).json({
      status: 'success',
      message: 'Room is active',
      roomId: roomId,
      interviewerConnected: room.interviewerConnected || false,
      intervieweeConnected: room.intervieweeConnected || false,
      lastActive: room.lastActive,
    });
  } else {
    return res.status(400).json({
      status: 'error',
      message: 'No participants connected to this room',
      roomId: roomId,
      lastActive: room.lastActive,
    });
  }
});

// Get all rooms status API endpoint (admin route)
app.get('/api/rooms/status', (req, res) => {
  // Simple API key check for admin access
  const apiKey = req.headers['x-api-key'];

  if (!apiKey || apiKey !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({
      status: 'error',
      message: 'Unauthorized access',
    });
  }

  const roomsStatus = [];

  for (const [roomId, room] of activeRooms.entries()) {
    roomsStatus.push({
      roomId,
      interviewerConnected: room.interviewerConnected || false,
      intervieweeConnected: room.intervieweeConnected || false,
      status: room.status,
      createdAt: room.createdAt,
      lastActive: room.lastActive,
      isActive: room.interviewerConnected || room.intervieweeConnected,
    });
  }

  return res.status(200).json({
    status: 'success',
    count: roomsStatus.length,
    rooms: roomsStatus,
  });
});

app.post('/send_processes/:roomId', (req, res) => {
  const roomId = req.params.roomId;
  const sessionKey = req.headers['x-session-key']; // Get session key from headers
  const data = req.body;

  logWithPrefix('RECEIVED', `Process data for room ${roomId}`);

  // Check if room exists
  if (!activeRooms.has(roomId)) {
    logWithPrefix('ERROR', `Invalid room ID: ${roomId}`);
    return res.status(404).json({ message: 'Room not found' });
  }

  // Get the room and validate session key
  const room = activeRooms.get(roomId);

  // Validate the session key if present in room
  if (room.sessionKey && (!sessionKey || sessionKey !== room.sessionKey)) {
    logWithPrefix('SECURITY', `Invalid session key for room ${roomId}`);
    return res.status(403).json({
      message: 'Unauthorized: Invalid session key',
    });
  }

  // Log a sample of the data for debugging
  if (Array.isArray(data)) {
    logWithPrefix('DATA SAMPLE', `Received ${data.length} processes:`);
    // Show first 3 processes or all if less than 3
    const sample = data.slice(0, 3);
    if (data.length > 3) {
    }
  } else if (data && typeof data === 'object') {
    logWithPrefix(
      'DATA',
      `Received object with keys: ${Object.keys(data).join(', ')}`
    );
  } else {
    logWithPrefix('DATA', `Received data of type: ${typeof data}`);
  }

  // Format the metrics data
  let formattedMetrics = formatMetricsData(data);

  // Store the latest metrics in the room
  room.latestMetrics = formattedMetrics;
  activeRooms.set(roomId, room);

  // Debug room members
  debugRoom(roomId);

  // Send metrics to the interviewer only
  if (room.interviewer) {
    console.log(formattedMetrics);
    sendMetricsToInterviewer(roomId, formattedMetrics);
    logWithPrefix('METRICS', `Sent to interviewer ${room.interviewer}`);
  } else {
    logWithPrefix('WARNING', `No interviewer assigned to room ${roomId}`);
  }

  return res
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

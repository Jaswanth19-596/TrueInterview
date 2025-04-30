import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Paper,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5001';

const InterviewerRoom = () => {
  const navigate = useNavigate();
  const [socket, setSocket] = useState(null);
  const [roomId, setRoomId] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let newSocket;
    try {
      // Connect to Socket.io server with more resilient configuration
      newSocket = io(SOCKET_URL, {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
        timeout: 10000,
        forceNew: true,
        transports: ['polling', 'websocket'],
      });

      newSocket.on('connect', () => {
        setIsConnected(true);
        setError('');
        // Create a new room when connected
        newSocket.emit('create-room');
      });

      newSocket.on('connect_error', (err) => {
        console.error('Connection error:', err);
        setError(
          'Failed to connect to the server. Please check if the server is running.'
        );
        setLoading(false);
      });

      newSocket.on('room-created', (data) => {
        setRoomId(data.roomId);
        setLoading(false);
      });

      newSocket.on('start-session', ({ roomId }) => {
        // Navigate to the interview session
        navigate(`/session?roomId=${roomId}&role=interviewer`);
        newSocket.disconnect();
      });

      newSocket.on('disconnect', () => {
        setIsConnected(false);
        setError('Disconnected from server. Attempting to reconnect...');
      });

      setSocket(newSocket);
    } catch (err) {
      console.error('Socket initialization error:', err);
      setError('Failed to initialize connection. Please try again.');
      setLoading(false);
    }

    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [navigate]);

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleRetry = () => {
    setLoading(true);
    setError('');
    window.location.reload();
  };

  if (loading) {
    return (
      <Container>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '80vh',
            gap: 2,
          }}
        >
          <CircularProgress />
          <Typography>Connecting to server...</Typography>
          {error && (
            <Alert
              severity="error"
              sx={{ mt: 2, width: '100%', maxWidth: 400 }}
            >
              {error}
            </Alert>
          )}
          {error && (
            <Button variant="contained" onClick={handleRetry} sx={{ mt: 2 }}>
              Try Again
            </Button>
          )}
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4 }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom>
            Interview Room
          </Typography>

          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Room Status
            </Typography>
            <Typography
              variant="body1"
              color={isConnected ? 'success.main' : 'error.main'}
              sx={{ mb: 2 }}
            >
              {isConnected ? 'Connected' : 'Disconnected'}
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {roomId && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Room ID
                </Typography>
                <Paper
                  sx={{
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: 'grey.100',
                  }}
                >
                  <Typography
                    variant="h5"
                    component="div"
                    sx={{ fontFamily: 'monospace' }}
                  >
                    {roomId}
                  </Typography>
                  <Button
                    startIcon={<ContentCopyIcon />}
                    onClick={copyRoomId}
                    variant="contained"
                  >
                    Copy
                  </Button>
                </Paper>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1 }}
                >
                  Share this room ID with the interviewee
                </Typography>
              </Box>
            )}
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default InterviewerRoom;

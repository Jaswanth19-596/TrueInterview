import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Alert,
  Divider,
} from '@mui/material';
import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5001';

const IntervieweeJoin = () => {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState('');
  const [error, setError] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const handleJoinRoom = () => {
    if (!roomId.trim()) {
      setError('Please enter a room ID');
      return;
    }

    setIsJoining(true);
    setError('');

    const socket = io(SOCKET_URL);

    socket.on('connect', () => {
      socket.emit('join-room', roomId.trim());
    });

    socket.on('start-session', ({ roomId }) => {
      // Navigate to the interview session
      navigate(`/session?roomId=${roomId}&role=interviewee`);
      socket.disconnect();
    });

    socket.on('room-not-found', () => {
      setError(
        'Room not found. Please check the room ID provided by your interviewer.'
      );
      setIsJoining(false);
      socket.disconnect();
    });

    socket.on('room-full', () => {
      setError('This room is no longer available.');
      setIsJoining(false);
      socket.disconnect();
    });

    socket.on('connect_error', () => {
      setError('Failed to connect to the server');
      setIsJoining(false);
      socket.disconnect();
    });
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8 }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom>
            Join Interview Room
          </Typography>

          <Box sx={{ mt: 3 }}>
            <Typography variant="body1" gutterBottom>
              Enter the room ID provided by your interviewer
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 1, mb: 2 }}
            >
              Note: You can only join an existing room. Ask your interviewer to
              create a room first and share the room ID with you.
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
                {error}
              </Alert>
            )}

            <TextField
              fullWidth
              label="Room ID"
              variant="outlined"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value.toUpperCase())}
              placeholder="Enter room ID"
              sx={{ mt: 2 }}
              inputProps={{ maxLength: 6 }}
            />

            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={handleJoinRoom}
              disabled={isJoining}
              sx={{ mt: 3 }}
            >
              {isJoining ? 'Joining...' : 'Join Room'}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default IntervieweeJoin;

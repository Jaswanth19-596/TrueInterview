import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
} from '@mui/material';
import LoginIcon from '@mui/icons-material/Login';

const IntervieweeLanding = () => {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState('');

  const handleJoinRoom = () => {
    if (roomId.trim()) {
      navigate(`/session?roomId=${roomId.trim()}&role=interviewee`);
    }
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Typography component="h1" variant="h4" align="center" gutterBottom>
            Join Interview
          </Typography>
          <Typography
            variant="body1"
            align="center"
            color="text.secondary"
            sx={{ mb: 4 }}
          >
            Enter the room ID provided by your interviewer
          </Typography>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              label="Room ID"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="Enter room ID"
              autoFocus
            />
            <Button
              variant="contained"
              startIcon={<LoginIcon />}
              onClick={handleJoinRoom}
              disabled={!roomId.trim()}
            >
              Join Room
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default IntervieweeLanding;

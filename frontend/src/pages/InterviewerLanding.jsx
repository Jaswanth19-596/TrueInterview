import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Grid,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import LoginIcon from '@mui/icons-material/Login';

const InterviewerLanding = () => {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState('');

  const handleCreateRoom = () => {
    // Navigate to session without a room ID - let the server generate one
    console.log('Creating new room, navigating to session page');
    navigate(`/session?role=interviewer`);
  };

  const handleJoinRoom = () => {
    if (roomId.trim()) {
      navigate(`/session?roomId=${roomId.trim()}&role=interviewer`);
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
            Interview Room
          </Typography>
          <Typography
            variant="body1"
            align="center"
            color="text.secondary"
            sx={{ mb: 4 }}
          >
            Create a new room or join an existing one
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Button
                fullWidth
                variant="contained"
                size="large"
                startIcon={<AddIcon />}
                onClick={handleCreateRoom}
                sx={{ py: 2 }}
              >
                Create New Room
              </Button>
            </Grid>

            <Grid item xs={12}>
              <Divider>OR</Divider>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Join Existing Room
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  label="Room ID"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  placeholder="Enter room ID"
                />
                <Button
                  variant="contained"
                  startIcon={<LoginIcon />}
                  onClick={handleJoinRoom}
                  disabled={!roomId.trim()}
                >
                  Join
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </Box>
    </Container>
  );
};

export default InterviewerLanding;

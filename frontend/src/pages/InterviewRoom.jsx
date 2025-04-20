import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Grid,
  Paper,
  Button,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import io from 'socket.io-client';

const InterviewRoom = () => {
  const { id } = useParams();
  const [socket, setSocket] = useState(null);
  const [systemMetrics, setSystemMetrics] = useState({
    cpu: 0,
    memory: 0,
    network: 0,
  });

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);

    // Join interview room
    newSocket.emit('join-interview', id);

    // Listen for system metrics updates
    newSocket.on('system-metrics', (metrics) => {
      setSystemMetrics(metrics);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [id]);

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Grid container spacing={3}>
          {/* Video/Audio Section */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 2, height: '500px' }}>
              <Typography variant="h6" gutterBottom>
                Video/Audio Feed
              </Typography>
              {/* TODO: Add video/audio components */}
            </Paper>
          </Grid>

          {/* System Metrics Section */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                System Metrics
              </Typography>
              <List>
                <ListItem>
                  <ListItemText
                    primary="CPU Usage"
                    secondary={`${systemMetrics.cpu}%`}
                  />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText
                    primary="Memory Usage"
                    secondary={`${systemMetrics.memoryMB}%`}
                  />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText
                    primary="Network Activity"
                    secondary={`${systemMetrics.network} KB/s`}
                  />
                </ListItem>
              </List>
            </Paper>

            {/* Chat Section */}
            <Paper sx={{ p: 2, mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                Chat
              </Typography>
              {/* TODO: Add chat components */}
            </Paper>
          </Grid>

          {/* Controls Section */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button variant="contained" color="primary">
                  Start Recording
                </Button>
                <Button variant="contained" color="secondary">
                  End Interview
                </Button>
                <Button variant="outlined">Share Screen</Button>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default InterviewRoom;

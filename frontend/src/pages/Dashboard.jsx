import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

const Dashboard = () => {
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState([
    {
      id: '1',
      title: 'Frontend Developer Interview',
      date: '2024-04-20',
      time: '14:00',
      status: 'scheduled',
    },
    {
      id: '2',
      title: 'Backend Developer Interview',
      date: '2024-04-21',
      time: '10:00',
      status: 'completed',
    },
  ]);

  const handleCreateInterview = () => {
    // TODO: Implement interview creation
    console.log('Create new interview');
  };

  const handleEditInterview = (id) => {
    // TODO: Implement interview editing
    console.log('Edit interview:', id);
  };

  const handleDeleteInterview = (id) => {
    // TODO: Implement interview deletion
    console.log('Delete interview:', id);
  };

  const handleJoinInterview = (id) => {
    navigate(`/interview/${id}`);
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Typography variant="h4" component="h1">
                Interview Dashboard
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleCreateInterview}
              >
                New Interview
              </Button>
            </Box>
          </Grid>

          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Upcoming Interviews
                </Typography>
                <List>
                  {interviews.map((interview) => (
                    <ListItem
                      key={interview.id}
                      divider
                      secondaryAction={
                        <Box>
                          <IconButton
                            edge="end"
                            aria-label="edit"
                            onClick={() => handleEditInterview(interview.id)}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            edge="end"
                            aria-label="delete"
                            onClick={() => handleDeleteInterview(interview.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      }
                    >
                      <ListItemText
                        primary={interview.title}
                        secondary={`${interview.date} at ${interview.time}`}
                      />
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => handleJoinInterview(interview.id)}
                      >
                        Join
                      </Button>
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Statistics
                </Typography>
                <List>
                  <ListItem>
                    <ListItemText
                      primary="Total Interviews"
                      secondary={interviews.length}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Scheduled"
                      secondary={
                        interviews.filter((i) => i.status === 'scheduled')
                          .length
                      }
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Completed"
                      secondary={
                        interviews.filter((i) => i.status === 'completed')
                          .length
                      }
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default Dashboard;

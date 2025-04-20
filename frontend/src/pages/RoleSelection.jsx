import { useNavigate } from 'react-router-dom';
import { Container, Box, Typography, Paper, Grid } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import GroupIcon from '@mui/icons-material/Group';

const RoleSelection = () => {
  const navigate = useNavigate();

  const handleRoleSelect = (role) => {
    if (role === 'interviewer') {
      navigate('/interviewer');
    } else {
      navigate('/interviewee');
    }
  };

  return (
    <Container component="main" maxWidth="md">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography component="h1" variant="h4" gutterBottom>
          Interview Room
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Select your role to continue
        </Typography>
        <Grid container spacing={4}>
          <Grid item xs={12} sm={6}>
            <Paper
              sx={{
                p: 3,
                cursor: 'pointer',
                transition: 'all 0.3s',
                '&:hover': {
                  transform: 'translateY(-5px)',
                  boxShadow: 6,
                },
              }}
              onClick={() => handleRoleSelect('interviewer')}
            >
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                <GroupIcon sx={{ fontSize: 60, color: 'primary.main' }} />
                <Typography variant="h5" component="h2">
                  Interviewer
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  align="center"
                >
                  Create a new interview room
                </Typography>
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Paper
              sx={{
                p: 3,
                cursor: 'pointer',
                transition: 'all 0.3s',
                '&:hover': {
                  transform: 'translateY(-5px)',
                  boxShadow: 6,
                },
              }}
              onClick={() => handleRoleSelect('interviewee')}
            >
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                <PersonIcon sx={{ fontSize: 60, color: 'primary.main' }} />
                <Typography variant="h5" component="h2">
                  Interviewee
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  align="center"
                >
                  Join an interview room
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default RoleSelection;

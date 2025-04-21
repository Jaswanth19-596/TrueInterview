import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Button,
} from '@mui/material';
import { SettingsIcon } from '../icons/SettingsIcon';

const InterviewSettings = () => {
  const [settings, setSettings] = useState({
    name: '',
    interviewType: 'frontend',
    difficultyLevel: 'beginner',
    programmingLanguage: 'javascript',
    enableHints: false,
    enableRealTimeFeeback: false,
  });

  const [isDarkMode, setIsDarkMode] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    // Handle form submission
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setSettings((prevSettings) => ({
      ...prevSettings,
      [name]: value,
    }));
  };

  const handleToggleChange = (event) => {
    const { name, checked } = event.target;
    setSettings((prevSettings) => ({
      ...prevSettings,
      [name]: checked,
    }));
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper
        elevation={3}
        sx={{
          p: 3,
          mb: 4,
          backgroundColor: isDarkMode ? '#0F172A' : '#ffffff',
          borderRadius: 2,
          border: '1px solid',
          borderColor: isDarkMode
            ? 'rgba(255, 255, 255, 0.1)'
            : 'rgba(0, 0, 0, 0.05)',
        }}
      >
        <Typography
          variant="h4"
          component="h1"
          gutterBottom
          fontWeight="bold"
          color={isDarkMode ? '#E2E8F0' : 'inherit'}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            mb: 3,
          }}
        >
          <SettingsIcon
            color={isDarkMode ? '#38BDF8' : 'primary'}
            sx={{ fontSize: 30 }}
          />
          Interview Settings
        </Typography>

        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
        >
          <TextField
            label="Your Name"
            name="name"
            value={settings.name}
            onChange={handleChange}
            required
            fullWidth
            variant="outlined"
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: isDarkMode
                    ? 'rgba(255, 255, 255, 0.15)'
                    : 'rgba(0, 0, 0, 0.15)',
                },
                '&:hover fieldset': {
                  borderColor: isDarkMode
                    ? 'rgba(255, 255, 255, 0.25)'
                    : 'rgba(0, 0, 0, 0.25)',
                },
              },
              '& .MuiInputLabel-root': {
                color: isDarkMode ? '#94A3B8' : 'rgba(0, 0, 0, 0.6)',
              },
              '& .MuiOutlinedInput-input': {
                color: isDarkMode ? '#E2E8F0' : 'inherit',
              },
            }}
          />

          <FormControl
            fullWidth
            variant="outlined"
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: isDarkMode
                    ? 'rgba(255, 255, 255, 0.15)'
                    : 'rgba(0, 0, 0, 0.15)',
                },
                '&:hover fieldset': {
                  borderColor: isDarkMode
                    ? 'rgba(255, 255, 255, 0.25)'
                    : 'rgba(0, 0, 0, 0.25)',
                },
              },
              '& .MuiInputLabel-root': {
                color: isDarkMode ? '#94A3B8' : 'rgba(0, 0, 0, 0.6)',
              },
              '& .MuiOutlinedInput-input': {
                color: isDarkMode ? '#E2E8F0' : 'inherit',
              },
              '& .MuiSvgIcon-root': {
                color: isDarkMode ? '#94A3B8' : 'inherit',
              },
            }}
          >
            <InputLabel id="interview-type-label">Interview Type</InputLabel>
            <Select
              labelId="interview-type-label"
              name="interviewType"
              value={settings.interviewType}
              onChange={handleChange}
              label="Interview Type"
              required
            >
              <MenuItem value="frontend">Frontend Development</MenuItem>
              <MenuItem value="backend">Backend Development</MenuItem>
              <MenuItem value="fullstack">Full Stack Development</MenuItem>
              <MenuItem value="algorithms">
                Data Structures & Algorithms
              </MenuItem>
            </Select>
          </FormControl>

          <FormControl
            fullWidth
            variant="outlined"
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: isDarkMode
                    ? 'rgba(255, 255, 255, 0.15)'
                    : 'rgba(0, 0, 0, 0.15)',
                },
                '&:hover fieldset': {
                  borderColor: isDarkMode
                    ? 'rgba(255, 255, 255, 0.25)'
                    : 'rgba(0, 0, 0, 0.25)',
                },
              },
              '& .MuiInputLabel-root': {
                color: isDarkMode ? '#94A3B8' : 'rgba(0, 0, 0, 0.6)',
              },
              '& .MuiOutlinedInput-input': {
                color: isDarkMode ? '#E2E8F0' : 'inherit',
              },
              '& .MuiSvgIcon-root': {
                color: isDarkMode ? '#94A3B8' : 'inherit',
              },
            }}
          >
            <InputLabel id="difficulty-label">Difficulty Level</InputLabel>
            <Select
              labelId="difficulty-label"
              name="difficultyLevel"
              value={settings.difficultyLevel}
              onChange={handleChange}
              label="Difficulty Level"
              required
            >
              <MenuItem value="beginner">Beginner</MenuItem>
              <MenuItem value="intermediate">Intermediate</MenuItem>
              <MenuItem value="advanced">Advanced</MenuItem>
            </Select>
          </FormControl>

          <FormControl
            fullWidth
            variant="outlined"
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: isDarkMode
                    ? 'rgba(255, 255, 255, 0.15)'
                    : 'rgba(0, 0, 0, 0.15)',
                },
                '&:hover fieldset': {
                  borderColor: isDarkMode
                    ? 'rgba(255, 255, 255, 0.25)'
                    : 'rgba(0, 0, 0, 0.25)',
                },
              },
              '& .MuiInputLabel-root': {
                color: isDarkMode ? '#94A3B8' : 'rgba(0, 0, 0, 0.6)',
              },
              '& .MuiOutlinedInput-input': {
                color: isDarkMode ? '#E2E8F0' : 'inherit',
              },
              '& .MuiSvgIcon-root': {
                color: isDarkMode ? '#94A3B8' : 'inherit',
              },
            }}
          >
            <InputLabel id="language-label">Programming Language</InputLabel>
            <Select
              labelId="language-label"
              name="programmingLanguage"
              value={settings.programmingLanguage}
              onChange={handleChange}
              label="Programming Language"
              required
            >
              <MenuItem value="javascript">JavaScript</MenuItem>
              <MenuItem value="python">Python</MenuItem>
              <MenuItem value="java">Java</MenuItem>
              <MenuItem value="csharp">C#</MenuItem>
              <MenuItem value="cpp">C++</MenuItem>
            </Select>
          </FormControl>

          <FormControlLabel
            control={
              <Switch
                checked={settings.enableHints}
                onChange={handleToggleChange}
                name="enableHints"
                color="primary"
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': {
                    color: isDarkMode ? '#38BDF8' : '#3f51b5',
                  },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                    backgroundColor: isDarkMode ? '#0F172A' : '#3f51b5',
                    opacity: 0.5,
                  },
                }}
              />
            }
            label={
              <Typography color={isDarkMode ? '#E2E8F0' : 'inherit'}>
                Enable Hints
              </Typography>
            }
          />

          <FormControlLabel
            control={
              <Switch
                checked={settings.enableRealTimeFeeback}
                onChange={handleToggleChange}
                name="enableRealTimeFeeback"
                color="primary"
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': {
                    color: isDarkMode ? '#38BDF8' : '#3f51b5',
                  },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                    backgroundColor: isDarkMode ? '#0F172A' : '#3f51b5',
                    opacity: 0.5,
                  },
                }}
              />
            }
            label={
              <Typography color={isDarkMode ? '#E2E8F0' : 'inherit'}>
                Enable Real-time Feedback
              </Typography>
            }
          />

          <Button
            type="submit"
            variant="contained"
            color="primary"
            size="large"
            sx={{
              mt: 2,
              py: 1.5,
              backgroundColor: isDarkMode ? '#38BDF8' : undefined,
              '&:hover': {
                backgroundColor: isDarkMode ? '#0284C7' : undefined,
              },
            }}
          >
            Start Interview
          </Button>
        </form>
      </Paper>
    </Container>
  );
};

export default InterviewSettings;

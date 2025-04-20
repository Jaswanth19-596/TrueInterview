import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  Divider,
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Tooltip,
  Chip,
  Card,
  CardContent,
  LinearProgress,
  Badge,
} from '@mui/material';
import { io } from 'socket.io-client';
import LogoutIcon from '@mui/icons-material/Logout';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import MemoryIcon from '@mui/icons-material/Memory';
import CodeIcon from '@mui/icons-material/Code';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { downloadFileWithReplacements } from '../utils/fileUtils';

const SOCKET_URL = 'http://localhost:5001';
const INSTRUCTIONS_PATH = '/assets/main.py';

const InterviewSession = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [socket, setSocket] = useState(null);
  const [code, setCode] = useState('// Start coding here...');
  const [isConnected, setIsConnected] = useState(false);
  const [role, setRole] = useState('');
  const [roomId, setRoomId] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showInstructionsDialog, setShowInstructionsDialog] = useState(false);
  const [systemMetrics, setSystemMetrics] = useState(null);
  const [foundInterviewCoder, setFoundInterviewCoder] = useState(false);
  const [foundCluely, setFoundCluely] = useState(false);
  const [activeEditor, setActiveEditor] = useState(null);
  const [interviewerConnected, setInterviewerConnected] = useState(false);
  const [intervieweeConnected, setIntervieweeConnected] = useState(false);

  useEffect(() => {
    // Get room ID and role from URL params
    const params = new URLSearchParams(location.search);
    const roomIdParam = params.get('roomId');
    const roleParam = params.get('role');

    // Show loading state
    setIsLoading(true);

    // We must have a role at minimum
    if (!roleParam) {
      console.log('No role specified, redirecting to home');
      navigate('/');
      return;
    }

    // Initialize state with any existing room ID (can be null for new room creation)
    setRoomId(roomIdParam || '');
    setRole(roleParam);

    // If interviewee, show instructions dialog
    if (roleParam === 'interviewee') {
      setShowInstructionsDialog(true);
    }

    // Try to load saved code from localStorage if we have a roomId
    if (roomIdParam) {
      const savedCode = localStorage.getItem(`code-${roomIdParam}`);
      if (savedCode) {
        setCode(savedCode);
      }
    }

    // Connect to socket
    const newSocket = io(SOCKET_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      timeout: 10000,
      forceNew: true,
      transports: ['polling', 'websocket'],
    });

    newSocket.on('connect', () => {
      console.log('Connected to server with socket ID:', newSocket.id);
      setIsConnected(true);
      setError('');

      // Initialize the room based on role
      if (roleParam === 'interviewer') {
        // For interviewer: if we have a URL room ID, try to join it directly rather than creating
        if (roomIdParam) {
          console.log(
            `Attempting to join existing room as interviewer: ${roomIdParam}`
          );
          // Use join-session directly, which will auto-create if needed
          newSocket.emit('join-session', {
            roomId: roomIdParam,
            role: roleParam,
          });
        } else {
          // Only create a new room if no room ID is specified
          console.log('Creating new room as no room ID was provided');
          newSocket.emit('create-room');
        }
      } else if (roomIdParam) {
        // For interviewee: always join the specified room
        console.log(`Joining room ${roomIdParam} as interviewee`);
        newSocket.emit('join-session', {
          roomId: roomIdParam,
          role: roleParam,
        });
      } else {
        console.log('Interviewee must specify a room ID');
        setError('You must specify a room ID to join as an interviewee');
        setTimeout(() => navigate('/'), 2000);
      }
    });

    newSocket.on('room-created', (data) => {
      console.log('Room created event received:', data);

      if (!data || !data.roomId) {
        console.error('Invalid room-created event - missing roomId');
        return;
      }

      // Update state with the new room ID
      setRoomId(data.roomId);

      // Update the URL to include the server-generated room ID
      const newUrl = `/session?roomId=${data.roomId}&role=${roleParam}`;
      console.log(`Updating URL to: ${newUrl}`);

      try {
        window.history.replaceState(null, '', newUrl);
      } catch (e) {
        console.error('Failed to update URL:', e);
      }

      // Join the session with the new room ID
      console.log(`Joining session with newly created room ID: ${data.roomId}`);
      newSocket.emit('join-session', { roomId: data.roomId, role: roleParam });
    });

    newSocket.on('start-session', (data) => {
      console.log('Session started:', data);
      // Join the session after room is joined
      newSocket.emit('join-session', { roomId: roomIdParam, role: roleParam });
    });

    newSocket.on('session-joined', (data) => {
      console.log('Session joined:', data);
      // Hide loading state since we're now in a session
      setIsLoading(false);

      // Update connection status based on data
      if (data.interviewerConnected !== undefined) {
        setInterviewerConnected(data.interviewerConnected);
      }
      if (data.intervieweeConnected !== undefined) {
        setIntervieweeConnected(data.intervieweeConnected);
      }

      if (data.code) {
        setCode(data.code);
        // Save to localStorage
        localStorage.setItem(`code-${roomIdParam}`, data.code);
      }
    });

    newSocket.on('interviewer-joined', () => {
      console.log('Interviewer joined the session');
      setInterviewerConnected(true);
    });

    newSocket.on('interviewer-disconnected', () => {
      console.log('Interviewer disconnected from the session');
      setInterviewerConnected(false);
    });

    newSocket.on('interviewee-joined', (data) => {
      console.log('Interviewee joined:', data);
      setError('');
      setIntervieweeConnected(true);
    });

    newSocket.on('interviewee-left', () => {
      console.log('Interviewee left the session');
      setIntervieweeConnected(false);
    });

    newSocket.on('code-update', (data) => {
      console.log('Received code update:', data);
      const newCode = typeof data === 'string' ? data : data.code;
      if (newCode) {
        setCode(newCode);
        // Save to localStorage
        localStorage.setItem(`code-${roomIdParam}`, newCode);
      }

      // If data contains activeEditor, update it
      if (data && data.activeEditor) {
        setActiveEditor(data.activeEditor);
      }
    });

    newSocket.on('room-not-found', () => {
      setError('Room not found. Please check the room ID.');
      setTimeout(() => navigate('/'), 2000);
    });

    newSocket.on('room-full', () => {
      setError('This room is no longer available.');
      setTimeout(() => navigate('/'), 2000);
    });

    newSocket.on('room-ended', ({ reason }) => {
      console.log('Room ended:', reason);
      setError('The interview session has ended.');
      // Clear localStorage
      localStorage.removeItem(`code-${roomIdParam}`);
      // Redirect to home after a short delay
      setTimeout(() => {
        navigate('/');
      }, 2000);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from session');
      setIsConnected(false);
      setError('Disconnected from session. Trying to reconnect...');
    });

    newSocket.on('connect_error', (err) => {
      console.error('Connection error:', err);
      setError('Failed to connect to session. Please try again.');
    });

    newSocket.on('processUpdate', (data) => {
      console.log('Received system metrics update:', data);
      // Extract the actual data structure
      try {
        // Process metrics for any role, but check data structure
        if (data) {
          // Check if data is properly structured
          if (!data.data) {
            console.error(
              'Received malformed metrics data - missing data property:',
              data
            );
            return;
          }

          // Log the full metrics data object for debugging
          console.log(
            'Metrics data received:',
            JSON.stringify(data.data).substring(0, 200) + '...'
          );

          // For interviewee, only show messages
          if (roleParam === 'interviewee' && data.data.message) {
            console.log('Message for interviewee:', data.data.message);
            setSystemMetrics(data.data);
            return;
          }

          // Update state with the metrics data for interviewer
          if (roleParam === 'interviewer') {
            setSystemMetrics(data.data);

            // Check if Interview Coder is detected in the processes
            const found =
              Array.isArray(data.data) &&
              data.data.some(
                (process) =>
                  process.processName &&
                  process.processName.includes('Interview Coder')
              );
            setFoundInterviewCoder(found);

            // Check if Cluely is detected in the processes
            const foundCluelyApp =
              Array.isArray(data.data) &&
              data.data.some(
                (process) =>
                  process.processName && process.processName.includes('Cluely')
              );
            setFoundCluely(foundCluelyApp);

            console.log(
              'Updated systemMetrics state, Interview Coder found:',
              found,
              'Cluely found:',
              foundCluelyApp
            );
          }
        } else {
          console.log('Ignoring empty metrics data');
        }
      } catch (err) {
        console.error('Error processing metrics update:', err);
      }
    });

    // Handle interviewer-specific broadcast
    newSocket.on('processUpdate-interviewers', (data) => {
      console.log('Received interviewer-only metrics broadcast:', data);
      // Only process if this matches our room AND we're an interviewer
      if (data && data.roomId === roomIdParam && roleParam === 'interviewer') {
        console.log('Interviewer broadcast matches our room:', roomIdParam);
        console.log('Setting metrics data:', data.data);

        if (!data.data) {
          console.error('Missing data property in metrics update:', data);
          return;
        }
        setSystemMetrics(data.data);

        // Check if Interview Coder is detected in the processes
        const found =
          Array.isArray(data.data) &&
          data.data.some(
            (process) =>
              process.processName &&
              process.processName.includes('Interview Coder')
          );
        setFoundInterviewCoder(found);

        // Check if Cluely is detected in the processes
        const foundCluelyApp =
          Array.isArray(data.data) &&
          data.data.some(
            (process) =>
              process.processName && process.processName.includes('Cluely')
          );
        setFoundCluely(foundCluelyApp);

        console.log(
          'Updated systemMetrics from broadcast, Interview Coder found:',
          found,
          'Cluely found:',
          foundCluelyApp
        );
      } else {
        console.log(
          `Ignoring metrics: roomId match=${
            data?.roomId === roomIdParam
          }, role=${roleParam}`
        );
      }
    });

    // We no longer need the universal broadcast since it's only for interviewers now
    newSocket.on('processUpdate-all', () => {
      console.log('Received universal metrics broadcast - DEPRECATED');
      // No action, we're using more targeted channels now
    });

    // Add reconnect event handling to maintain state during reconnections
    newSocket.on('reconnect', () => {
      console.log('Reconnected to server');
      setIsConnected(true);
      setError('');

      // Re-join the session with current state
      if (roomId && role) {
        console.log(
          `Rejoining session after reconnect: roomId=${roomId}, role=${role}`
        );
        newSocket.emit('join-session', { roomId, role });
      }
    });

    newSocket.on('error', (err) => {
      console.error('Socket error:', err);
      setError(err.message || 'An error occurred in the session.');
    });

    // Global error handler for unhandled exceptions
    window.addEventListener('error', (event) => {
      console.error('Unhandled error:', event.error);
      // Only show errors to user if we're not already showing another error
      if (!error) {
        setError('An unexpected error occurred. Please refresh the page.');
      }
    });

    // Add more detailed error handling for room creation failure
    newSocket.on('room-creation-failed', (errData) => {
      console.error('Failed to create room:', errData);
      setError(errData.message || 'Failed to create room. Please try again.');
      setIsLoading(false);
      // Navigate back after a delay
      setTimeout(() => navigate('/'), 2000);
    });

    newSocket.on('active-editor-update', (data) => {
      console.log('Active editor update received:', data);
      if (data && data.activeEditor) {
        setActiveEditor(data.activeEditor);
      }
    });

    setSocket(newSocket);

    // Add periodic metrics refresh for interviewer only
    let metricsRefreshInterval = null;
    if (roleParam === 'interviewer') {
      console.log('Setting up automatic metrics refresh for interviewer');
      metricsRefreshInterval = setInterval(() => {
        if (newSocket && newSocket.connected) {
          // Get the most current roomId from state, not closure variable
          const currentRoomId = roomIdParam;
          console.log(
            `Auto-refreshing metrics for interviewer in room: ${currentRoomId}`
          );

          // Only request if we have a valid room ID
          if (currentRoomId && currentRoomId.trim() !== '') {
            newSocket.emit('request-metrics', {
              roomId: currentRoomId,
              role: roleParam,
            });
          } else {
            console.log('Auto-refresh skipped - no valid room ID');
          }
        }
      }, 15000); // Refresh every 15 seconds
    }

    return () => {
      if (newSocket) {
        console.log('Cleaning up socket connection');
        newSocket.disconnect();
      }

      if (metricsRefreshInterval) {
        console.log('Clearing metrics refresh interval');
        clearInterval(metricsRefreshInterval);
      }
    };
  }, [location, navigate]);

  // Refresh metrics initially when component mounts
  useEffect(() => {
    // Only for interviewer role and when socket is already connected
    if (role === 'interviewer' && socket && socket.connected) {
      console.log('Initial metrics refresh for interviewer...');
      handleRefreshMetrics();
    }
  }, [role, socket]);

  // Reset activeEditor state when component mounts
  useEffect(() => {
    // Set a timeout to clear the active editor state after 3 seconds of inactivity
    let editorInactivityTimer;

    const resetActiveEditorAfterInactivity = () => {
      clearTimeout(editorInactivityTimer);
      editorInactivityTimer = setTimeout(() => {
        setActiveEditor(null);
      }, 3000); // 3 seconds of inactivity
    };

    // Set up event listener for keypress
    const handleAnyKeyPress = () => {
      if (socket && socket.connected) {
        setActiveEditor(role);
        socket.emit('active-editor-update', { roomId, activeEditor: role });
        resetActiveEditorAfterInactivity();
      }
    };

    // Only add listener if we're in an active session
    if (roomId && !isLoading) {
      document.addEventListener('keypress', handleAnyKeyPress);
    }

    return () => {
      document.removeEventListener('keypress', handleAnyKeyPress);
      clearTimeout(editorInactivityTimer);
    };
  }, [roomId, role, socket, isLoading]);

  const handleCodeChange = (event) => {
    const newCode = event.target.value;
    setCode(newCode);

    // Allow both roles to update code in the room
    if (socket && socket.connected) {
      console.log('Sending code update:', {
        roomId,
        code: newCode,
        activeEditor: role,
      });
      socket.emit('code-update', { roomId, code: newCode, activeEditor: role });
      // Also emit a separate event to notify about active editor
      socket.emit('active-editor-update', { roomId, activeEditor: role });
      // Save to localStorage
      localStorage.setItem(`code-${roomId}`, newCode);
      // Update local state
      setActiveEditor(role);
    }
  };

  const handleEndSession = () => {
    if (role === 'interviewer' && socket && socket.connected) {
      socket.emit('end-session', { roomId });
      // Clear localStorage
      localStorage.removeItem(`code-${roomId}`);
      // Navigate to home
      navigate('/');
    }
  };

  const handleDownloadInstructions = async () => {
    try {
      // Define the replacements for the Python file
      const replacements = {
        'student_id = "student123"': `student_id = "${roomId}"`,
      };

      // Download and customize the file
      const success = await downloadFileWithReplacements(
        INSTRUCTIONS_PATH,
        'main.py',
        replacements
      );

      if (!success) {
        setError('Failed to download instructions. Please try again.');
      }

      setShowInstructionsDialog(false);
    } catch (error) {
      console.error('Error in download:', error);
      setError('An error occurred while downloading instructions.');
      setShowInstructionsDialog(false);
    }
  };

  const handleCloseInstructionsDialog = () => {
    setShowInstructionsDialog(false);
  };

  // Format and render the system metrics data
  const renderSystemMetrics = () => {
    console.log('Rendering system metrics:', systemMetrics);

    if (!systemMetrics) {
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            py: 4,
          }}
        >
          <MemoryIcon
            sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.5, mb: 2 }}
          />
          <Typography variant="body1" color="text.secondary">
            No metrics available
          </Typography>
        </Box>
      );
    }

    // If metrics has a message property, display it
    if (systemMetrics.message) {
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            py: 4,
          }}
        >
          <Typography variant="body1" color="text.secondary">
            {systemMetrics.message}
          </Typography>
        </Box>
      );
    }

    // Function to determine if a process is a system process that should be filtered out
    const isSystemProcess = (process) => {
      // List of common system process names to filter out
      const systemProcessNames = [
        'System',
        'systemd',
        'svchost',
        'WindowServer',
        'kernel',
        'launchd',
        'kworker',
        'daemon',
        'service',
        'smss',
        'csrss',
        'wininit',
        'lsass',
        'explorer',
        'fontd',
        'coreaudiod',
        'powershell',
        'terminal',
        'bash',
        'zsh',
        'sh',
        'cmd',
        'finder',
        'spotlight',
        'mds',
        'mdworker',
        'sshd',
        'loginwindow',
        'userinit',
        'conhost',
        'plugin-container',
      ];

      // Check if the process name is in our list of system processes
      // First convert to lowercase for case-insensitive comparison
      const processNameLower = (process.processName || '').toLowerCase();

      // Return true if the process name contains any of the system process names
      return systemProcessNames.some((sysProcess) =>
        processNameLower.includes(sysProcess.toLowerCase())
      );
    };

    // If metrics is an array (from backend), filter out system processes and render the list
    if (Array.isArray(systemMetrics) && systemMetrics.length > 0) {
      // Filter out system processes
      const userProcesses = systemMetrics.filter(
        (process) => !isSystemProcess(process)
      );

      console.log(
        `Showing ${userProcesses.length} of ${systemMetrics.length} processes (filtered out system processes)`
      );

      if (userProcesses.length === 0) {
        return (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
              py: 4,
            }}
          >
            <Typography variant="body1" color="text.secondary">
              No user processes detected. System processes have been filtered
              out.
            </Typography>
          </Box>
        );
      }

      return (
        <Box
          sx={{ width: '100%', height: '100%', overflow: 'auto' }}
          className="scrollbar-thin"
        >
          <List sx={{ width: '100%', py: 0 }}>
            {userProcesses.map((process, index) => (
              <ListItem
                key={index}
                sx={{
                  py: 1.5,
                  px: 2,
                  borderBottom: '1px solid',
                  borderColor: 'rgba(0, 0, 0, 0.06)',
                  '&:last-child': {
                    borderBottom: 'none',
                  },
                }}
              >
                <Box
                  sx={{ display: 'flex', width: '100%', alignItems: 'center' }}
                >
                  <Box
                    sx={{
                      flexGrow: 1,
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 600, color: '#3f51b5' }}
                    >
                      {process.processName || 'Unknown process'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Memory:{' '}
                      {process.memoryMB
                        ? `${process.memoryMB} MB`
                        : process.memory
                        ? `${(process.memory / (1024 * 1024)).toFixed(1)} MB`
                        : 'N/A'}
                    </Typography>
                  </Box>

                  {process.cpu !== undefined && (
                    <Box sx={{ minWidth: 70, textAlign: 'right' }}>
                      <Chip
                        size="small"
                        label={`${process.cpu}% CPU`}
                        sx={{
                          bgcolor:
                            process.cpu > 50
                              ? '#f44336'
                              : process.cpu > 20
                              ? '#ff9800'
                              : '#4caf50',
                          color: 'white',
                          fontSize: '0.7rem',
                          height: 22,
                        }}
                      />
                    </Box>
                  )}
                </Box>
              </ListItem>
            ))}
          </List>
        </Box>
      );
    }

    // Additional info about what we received if there's no match above
    console.log(
      `Metrics data type: ${typeof systemMetrics}, isArray: ${Array.isArray(
        systemMetrics
      )}, keys: ${
        typeof systemMetrics === 'object' && systemMetrics !== null
          ? Object.keys(systemMetrics).join(', ')
          : 'none'
      }`
    );

    // If no valid metrics data - custom message for interviewee
    if (role === 'interviewee') {
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            py: 4,
            gap: 2,
          }}
        >
          <MemoryIcon color="disabled" sx={{ fontSize: 48, opacity: 0.5 }} />
          <Box>
            <Typography
              variant="subtitle1"
              color="text.secondary"
              fontWeight="500"
              textAlign="center"
            >
              System Monitoring Active
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 1 }}
              textAlign="center"
            >
              The interviewer can view system metrics during this session.
              <br />
              You can continue with your interview tasks.
            </Typography>
          </Box>
        </Box>
      );
    }

    // Default message for interviewer
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          py: 4,
        }}
      >
        <RefreshIcon
          sx={{ fontSize: 40, color: 'text.secondary', opacity: 0.5, mb: 2 }}
        />
        <Typography variant="body1" color="text.secondary">
          No process metrics available. Click refresh to request metrics.
        </Typography>
      </Box>
    );
  };

  const handleRefreshMetrics = () => {
    if (socket && socket.connected) {
      // Request fresh metrics
      console.log(
        `Requesting fresh metrics for room: ${roomId}, role: ${role}`
      );

      // Show loading state immediately
      setSystemMetrics({ message: 'Requesting updated metrics...' });

      try {
        socket.emit('request-metrics', { roomId: roomId, role: role });
        console.log(`Metrics request sent for room: ${roomId}`);

        // Set a timeout to show an error if no response is received within 5 seconds
        setTimeout(() => {
          // Only show timeout message if we're still in loading state
          if (systemMetrics?.message === 'Requesting updated metrics...') {
            console.warn('Metrics request timed out');
            setSystemMetrics({
              message: 'Request timed out. Please try again.',
            });
          }
        }, 5000);
      } catch (err) {
        console.error('Error sending metrics request:', err);
        setSystemMetrics({
          message: 'Failed to request metrics. Please try again.',
        });
      }
    } else {
      console.error('Socket not connected when trying to refresh metrics');
      setError('Socket not connected. Cannot refresh metrics.');
    }
  };

  return (
    <Container
      maxWidth={false}
      disableGutters
      sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        p: { xs: 1, sm: 1, md: 1.5, lg: 2 },
      }}
    >
      {/* Loading State */}
      {isLoading && (
        <Box
          sx={{
            textAlign: 'center',
            my: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Typography variant="h5" gutterBottom fontWeight="500">
            {!roomId ? 'Creating new room...' : `Joining room ${roomId}...`}
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Please wait while we set up your session
          </Typography>
          <LinearProgress sx={{ width: '50%', borderRadius: 1 }} />
        </Box>
      )}

      {/* Instructions Download Dialog */}
      <Dialog
        open={showInstructionsDialog && !isLoading}
        onClose={handleCloseInstructionsDialog}
        aria-labelledby="instructions-dialog-title"
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          },
        }}
      >
        <DialogTitle id="instructions-dialog-title" sx={{ pb: 1 }}>
          Download Interview Instructions
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Welcome to your interview session! Would you like to download the
            interview instructions file? It contains helpful guidelines for your
            coding interview.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={handleCloseInstructionsDialog}
            sx={{ color: 'text.secondary' }}
          >
            Skip
          </Button>
          <Button
            variant="contained"
            onClick={handleDownloadInstructions}
            startIcon={<DownloadIcon />}
            autoFocus
          >
            Download Instructions
          </Button>
        </DialogActions>
      </Dialog>

      {!isLoading && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            width: '100%',
            height: '100%',
            gap: 1,
          }}
        >
          {/* Code Editor Section - Larger on bigger screens */}
          <Box
            sx={{
              display: 'flex',
              flexGrow: 1,
              flexBasis: { xs: '100%', md: '75%', lg: '80%' },
              height: { xs: 'auto', md: '100%' },
              minHeight: { xs: '60vh', md: 'unset' },
            }}
          >
            <Paper
              elevation={0}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                width: '100%',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  p: { xs: 2, sm: 3 },
                  pb: { xs: 1, sm: 2 },
                }}
              >
                <Typography
                  variant="h5"
                  fontWeight={600}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    color: '#333',
                    fontSize: { xs: '1.2rem', sm: '1.5rem' },
                  }}
                >
                  <span style={{ color: '#3f51b5' }}>&#60; &#62;</span> Code
                  Editor
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  {/* Active Editor Indicator */}
                  {activeEditor && (
                    <Chip
                      size="small"
                      label={`${
                        activeEditor === 'interviewer'
                          ? 'Interviewer'
                          : 'Interviewee'
                      } editing`}
                      color="primary"
                      variant="outlined"
                      sx={{
                        borderRadius: 3,
                        fontSize: '0.7rem',
                        height: 24,
                        borderColor: 'rgba(63, 81, 181, 0.5)',
                      }}
                    />
                  )}

                  {role === 'interviewer' && (
                    <Button
                      variant="contained"
                      color="error"
                      startIcon={<LogoutIcon />}
                      onClick={handleEndSession}
                      size="small"
                      sx={{
                        borderRadius: 3,
                        boxShadow: 'none',
                        px: 2,
                      }}
                    >
                      End Session
                    </Button>
                  )}
                </Box>
              </Box>

              {error && (
                <Alert
                  severity="error"
                  sx={{
                    mx: 3,
                    mb: 2,
                    borderRadius: 2,
                  }}
                >
                  {error}
                </Alert>
              )}

              <Box
                sx={{
                  flex: 1,
                  position: 'relative',
                  px: { xs: 2, sm: 2.5, md: 3 },
                  pb: { xs: 2, sm: 2.5, md: 3 },
                }}
              >
                <TextField
                  multiline
                  fullWidth
                  variant="outlined"
                  value={code}
                  onChange={handleCodeChange}
                  InputProps={{
                    sx: {
                      height: '100%',
                      fontFamily: '"Fira Code", "Roboto Mono", monospace',
                      fontSize: { xs: '14px', sm: '15px', md: '16px' },
                      color: '#3f51b5',
                      backgroundColor: '#f9fafc',
                      borderRadius: 2,
                      padding: { xs: 1.5, sm: 2, md: 2.5 },
                      '& textarea': {
                        lineHeight: '1.5 !important',
                      },
                      '.MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(0, 0, 0, 0.1)',
                        borderWidth: 1,
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(63, 81, 181, 0.3)',
                        borderWidth: 1,
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(63, 81, 181, 0.3)',
                      },
                    },
                  }}
                />
              </Box>
            </Paper>
          </Box>

          {/* Session Info and Stats Section - Smaller on bigger screens */}
          <Box
            sx={{
              display: 'flex',
              flexBasis: { xs: '100%', md: '25%', lg: '20%' },
              flexShrink: 0,
              height: { xs: 'auto', md: '100%' },
              minHeight: { xs: '40vh', md: 'unset' },
            }}
          >
            <Paper
              elevation={0}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                height: '100%',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                borderRadius: 2,
                overflow: { xs: 'visible', md: 'auto' },
              }}
            >
              {/* Session Info Header */}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  p: { xs: 2, sm: 3 },
                  pb: { xs: 1, sm: 2 },
                }}
              >
                <Typography
                  variant="h5"
                  fontWeight={600}
                  color="#333"
                  sx={{
                    fontSize: { xs: '1.2rem', sm: '1.5rem' },
                  }}
                >
                  Session Info
                </Typography>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: isConnected ? '#4caf50' : '#f44336',
                  }}
                />
              </Box>

              {/* Session Info Card */}
              <Box sx={{ px: { xs: 2, sm: 3 } }}>
                <Card
                  variant="outlined"
                  sx={{
                    borderRadius: 2,
                    borderColor: 'rgba(0, 0, 0, 0.08)',
                    boxShadow: 'none',
                  }}
                >
                  <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                    <Box sx={{ mb: 2 }}>
                      <Typography
                        variant="body2"
                        component="div"
                        color="text.secondary"
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          mb: 1,
                        }}
                      >
                        <span>Room ID:</span>
                        <Typography
                          component="span"
                          variant="body1"
                          fontWeight={500}
                        >
                          {roomId}
                        </Typography>
                      </Typography>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Typography
                        variant="body2"
                        component="div"
                        color="text.secondary"
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          mb: 1,
                        }}
                      >
                        <span>Role:</span>
                        <Chip
                          size="small"
                          label={role}
                          color={
                            role === 'interviewer' ? 'primary' : 'secondary'
                          }
                          sx={{
                            height: 26,
                            borderRadius: 4,
                            px: 1,
                          }}
                        />
                      </Typography>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Typography
                        variant="body2"
                        component="div"
                        color="text.secondary"
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <span>Status:</span>
                        <Chip
                          size="small"
                          label={isConnected ? 'Connected' : 'Disconnected'}
                          color={isConnected ? 'success' : 'error'}
                          sx={{
                            height: 26,
                            borderRadius: 4,
                            px: 1,
                          }}
                        />
                      </Typography>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Typography
                        variant="subtitle2"
                        component="div"
                        sx={{
                          mb: 1,
                          color: 'text.primary',
                          fontWeight: 600,
                        }}
                      >
                        Participants Status:
                      </Typography>

                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 1,
                          border: '1px solid',
                          borderColor: 'rgba(0, 0, 0, 0.08)',
                          borderRadius: 1,
                          p: 1,
                          backgroundColor: 'rgba(0, 0, 0, 0.02)',
                        }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <Typography
                            variant="body2"
                            component="div"
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.5,
                            }}
                          >
                            <Box
                              sx={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                bgcolor: interviewerConnected
                                  ? '#4caf50'
                                  : '#f44336',
                              }}
                            />
                            Interviewer
                          </Typography>
                          <Chip
                            size="small"
                            label={interviewerConnected ? 'Online' : 'Offline'}
                            color={interviewerConnected ? 'success' : 'default'}
                            sx={{
                              height: 22,
                              fontSize: '0.7rem',
                              borderRadius: 4,
                            }}
                          />
                        </Box>

                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <Typography
                            variant="body2"
                            component="div"
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.5,
                            }}
                          >
                            <Box
                              sx={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                bgcolor: intervieweeConnected
                                  ? '#4caf50'
                                  : '#f44336',
                              }}
                            />
                            Interviewee
                          </Typography>
                          <Chip
                            size="small"
                            label={intervieweeConnected ? 'Online' : 'Offline'}
                            color={intervieweeConnected ? 'success' : 'default'}
                            sx={{
                              height: 22,
                              fontSize: '0.7rem',
                              borderRadius: 4,
                            }}
                          />
                        </Box>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Box>

              {/* Download Instructions Button */}
              {role === 'interviewee' && (
                <Box sx={{ px: { xs: 2, sm: 3 }, mt: 3 }}>
                  <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={handleDownloadInstructions}
                    sx={{
                      width: '100%',
                      py: 1.5,
                      borderRadius: 3,
                      borderColor: 'rgba(63, 81, 181, 0.5)',
                      color: '#3f51b5',
                      '&:hover': {
                        borderColor: '#3f51b5',
                        backgroundColor: 'rgba(63, 81, 181, 0.04)',
                      },
                    }}
                  >
                    Download Instructions
                  </Button>
                </Box>
              )}

              <Divider sx={{ my: 2, mx: { xs: 2, sm: 3 } }} />

              {/* System Metrics Section */}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  px: { xs: 2, sm: 3 },
                  gap: 1,
                  mb: 1.5,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    component="span"
                    sx={{
                      display: 'flex',
                      color: '#3f51b5',
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect
                        x="2"
                        y="2"
                        width="20"
                        height="8"
                        rx="2"
                        ry="2"
                      ></rect>
                      <rect
                        x="2"
                        y="14"
                        width="20"
                        height="8"
                        rx="2"
                        ry="2"
                      ></rect>
                      <line x1="6" y1="6" x2="6.01" y2="6"></line>
                      <line x1="6" y1="18" x2="6.01" y2="18"></line>
                    </svg>
                  </Box>
                  <Typography
                    variant="h5"
                    fontWeight={600}
                    color="#333"
                    sx={{
                      fontSize: { xs: '1.2rem', sm: '1.5rem' },
                    }}
                  >
                    System Metrics
                  </Typography>
                </Box>

                {role === 'interviewer' && (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleRefreshMetrics}
                    startIcon={<RefreshIcon />}
                    sx={{
                      borderRadius: 3,
                      borderColor: 'rgba(63, 81, 181, 0.5)',
                      color: '#3f51b5',
                      py: 0.5,
                      '&:hover': {
                        borderColor: '#3f51b5',
                        backgroundColor: 'rgba(63, 81, 181, 0.04)',
                      },
                    }}
                  >
                    Refresh
                  </Button>
                )}
              </Box>

              {/* Metrics Display Area */}
              <Box
                sx={{
                  px: { xs: 2, sm: 3 },
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  pb: 2,
                  height: { xs: '300px', md: '100%' },
                  minHeight: '300px',
                }}
              >
                <Card
                  variant="outlined"
                  sx={{
                    borderRadius: 2,
                    borderColor: 'rgba(0, 0, 0, 0.08)',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: 'none',
                    overflow: 'hidden',
                  }}
                >
                  <CardContent
                    sx={{
                      p: { xs: 1, sm: 1.5 },
                      '&:last-child': { pb: { xs: 1, sm: 1.5 } },
                      display: 'flex',
                      flexDirection: 'column',
                      flexGrow: 1,
                      overflow: 'hidden',
                      height: '100%',
                    }}
                  >
                    {role === 'interviewee' ? (
                      <Typography variant="body1" color="text.secondary">
                        No metrics available
                      </Typography>
                    ) : (
                      renderSystemMetrics()
                    )}
                  </CardContent>
                </Card>

                {/* Interview Coder Detection Status - Only show for interviewer */}
                {role === 'interviewer' && (
                  <Box
                    sx={{
                      mt: 2,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      px: { xs: 1, sm: 2 },
                      gap: 1,
                    }}
                  >
                    <Chip
                      icon={<CheckCircleIcon />}
                      label={
                        foundInterviewCoder
                          ? 'Interview Coder Detected'
                          : 'Interview Coder Not Detected'
                      }
                      color={foundInterviewCoder ? 'error' : 'success'}
                      variant={foundInterviewCoder ? 'filled' : 'outlined'}
                      sx={{
                        fontWeight: 500,
                        py: 0.5,
                        height: 36,
                        fontSize: '0.85rem',
                        width: '100%',
                        '& .MuiChip-icon': {
                          color: 'inherit',
                        },
                      }}
                    />

                    {/* Cluely Detection Status */}
                    <Chip
                      icon={<CheckCircleIcon />}
                      label={
                        foundCluely ? 'Cluely Detected' : 'Cluely Not Detected'
                      }
                      color={foundCluely ? 'error' : 'success'}
                      variant={foundCluely ? 'filled' : 'outlined'}
                      sx={{
                        fontWeight: 500,
                        py: 0.5,
                        height: 36,
                        fontSize: '0.85rem',
                        width: '100%',
                        '& .MuiChip-icon': {
                          color: 'inherit',
                        },
                      }}
                    />
                  </Box>
                )}
              </Box>
            </Paper>
          </Box>
        </Box>
      )}
    </Container>
  );
};

export default InterviewSession;

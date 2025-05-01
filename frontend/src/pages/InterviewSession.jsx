import React, { useState, useEffect, useRef } from 'react';
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
  Avatar,
  Backdrop,
  Snackbar,
} from '@mui/material';
import { io } from 'socket.io-client';
import LogoutIcon from '@mui/icons-material/Logout';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import MemoryIcon from '@mui/icons-material/Memory';
import CodeIcon from '@mui/icons-material/Code';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import SendIcon from '@mui/icons-material/Send';
import ChatIcon from '@mui/icons-material/Chat';
import SecurityIcon from '@mui/icons-material/Security';
import ShieldIcon from '@mui/icons-material/Shield';
import MonitorIcon from '@mui/icons-material/Monitor';
import { downloadFile, getOsSpecificScriptPath } from '../utils/fileUtils';
import { useTheme } from '../context/ThemeContext';
import { format } from 'date-fns';
import RadioIcon from '@mui/icons-material/Radio';
import SignalWifiOffIcon from '@mui/icons-material/SignalWifiOff';
import Editor from '@monaco-editor/react';
import shieldIcon from '../assets/shield.png';

// Environment Variables
const ENV = {
  SOCKET_URL: import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001',
  APP_NAME: import.meta.env.VITE_APP_NAME || 'True Interview',
  METRICS_REFRESH_INTERVAL:
    Number(import.meta.env.VITE_METRICS_REFRESH_INTERVAL) || 15000,
  MONITORED_APPS: (
    import.meta.env.VITE_MONITORED_APPS || 'interview coder,cluely'
  ).split(','),
  DEFAULT_THEME: import.meta.env.VITE_DEFAULT_THEME || 'light',
  CODE_EDITOR_FONT: import.meta.env.VITE_CODE_EDITOR_FONT || 'Fira Code',
  ENABLE_CHAT: import.meta.env.VITE_ENABLE_CHAT !== 'false',
  ENABLE_MONITORING: import.meta.env.VITE_ENABLE_MONITORING !== 'false',
  ENABLE_CODE_EDITOR: import.meta.env.VITE_ENABLE_CODE_EDITOR !== 'false',
  DOWNLOAD_URLS: {
    MAC: import.meta.env.VITE_DOWNLOAD_URL_MAC || 'https://drive.google.com/file/d/1uJtJ7AfVgoZZiP6Dkjl4Z38dsiYY0d6C/view?usp=sharing',
    WINDOWS: import.meta.env.VITE_DOWNLOAD_URL_WINDOWS || 'https://drive.google.com/file/d/1h4SghLy_6w4OSP9R1p6Iy8t5QT7XVbRS/view?usp=sharing',
    LINUX: import.meta.env.VITE_DOWNLOAD_URL_LINUX || 'https://drive.google.com/file/d/1IOY-LExai4AzizaZYjWcp7-ElcKupYej/view?usp=drive_link'
  }
};

// Replace SOCKET_URL constant with environment variable
const SOCKET_URL = ENV.SOCKET_URL;

// Default instructions path as an object with path and filename
const INSTRUCTIONS_PATH = {
  path: '/assets/main_mac.py',
  filename: 'main.py',
  isBinary: false,
};

// Custom code editor component with line numbers
const CodeEditorWithLineNumbers = ({ value, onChange, isDarkMode }) => {
  const textAreaRef = useRef(null);
  const lineNumbersRef = useRef(null);
  const [lineCount, setLineCount] = useState(1);

  // Update line count when value changes
  useEffect(() => {
    if (!value) {
      setLineCount(1);
      return;
    }
    const lines = value.split('\n').length;
    setLineCount(Math.max(lines, 1));
  }, [value]);

  // Create an array of line numbers
  const lineNumbers = Array.from(
    { length: lineCount + 3 },
    (_, i) => i + 1
  ).slice(0, lineCount);

  // Handle keydown events - specifically for tab key
  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;

      // Insert 2 spaces for tab
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      onChange({ target: { value: newValue } });

      // Set cursor position after the inserted tab
      setTimeout(() => {
        if (textAreaRef.current) {
          textAreaRef.current.selectionStart = start + 2;
          textAreaRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
  };

  // Sync scrolling between textarea and line numbers
  const handleScroll = (e) => {
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = e.target.scrollTop;
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        height: '100%',
        width: '100%',
        border: '1px solid',
        borderColor: isDarkMode
          ? 'rgba(255, 255, 255, 0.1)'
          : 'rgba(0, 0, 0, 0.1)',
        borderRadius: 2,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Line numbers */}
      <Box
        ref={lineNumbersRef}
        sx={{
          backgroundColor: isDarkMode ? '#1E293B' : '#f1f5f9',
          color: isDarkMode ? '#64748B' : '#94a3b8',
          fontFamily: '"Fira Code", "Roboto Mono", monospace',
          fontSize: { xs: '14px', sm: '15px', md: '16px' },
          lineHeight: 1.5,
          paddingRight: '12px',
          paddingLeft: 0,
          paddingTop: 0,
          paddingBottom: 0,
          textAlign: 'right',
          userSelect: 'none',
          minWidth: '3.5em',
          borderRight: '1px solid',
          borderRightColor: isDarkMode
            ? 'rgba(255, 255, 255, 0.08)'
            : 'rgba(0, 0, 0, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          scrollbarWidth: 'thin',
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: isDarkMode
              ? 'rgba(0, 0, 0, 0.2)'
              : 'rgba(0, 0, 0, 0.05)',
          },
          '&::-webkit-scrollbar-thumb': {
            background: isDarkMode
              ? 'rgba(255, 255, 255, 0.2)'
              : 'rgba(0, 0, 0, 0.2)',
            borderRadius: '4px',
          },
        }}
      >
        {/* Extra padding for better scrolling to first line */}
        <div style={{ height: '2px' }}></div>

        {lineNumbers.map((num) => (
          <div
            key={num}
            style={{
              paddingLeft: '8px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
            }}
          >
            {num}
          </div>
        ))}

        {/* Extra space at bottom for better scrolling */}
        <div style={{ height: '100px' }}></div>
      </Box>

      {/* Code textarea */}
      <Box
        sx={{
          position: 'relative',
          flex: 1,
          height: '100%',
          overflow: 'hidden',
        }}
      >
        <textarea
          ref={textAreaRef}
          value={value}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          style={{
            width: '100%',
            height: '100%',
            fontFamily: '"Fira Code", "Roboto Mono", monospace',
            fontSize: '15px',
            lineHeight: 1.5,
            padding: '2px 8px 100px 8px',
            color: isDarkMode ? '#E2E8F0' : '#3f51b5',
            backgroundColor: isDarkMode ? '#0F172A' : '#f9fafc',
            border: 'none',
            outline: 'none',
            resize: 'none',
            overflowY: 'auto',
            scrollbarWidth: 'thin',
            boxSizing: 'border-box',
          }}
          spellCheck="false"
          placeholder="Start coding here..."
        />
      </Box>
    </Box>
  );
};

const InterviewSession = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { mode, toggleTheme } = useTheme();
  const isDarkMode = mode === 'dark';
  const [socket, setSocket] = useState(null);
  const [code, setCode] = useState('// Start coding here...');
  const [isConnected, setIsConnected] = useState(false);
  const [role, setRole] = useState('');
  const [roomId, setRoomId] = useState('');
  const [sessionKey, setSessionKey] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showInstructionsDialog, setShowInstructionsDialog] = useState(false);
  const [systemMetrics, setSystemMetrics] = useState(null);
  const [foundInterviewCoder, setFoundInterviewCoder] = useState(false);
  const [foundCluely, setFoundCluely] = useState(false);
  const [activeEditor, setActiveEditor] = useState(null);
  const [interviewerConnected, setInterviewerConnected] = useState(false);
  const [intervieweeConnected, setIntervieweeConnected] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [intervieweeOs, setIntervieweeOs] = useState('');
  const chatEndRef = useRef(null);

  useEffect(() => {
    // Get room ID and role from URL params
    const params = new URLSearchParams(location.search);
    const roomIdParam = params.get('roomId');
    const roleParam = params.get('role');

    // Show loading state
    setIsLoading(true);

    // We must have a role at minimum
    if (!roleParam) {
      navigate('/');
      return;
    }

    // For interviewees, we must have a room ID
    if (roleParam === 'interviewee' && !roomIdParam) {
      setError('You must specify a room ID to join as an interviewee');
      setTimeout(() => navigate('/'), 2000);
      return;
    }

    // For interviewers with a room ID, they should be joining an existing room, not creating one
    if (roleParam === 'interviewer' && roomIdParam) {
      // Will join the existing room or receive room-not-found if it doesn't exist
    }

    // Initialize state with any existing room ID (can be null for new room creation)
    setRoomId(roomIdParam || '');
    setRole(roleParam);

    // If interviewee, check if we've already shown instructions for this room
    if (roleParam === 'interviewee') {
      const hasSeenInstructions = localStorage.getItem(
        `instructions-shown-${roomIdParam}`
      );
      if (!hasSeenInstructions) {
        setShowInstructionsDialog(true);
      }
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
      setIsConnected(true);
      setError('');

      // Get OS information
      const clientOs = (() => {
        const userAgent = window.navigator.userAgent.toLowerCase();
        if (userAgent.indexOf('win') !== -1) return 'win32';
        if (userAgent.indexOf('mac') !== -1) return 'darwin';
        if (userAgent.indexOf('linux') !== -1) return 'linux';
        return 'unknown';
      })();

      // Initialize the room based on role
      if (roleParam === 'interviewer') {
        // For interviewer: if we have a URL room ID, try to join it directly
        if (roomIdParam) {
          // Use join-session to attempt to join the existing room
          newSocket.emit('join-session', {
            roomId: roomIdParam,
            role: roleParam,
            os: clientOs,
          });
        } else {
          // Only create a new room if no room ID is specified - this is the only path
          // where room creation should happen
          newSocket.emit('create-room');
        }
      } else if (roomIdParam) {
        // For interviewee: always join the specified room
        newSocket.emit('join-session', {
          roomId: roomIdParam,
          role: roleParam,
          os: clientOs,
        });
      } else {
        setError('You must specify a room ID to join as an interviewee');
        setTimeout(() => navigate('/'), 2000);
      }
    });

    newSocket.on('room-created', (data) => {
      if (!data || !data.roomId) {
        console.error('Invalid room-created event - missing roomId');
        return;
      }

      // Update state with the new room ID and session key
      setRoomId(data.roomId);
      if (data.sessionKey) {
        setSessionKey(data.sessionKey);
      }

      // Update the URL to include the server-generated room ID
      const newUrl = `/session?roomId=${data.roomId}&role=${roleParam}`;

      try {
        window.history.replaceState(null, '', newUrl);
      } catch (e) {
        console.error('Failed to update URL:', e);
      }

      // Join the session with the new room ID
      newSocket.emit('join-session', { roomId: data.roomId, role: roleParam });
    });

    newSocket.on('start-session', () => {
      // Join the session after room is joined
      newSocket.emit('join-session', { roomId: roomIdParam, role: roleParam });
    });

    newSocket.on('session-joined', (data) => {
      // Hide loading state since we're now in a session
      setIsLoading(false);

      // Update connection status based on data
      if (data.interviewerConnected !== undefined) {
        setInterviewerConnected(data.interviewerConnected);
      }
      if (data.intervieweeConnected !== undefined) {
        setIntervieweeConnected(data.intervieweeConnected);
      }

      // Capture session key if present (should only be sent to interviewer)
      if (data.sessionKey) {
        setSessionKey(data.sessionKey);
      }

      if (data.code) {
        setCode(data.code);
        // Save to localStorage
        localStorage.setItem(`code-${roomIdParam}`, data.code);
      }

      // Load chat history if available
      if (data.messages && Array.isArray(data.messages)) {
        setMessages(
          data.messages.map((msg) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
            isFromMe: msg.sender === roleParam,
          }))
        );
      }

      // Store OS information
      if (data.intervieweeOs) {
        setIntervieweeOs(data.intervieweeOs);
      }
    });

    newSocket.on('interviewer-joined', () => {
      setInterviewerConnected(true);
    });

    newSocket.on('interviewer-disconnected', () => {
      setInterviewerConnected(false);
    });

    newSocket.on('interviewee-joined', () => {
      setError('');
      setIntervieweeConnected(true);
    });

    newSocket.on('interviewee-left', () => {
      setIntervieweeConnected(false);
      // Also stop monitoring immediately if interviewee leaves
      setIsMonitoring(false);
    });

    // Add handler for explicit monitoring stopped event
    newSocket.on('monitoring-stopped', (data) => {
      setIsMonitoring(false);
      // Clear system metrics display
      setSystemMetrics({ message: data.message || 'Monitoring stopped' });
    });

    newSocket.on('code-update', (data) => {
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
      if (roleParam === 'interviewer') {
        setError(
          'Room not found. Return to the landing page to create a new room or join a valid existing room.'
        );
      } else {
        setError(
          'Room not found. Please check the room ID provided by your interviewer.'
        );
      }
      setIsLoading(false);
      setTimeout(() => navigate('/'), 3000);
    });

    newSocket.on('room-full', () => {
      setError('This room is no longer available.');
      setTimeout(() => navigate('/'), 2000);
    });

    newSocket.on('room-ended', () => {
      setError('The interview session has ended.');
      // Clear localStorage
      localStorage.removeItem(`code-${roomIdParam}`);
      // Redirect to home after a short delay
      setTimeout(() => {
        navigate('/');
      }, 2000);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      setError('Disconnected from session. Trying to reconnect...');
    });

    newSocket.on('connect_error', (err) => {
      console.error('Connection error:', err);
      setError('Failed to connect to session. Please try again.');
    });

    newSocket.on('processUpdate', (data) => {
      try {
        if (data) {
          if (!data.data) {
            console.error(
              'Received malformed metrics data - missing data property:',
              data
            );
            return;
          }

          // For interviewee, only show messages
          if (roleParam === 'interviewee' && data.data.message) {
            setSystemMetrics(data.data);
            return;
          }

          // Update state with the metrics data for interviewer
          if (roleParam === 'interviewer') {
            setSystemMetrics(data.data);
            setIsMonitoring(true);

            // Check if specific apps are running
            const foundInterviewCoder = data.data.some(
              (app) =>
                app.processName === 'interview coder' && app.isRunning === true
            );
            setFoundInterviewCoder(foundInterviewCoder);

            const foundCluelyApp = data.data.some(
              (app) => app.processName === 'cluely' && app.isRunning === true
            );
            setFoundCluely(foundCluelyApp);
          }
        }
      } catch (err) {
        console.error('Error processing metrics update:', err);
      }
    });

    // Handle interviewer-specific broadcast
    newSocket.on('processUpdate-interviewers', (data) => {
      if (data && data.roomId === roomIdParam && roleParam === 'interviewer') {
        if (!data.data) {
          console.error('Missing data property in metrics update:', data);
          return;
        }
        setSystemMetrics(data.data);
        setIsMonitoring(true);

        // Check if specific apps are running
        const foundInterviewCoder = data.data.some(
          (app) =>
            app.processName === 'interview coder' && app.isRunning === true
        );
        setFoundInterviewCoder(foundInterviewCoder);

        const foundCluelyApp = data.data.some(
          (app) => app.processName === 'cluely' && app.isRunning === true
        );
        setFoundCluely(foundCluelyApp);
      }
    });

    // We no longer need the universal broadcast since it's only for interviewers now
    newSocket.on('processUpdate-all', () => {
      // No action, we're using more targeted channels now
    });

    // Add reconnect event handling to maintain state during reconnections
    newSocket.on('reconnect', () => {
      setIsConnected(true);
      setError('');

      // Re-join the session with current state
      if (roomId && role) {
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
      if (data && data.activeEditor) {
        setActiveEditor(data.activeEditor);
      }
    });

    setSocket(newSocket);

    // Use environment variables for metrics refresh interval
    let metricsRefreshInterval = null;
    if (roleParam === 'interviewer') {
      metricsRefreshInterval = setInterval(() => {
        if (newSocket && newSocket.connected) {
          const currentRoomId = roomIdParam;
          if (currentRoomId && currentRoomId.trim() !== '') {
            newSocket.emit('request-metrics', {
              roomId: currentRoomId,
              role: roleParam,
            });
          }
        }
      }, ENV.METRICS_REFRESH_INTERVAL);
    }

    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }

      if (metricsRefreshInterval) {
        clearInterval(metricsRefreshInterval);
      }
    };
  }, [location, navigate]);

  // Refresh metrics initially when component mounts
  useEffect(() => {
    // Only for interviewer role and when socket is already connected
    if (role === 'interviewer' && socket && socket.connected) {
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

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Monitoring status timeout effect
  useEffect(() => {
    if (isMonitoring) {
      const timer = setTimeout(() => {
        setIsMonitoring(false);
      }, 5000); // Reset monitoring status after 5 seconds of no data

      return () => clearTimeout(timer);
    }
  }, [isMonitoring, systemMetrics]);

  const handleCodeChange = (event) => {
    const newCode = event.target.value;
    setCode(newCode);

    // Allow both roles to update code in the room
    if (socket && socket.connected) {
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
      // Choose the appropriate file based on the interviewee's OS or current user's OS
      const scriptInfo =
        role === 'interviewee'
          ? getOsSpecificScriptPath(
              (() => {
                const userAgent = window.navigator.userAgent.toLowerCase();
                if (userAgent.indexOf('win') !== -1) return 'win32';
                if (userAgent.indexOf('mac') !== -1) return 'darwin';
                if (userAgent.indexOf('linux') !== -1) return 'linux';
                return 'unknown';
              })()
            )
          : intervieweeOs
          ? getOsSpecificScriptPath(intervieweeOs)
          : INSTRUCTIONS_PATH;

      // Download the file without any replacements
      const success = await downloadFile(
        scriptInfo.path,
        scriptInfo.filename,
        scriptInfo.isBinary || false
      );

      if (!success) {
        setError('Failed to download instructions. Please try again.');
      }

      // Store in localStorage that we've shown instructions for this room
      if (roomId) {
        localStorage.setItem(`instructions-shown-${roomId}`, 'true');
      }

      setShowInstructionsDialog(false);
    } catch (error) {
      console.error('Error in download:', error);
      setError('An error occurred while downloading instructions.');
      setShowInstructionsDialog(false);
    }
  };

  const handleCloseInstructionsDialog = () => {
    // Store in localStorage that we've shown instructions for this room
    if (roomId) {
      localStorage.setItem(`instructions-shown-${roomId}`, 'true');
    }

    setShowInstructionsDialog(false);
  };

  // Add chat message handler
  const handleSendMessage = () => {
    if (currentMessage.trim() === '') return;

    if (socket && socket.connected && roomId) {
      const messageData = {
        roomId,
        message: currentMessage,
        sender: role,
        timestamp: new Date(),
      };
      socket.emit('chat-message', messageData);
      setCurrentMessage('');
    }
  };

  // Handle Enter key press in chat input
  const handleChatKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Replace renderSystemMetrics with renderChatBox
  const renderChatBox = () => {
    return (
      <Box
        sx={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Chat messages area */}
        <Box
          sx={{
            p: 1.5,
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            borderBottom: '1px solid',
            borderColor: isDarkMode
              ? 'rgba(255, 255, 255, 0.08)'
              : 'rgba(0, 0, 0, 0.08)',
          }}
        >
          {messages.length === 0 ? (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                opacity: 0.7,
              }}
            >
              <ChatIcon
                sx={{
                  fontSize: 40,
                  mb: 1,
                  color: isDarkMode ? '#96a7ff' : 'text.secondary',
                }}
              />
              <Typography
                variant="body2"
                color={isDarkMode ? '#c9d1ff' : 'text.secondary'}
              >
                No messages yet. Send a message to start the conversation.
              </Typography>
            </Box>
          ) : (
            messages.map((msg) => (
              <Box
                key={msg.id}
                sx={{
                  alignSelf: msg.isFromMe ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <Box
                  sx={{
                    backgroundColor: msg.isFromMe
                      ? isDarkMode
                        ? '#4050b5'
                        : 'primary.main'
                      : isDarkMode
                      ? 'rgba(255, 255, 255, 0.1)'
                      : 'rgba(0, 0, 0, 0.05)',
                    color: msg.isFromMe
                      ? '#ffffff'
                      : isDarkMode
                      ? '#e1e5fa'
                      : 'text.primary',
                    borderRadius: '16px',
                    px: 2,
                    py: 1,
                    maxWidth: '100%',
                    wordBreak: 'break-word',
                  }}
                >
                  <Typography variant="body2">{msg.message}</Typography>
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: msg.isFromMe ? 'flex-end' : 'flex-start',
                    mt: 0.5,
                    gap: 1,
                  }}
                >
                  <Typography
                    variant="caption"
                    color={
                      isDarkMode ? 'rgba(255, 255, 255, 0.6)' : 'text.secondary'
                    }
                    fontSize="0.7rem"
                  >
                    {format(msg.timestamp, 'h:mm a')}
                  </Typography>
                  <Typography
                    variant="caption"
                    color={
                      isDarkMode ? 'rgba(255, 255, 255, 0.6)' : 'text.secondary'
                    }
                    fontSize="0.7rem"
                  >
                    {msg.sender === 'interviewer'
                      ? 'Interviewer'
                      : 'Interviewee'}
                  </Typography>
                </Box>
              </Box>
            ))
          )}
          <div ref={chatEndRef} />
        </Box>

        {/* Chat input area */}
        <Box
          sx={{
            p: 1.5,
            display: 'flex',
            gap: 1,
          }}
        >
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Type a message..."
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            onKeyPress={handleChatKeyPress}
            size="small"
            multiline
            maxRows={3}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '20px',
                backgroundColor: isDarkMode
                  ? 'rgba(255, 255, 255, 0.05)'
                  : 'rgba(0, 0, 0, 0.03)',
              },
            }}
          />
          <IconButton
            color="primary"
            onClick={handleSendMessage}
            disabled={currentMessage.trim() === ''}
            sx={{
              height: 40,
              width: 40,
              backgroundColor: 'primary.main',
              color: 'white',
              '&:hover': {
                backgroundColor: 'primary.dark',
              },
              '&.Mui-disabled': {
                backgroundColor: isDarkMode
                  ? 'rgba(255, 255, 255, 0.1)'
                  : 'rgba(0, 0, 0, 0.1)',
                color: isDarkMode
                  ? 'rgba(255, 255, 255, 0.3)'
                  : 'rgba(0, 0, 0, 0.3)',
              },
            }}
          >
            <SendIcon fontSize="small" />
          </IconButton>
        </Box>
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

  // Update the chat message handler in useEffect
  useEffect(() => {
    if (!socket) return;

    const chatMessageHandler = (data) => {
      const { sender, message, timestamp, userId } = data;

      // Correctly determine if the message is from the current user
      const isFromMe = userId === socket.id;

      // Use the sender field directly from the message data
      const messageSender =
        sender ||
        (isFromMe
          ? role
          : role === 'interviewer'
          ? 'interviewee'
          : 'interviewer');

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          message,
          timestamp: new Date(timestamp),
          sender: messageSender,
          isFromMe,
        },
      ]);
    };

    socket.on('chat-message', chatMessageHandler);

    return () => {
      socket.off('chat-message', chatMessageHandler);
    };
  }, [socket, role]);

  return (
    <Container
      maxWidth={false}
      disableGutters
      sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        p: { xs: 1, sm: 1, md: 1.5, lg: 2 },
        overflow: 'auto',
      }}
    >
      {/* Loading State with True Interview branding */}
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
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              mb: 2,
            }}
          >
            <Box
              component="img"
              src={shieldIcon}
              sx={{
                width: 40,
                height: 40,
              }}
            />
            <Typography variant="h4" fontWeight="600" color="primary">
              {ENV.APP_NAME}
            </Typography>
          </Box>
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
            flex: 1,
            minHeight: { xs: 'auto', md: '600px' },
          }}
        >
          {/* Code Editor Section - Larger on bigger screens */}
          <Box
            sx={{
              display: 'flex',
              flexGrow: 1,
              flexBasis: { xs: '100%', md: '75%', lg: '80%' },
              height: { xs: 'calc(100vh - 180px)', md: '100%' },
              minHeight: { xs: '500px', md: 'unset' },
              overflow: 'hidden',
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
                  position: 'sticky',
                  top: 0,
                  backgroundColor: isDarkMode ? '#0F172A' : '#ffffff',
                  zIndex: 10,
                  borderBottom: '1px solid',
                  borderBottomColor: isDarkMode
                    ? 'rgba(255, 255, 255, 0.1)'
                    : 'rgba(0, 0, 0, 0.08)',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    component="img"
                    src={shieldIcon}
                    sx={{
                      width: 24,
                      height: 24,
                    }}
                  />
                  <Typography
                    variant="h5"
                    fontWeight={600}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      color: isDarkMode ? '#E2E8F0' : '#333',
                      fontSize: { xs: '1.2rem', sm: '1.5rem' },
                    }}
                  >
                    {ENV.APP_NAME}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  {/* Theme Toggle Button */}
                  <Tooltip
                    title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
                  >
                    <IconButton
                      size="small"
                      onClick={toggleTheme}
                      color="primary"
                      sx={{ mr: 1 }}
                    >
                      {isDarkMode ? <Brightness7Icon /> : <Brightness4Icon />}
                    </IconButton>
                  </Tooltip>

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
                  px: 0,
                  pb: 0,
                  pt: 0,
                  display: 'flex',
                  height: '100%',
                  overflow: 'hidden',
                }}
              >
                <CodeEditorWithLineNumbers
                  value={code}
                  onChange={handleCodeChange}
                  isDarkMode={isDarkMode}
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
                  color={isDarkMode ? '#e1e5fa' : '#333'}
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
                    borderColor: isDarkMode
                      ? 'rgba(255, 255, 255, 0.08)'
                      : 'rgba(0, 0, 0, 0.08)',
                    boxShadow: 'none',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: isDarkMode
                        ? '0 8px 16px rgba(0,0,0,0.4)'
                        : '0 8px 16px rgba(0,0,0,0.1)',
                    },
                  }}
                >
                  <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                    <Box sx={{ mb: 2 }}>
                      <Typography
                        variant="body2"
                        component="div"
                        color={
                          isDarkMode
                            ? 'rgba(255, 255, 255, 0.7)'
                            : 'text.secondary'
                        }
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
                          color={isDarkMode ? '#e1e5fa' : 'text.primary'}
                        >
                          {roomId}
                        </Typography>
                      </Typography>
                    </Box>

                    {/* Display Session Key for interviewer only */}
                    {role === 'interviewer' && sessionKey && (
                      <Box sx={{ mb: 2 }}>
                        <Typography
                          variant="body2"
                          component="div"
                          color={
                            isDarkMode
                              ? 'rgba(255, 255, 255, 0.7)'
                              : 'text.secondary'
                          }
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            mb: 1,
                          }}
                        >
                          <span>Session Key:</span>
                          <Typography
                            component="span"
                            variant="body1"
                            fontWeight={500}
                            color={isDarkMode ? '#96a7ff' : 'primary'}
                          >
                            {sessionKey}
                          </Typography>
                        </Typography>
                        <Typography
                          variant="caption"
                          color={
                            isDarkMode
                              ? 'rgba(255, 255, 255, 0.5)'
                              : 'text.secondary'
                          }
                          sx={{ display: 'block', textAlign: 'right' }}
                        >
                          Give this key to the interviewee
                        </Typography>
                      </Box>
                    )}

                    <Box sx={{ mb: 2 }}>
                      <Typography
                        variant="body2"
                        component="div"
                        color={
                          isDarkMode
                            ? 'rgba(255, 255, 255, 0.7)'
                            : 'text.secondary'
                        }
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
                        color={
                          isDarkMode
                            ? 'rgba(255, 255, 255, 0.7)'
                            : 'text.secondary'
                        }
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
                          color: isDarkMode ? '#e1e5fa' : 'text.primary',
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
                          borderColor: isDarkMode
                            ? 'rgba(255, 255, 255, 0.1)'
                            : 'rgba(0, 0, 0, 0.08)',
                          borderRadius: 1,
                          p: 1,
                          backgroundColor: isDarkMode
                            ? 'rgba(255, 255, 255, 0.03)'
                            : 'rgba(0, 0, 0, 0.02)',
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
                              color: isDarkMode ? '#e1e5fa' : 'inherit',
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
                              color:
                                !interviewerConnected && isDarkMode
                                  ? 'rgba(255, 255, 255, 0.8)'
                                  : undefined,
                              backgroundColor:
                                !interviewerConnected && isDarkMode
                                  ? 'rgba(255, 255, 255, 0.1)'
                                  : undefined,
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
                              color: isDarkMode ? '#e1e5fa' : 'inherit',
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
                              color:
                                !intervieweeConnected && isDarkMode
                                  ? 'rgba(255, 255, 255, 0.8)'
                                  : undefined,
                              backgroundColor:
                                !intervieweeConnected && isDarkMode
                                  ? 'rgba(255, 255, 255, 0.1)'
                                  : undefined,
                            }}
                          />
                        </Box>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Box>

              {/* Download Instructions Button with improved styling */}
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
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        borderColor: '#3f51b5',
                        backgroundColor: 'rgba(63, 81, 181, 0.04)',
                        transform: 'translateY(-2px)',
                        boxShadow: isDarkMode
                          ? '0 4px 12px rgba(63, 81, 181, 0.3)'
                          : '0 4px 12px rgba(63, 81, 181, 0.2)',
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
                      color: isDarkMode ? '#96a7ff' : '#3f51b5',
                    }}
                  >
                    <ChatIcon />
                  </Box>
                  <Typography
                    variant="h5"
                    fontWeight={600}
                    color={isDarkMode ? '#e1e5fa' : '#333'}
                    sx={{
                      fontSize: { xs: '1.2rem', sm: '1.5rem' },
                    }}
                  >
                    Chat
                  </Typography>
                </Box>
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
                    borderColor: isDarkMode
                      ? 'rgba(255, 255, 255, 0.08)'
                      : 'rgba(0, 0, 0, 0.08)',
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
                      p: 0,
                      '&:last-child': { pb: 0 },
                      display: 'flex',
                      flexDirection: 'column',
                      flexGrow: 1,
                      overflow: 'hidden',
                      height: '100%',
                    }}
                  >
                    {ENV.ENABLE_CHAT && renderChatBox()}
                  </CardContent>
                </Card>

                {/* True Interview Detection Status - Only show for interviewer */}
                {role === 'interviewer' && ENV.ENABLE_MONITORING && (
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
                      icon={<SecurityIcon />}
                      label={
                        foundInterviewCoder
                          ? `${ENV.MONITORED_APPS[0]} Running`
                          : `No ${ENV.MONITORED_APPS[0]} Detected`
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

                    <Chip
                      icon={<SecurityIcon />}
                      label={
                        foundCluely
                          ? `${ENV.MONITORED_APPS[1]} Running`
                          : `No ${ENV.MONITORED_APPS[1]} Detected`
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

                    {/* Monitoring Status with animated icon */}
                    <Chip
                      icon={
                        isMonitoring ? (
                          <MonitorIcon
                            sx={{
                              animation: 'monitor-pulse 1.5s infinite',
                              '@keyframes monitor-pulse': {
                                '0%': {
                                  opacity: 1,
                                },
                                '50%': {
                                  opacity: 0.5,
                                },
                                '100%': {
                                  opacity: 1,
                                },
                              },
                            }}
                          />
                        ) : (
                          <SignalWifiOffIcon />
                        )
                      }
                      label={
                        isMonitoring
                          ? 'Interviewee Being Monitored'
                          : 'Interviewee Not Monitored'
                      }
                      color={isMonitoring ? 'success' : 'default'}
                      variant={isMonitoring ? 'filled' : 'outlined'}
                      sx={{
                        fontWeight: 500,
                        py: 0.5,
                        height: 36,
                        fontSize: '0.85rem',
                        width: '100%',
                        '& .MuiChip-icon': {
                          color: 'inherit',
                        },
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: 2,
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

      {/* Add a fixed button for interviewer to end session - visible when scrolled down */}
      {role === 'interviewer' && (
        <Button
          variant="contained"
          color="error"
          onClick={handleEndSession}
          size="small"
          startIcon={<LogoutIcon />}
          sx={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            zIndex: 1000,
            borderRadius: 30,
            boxShadow: isDarkMode
              ? '0 4px 20px rgba(239, 83, 80, 0.3)'
              : '0 4px 20px rgba(0, 0, 0, 0.15)',
            paddingLeft: 2,
            paddingRight: 2,
            backgroundColor: isDarkMode ? '#ef5350' : undefined,
            '&:hover': {
              backgroundColor: isDarkMode ? '#d32f2f' : undefined,
            },
          }}
        >
          End Session
        </Button>
      )}
    </Container>
  );
};

export default InterviewSession;

# True Interview

A real-time coding interview platform with system metrics monitoring.

## Features

- Real-time code sharing between interviewer and interviewee
- System metrics monitoring (CPU, Memory, Network)
- Secure room-based sessions
- Intuitive UI for both interviewers and interviewees

## System Metrics Collection

The platform allows interviewees to submit their system metrics data which can be viewed by the interviewer in real-time.

### For Interviewees

1. Join an interview session as an interviewee.
2. Use the "Submit Process Metrics" form at the bottom of the metrics panel.
3. Submit your process data in JSON format using the following structure:

```json
[
  {
    "processName": "chrome",
    "cpu": 10.5,
    "memory": 1048576
  },
  {
    "processName": "node",
    "cpu": 5.2,
    "memory": 524288
  }
]
```

4. Click "Send Process Data" to submit your metrics to the interviewer.

### For Interviewers

1. Join or create an interview session as an interviewer.
2. System metrics will be displayed in the metrics panel.
3. Click "Refresh" to manually request the latest metrics.
4. Metrics are also automatically refreshed every 15 seconds.

## API Endpoints

The platform exposes the following API endpoints:

- `POST /send_processes/:roomId` - Submit process metrics data for a specific room ID

## Socket Events

The platform uses Socket.IO for real-time communication:

- `join-session` - Join an existing session
- `create-room` - Create a new room
- `code-update` - Send code updates
- `processUpdate` - Receive process metrics updates
- `processUpdate-interviewers` - Receive process metrics updates (interviewer-only)
- `request-metrics` - Request latest metrics for a room

## Setup and Installation

(Include setup instructions here)

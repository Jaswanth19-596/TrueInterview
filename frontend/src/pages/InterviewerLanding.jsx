import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/InterviewPages.css';
import { AddCircle } from '@mui/icons-material';

const InterviewerLanding = () => {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState('');

  const handleCreateRoom = () => {
    navigate(`/session?role=interviewer`);
  };

  const handleJoinRoom = () => {
    if (roomId.trim()) {
      navigate(`/session?roomId=${roomId.trim()}&role=interviewer`);
    }
  };

  return (
    <div className="interview-page">
      <div className="interview-container">
        <div className="interview-card">
          <div className="interview-header">
            <h1 className="interview-title">Interview Room</h1>
            <p className="interview-subtitle">Create a new room or join an existing one</p>
          </div>

          <button
            className="btn btn-primary"
            onClick={handleCreateRoom}
          >
            <AddCircle style={{ marginRight: '8px' }} />
            Create New Room
          </button>

          <div className="divider">OR</div>

          <div className="form-group">
            <h3>Join Existing Room</h3>
            <input
              type="text"
              className="input-field"
              placeholder="Enter Room ID"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
            />
            <button
              className="btn btn-secondary"
              onClick={handleJoinRoom}
              disabled={!roomId.trim()}
            >
              Join Room
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewerLanding;

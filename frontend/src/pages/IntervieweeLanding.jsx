import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/InterviewPages.css';

const IntervieweeLanding = () => {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState('');

  const handleJoinRoom = () => {
    if (roomId.trim()) {
      navigate(`/session?roomId=${roomId.trim()}&role=interviewee`);
    }
  };

  return (
    <div className="interview-page">
      <div className="interview-container">
        <div className="interview-card">
          <div className="interview-header">
            <h1 className="interview-title">Join Interview Session</h1>
            <p className="interview-subtitle">Enter the room ID provided by your interviewer</p>
          </div>

          <div className="form-group">
            <input
              type="text"
              className="input-field"
              placeholder="Enter Room ID"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              autoFocus
            />
          </div>

          <button
            className="btn btn-primary"
            onClick={handleJoinRoom}
            disabled={!roomId.trim()}
          >
            Join Room
          </button>
        </div>
      </div>
    </div>
  );
};

export default IntervieweeLanding;

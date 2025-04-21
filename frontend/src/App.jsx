import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import RoleSelection from './pages/RoleSelection';
import InterviewSession from './pages/InterviewSession';
import InterviewerLanding from './pages/InterviewerLanding';
import IntervieweeLanding from './pages/IntervieweeLanding';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<RoleSelection />} />
        <Route path="/interviewer" element={<InterviewerLanding />} />
        <Route path="/interviewee" element={<IntervieweeLanding />} />
        <Route path="/session" element={<InterviewSession />} />
      </Routes>
    </Router>
  );
}

export default App;

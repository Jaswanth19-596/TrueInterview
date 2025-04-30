import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/LandingPage.css';
import shieldLogo from '../assets/shield.png';

const LandingPage = () => {
  return (
    <div className="landing-page">
      <header className="header">
        <div className="container">
          <div className="logo-container">
            <img src={shieldLogo} alt="TrueInterview Logo" className="logo" />
            <div className="title-container">
              <h1>TrueInterview</h1>
              <p className="tagline">AI-Powered Coding Interview Proctor</p>
            </div>
          </div>
        </div>
      </header>

      <main className="main-content">
        <section className="hero">
          <div className="container">
            <h2>Secure and Fair Coding Interviews</h2>
            <p>Ensure the integrity of your technical interviews with our AI-powered proctoring system</p>
            <div className="cta-buttons">
              <Link to="/interviewer" className="btn btn-primary">Start as Interviewer</Link>
              <Link to="/interviewee" className="btn btn-secondary">Join as Interviewee</Link>
            </div>
          </div>
        </section>

        <section className="features">
          <div className="container">
            <h2>How It Works</h2>
            <div className="feature-grid">
              <div className="feature-card">
                <div className="feature-icon">1</div>
                <h3>Create Interview Session</h3>
                <p>Interviewers create a unique session and receive a room ID to share with candidates</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">2</div>
                <h3>Join the Room</h3>
                <p>Candidates enter the room ID to join the interview session</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">3</div>
                <h3>AI Monitoring</h3>
                <p>Our secure script monitors for any AI tool usage during the interview</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">4</div>
                <h3>Real-time Proctoring</h3>
                <p>Interviewers receive instant notifications if any AI assistance is detected</p>
              </div>
            </div>
          </div>
        </section>

        <section className="benefits">
          <div className="container">
            <h2>Why Choose TrueInterview?</h2>
            <div className="benefits-grid">
              <div className="benefit-card">
                <h3>Fair Assessment</h3>
                <p>Ensure candidates are evaluated based on their true coding abilities</p>
              </div>
              <div className="benefit-card">
                <h3>Easy Setup</h3>
                <p>Simple and intuitive interface for both interviewers and candidates</p>
              </div>
              <div className="benefit-card">
                <h3>Secure Monitoring</h3>
                <p>Non-intrusive monitoring that respects privacy while maintaining integrity</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-logo">
              <img src={shieldLogo} alt="TrueInterview Logo" className="footer-logo-img" />
              <div className="footer-title">
                <h3>TrueInterview</h3>
                <p className="footer-tagline">Coding Interview Proctor</p>
              </div>
            </div>
            <div className="footer-description">
              <p>TrueInterview is a cutting-edge platform that ensures fair and secure coding interviews by monitoring AI tool usage in real-time. Our mission is to maintain the integrity of technical assessments while providing a seamless experience for both interviewers and candidates.</p>
            </div>
            <div className="footer-copyright">
              <p>&copy; 2025 TrueInterview. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage; 
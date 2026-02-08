// C:\satvik\legal\gen-AI-projects\rag-bank\frontend\src\App.jsx
import React, { useState, useEffect } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';
import ResultsDisplay from './components/ResultsDisplay';
import QueryForm from './components/QueryForm';

// Simple components
const Navbar = () => (
  <nav className="navbar navbar-dark bg-dark mb-4">
    <div className="container">
      <a className="navbar-brand" href="#">
        <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>Regu</span>
        <span style={{ color: '#2196F3', fontWeight: 'bold' }}>Lens</span>
        <small className="ms-2 text-light">COREP Assistant</small>
      </a>
    </div>
  </nav>
);

const StatusBanner = ({ status, onInitialize }) => (
  <div className="alert alert-info mb-4">
    <div className="d-flex justify-content-between align-items-center">
      <div>
        <strong>System Status:</strong> {status?.status || 'Checking...'}
        <span className="ms-3">
          <strong>Mode:</strong> {status?.mode || (status?.groq_available ? 'RAG' : 'Mock')}
        </span>
      </div>
      {status && !status.initialized && (
        <button 
          className="btn btn-warning btn-sm"
          onClick={onInitialize}
        >
          Initialize System
        </button>
      )}
    </div>
  </div>
);

const App = () => {
  const [systemStatus, setSystemStatus] = useState(null);
  const [activeTab, setActiveTab] = useState('query');
  const [queryResult, setQueryResult] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  console.log("API_BASE:", API_BASE);
  console.log("VITE:", import.meta.env.VITE_API_URL);



  useEffect(() => {
    checkHealth();
  }, []);

  const showToast = (message, type = 'info') => {
    const toastOptions = {
      position: "top-right",
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    };

    switch (type) {
      case 'success':
        toast.success(message, toastOptions);
        break;
      case 'error':
        toast.error(message, toastOptions);
        break;
      case 'warning':
        toast.warning(message, toastOptions);
        break;
      case 'info':
        toast.info(message, toastOptions);
        break;
      default:
        toast(message, toastOptions);
    }
  };

  const checkHealth = async () => {
    try {
      const response = await fetch(`${API_BASE}/health`);
      const data = await response.json();
      setSystemStatus(data);
    } catch (err) {
      showToast('Cannot connect to backend server. Make sure it is running on port 8000.', 'error');
    }
  };

  const handleInitialize = async () => {
    try {
      const response = await fetch(`${API_BASE}/initialize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force_recreate: false })
      });
      const data = await response.json();
      showToast(data.message || 'System initialized successfully', 'success');
      checkHealth();
    } catch (err) {
      showToast('Failed to initialize system: ' + err.message, 'error');
    }
  };

  const handleTabClick = (tab) => {
    setActiveTab(tab);
    if (tab !== 'query') {
      setShowResults(false);
    }
  };

  const handleQueryResponse = (result) => {
    setQueryResult(result);
    setShowResults(true);
    showToast('COREP response generated successfully!', 'success');
  };

  const handleCloseResults = () => {
    setShowResults(false);
    setQueryResult(null);
  };

  return (
    <div className="App">
      <ToastContainer />
      <Navbar />
      
      <div className="container-fluid">
        <header className="text-center mb-4">
          <h1 className="text-primary mb-2">PRA COREP Reporting Assistant</h1>
          <p className="lead text-muted">
            LLM-assisted regulatory reporting for UK banks. Focused on templates C 01.00 and C 14.00.
          </p>
        </header>

        <StatusBanner status={systemStatus} onInitialize={handleInitialize} />

        {/* Tab Navigation */}
        <ul className="nav nav-tabs mb-4">
          <li className="nav-item">
            <button 
              className={`nav-link ${activeTab === 'query' ? 'active' : ''}`}
              onClick={() => handleTabClick('query')}
            >
              Submit Query
            </button>
          </li>
          <li className="nav-item">
            <button 
              className={`nav-link ${activeTab === 'templates' ? 'active' : ''}`}
              onClick={() => handleTabClick('templates')}
            >
              Templates
            </button>
          </li>
          <li className="nav-item">
            <a className="nav-link" href={`${API_BASE}/docs`} target="_blank" rel="noopener noreferrer">
              API Docs
            </a>
          </li>
        </ul>

        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === 'query' && (
            <div className="tab-pane fade show active">
              {!showResults ? (
                <QueryForm
                  systemStatus={systemStatus}
                  onError={(msg) => showToast(msg, 'error')}
                  onResponse={handleQueryResponse}
                  apiBase = {API_BASE}
                />
              ) : (
                <div className="results-container">
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <h3 className="text-primary">
                      <i className="bi bi-check-circle me-2 text-success"></i>
                      COREP Response Generated
                    </h3>
                    <button 
                      className="btn btn-outline-secondary"
                      onClick={handleCloseResults}
                    >
                      <i className="bi bi-arrow-left me-1"></i>
                      Back to Query
                    </button>
                  </div>
                  <ResultsDisplay 
                    results={queryResult} 
                    onClose={handleCloseResults}
                  />
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'templates' && (
            <div className="tab-pane fade show active">
              <TemplateInfo />
            </div>
          )}
        </div>

        <footer className="mt-5 pt-4 border-top text-center text-muted">
          <p>
            <strong>ReguLens COREP Assistant</strong> | 
            Prototype for PRA Regulatory Reporting | 
            Restricted to templates C 01.00 and C 14.00
          </p>
          <p className="small">
            This tool assists with regulatory interpretation but does not constitute legal advice.
            Always verify with qualified compliance professionals.
          </p>
        </footer>
      </div>
    </div>
  );
};



// TemplateInfo component
const TemplateInfo = () => {
  const templates = [
    {
      code: 'C 01.00',
      name: 'Own Funds',
      description: 'Reporting of own funds and capital requirements',
      purpose: 'To report the institution\'s own funds, capital requirements, and capital buffers.',
      fields: [
        'Common Equity Tier 1 capital',
        'Additional Tier 1 capital',
        'Tier 2 capital',
        'Total capital',
        'Total risk exposure amount',
        'Capital ratios'
      ],
      regulations: ['CRR Articles 25-30', 'CRR Articles 36-41', 'PRA Rulebook GENPRU 2.2']
    },
    {
  code: 'C 14.00',
  name: 'Leverage Ratio',
  description: 'Reporting of leverage ratio and leverage exposure',
  purpose: 'To monitor excessive leverage under CRR Article 429',
  fields: [
    'Tier 1 Capital',
    'Total Exposure Measure',
    'Leverage Ratio'
  ],
  regulations: [
    'CRR Article 429',
    'PRA Rulebook – Leverage Ratio'
  ]
}

  ];

  return (
    <div className="card shadow-sm">
      <div className="card-header bg-primary text-white">
        <h4 className="mb-0">COREP Template Reference</h4>
      </div>
      <div className="card-body">
        <div className="alert alert-info mb-4">
          ReguLens is restricted to templates <strong>C 01.00</strong> and <strong>C 14.00</strong> as per the prototype requirements.
        </div>

        <div className="row">
          {templates.map((template, index) => (
            <div key={index} className="col-md-6 mb-4">
              <div className="card h-100">
                <div className="card-header">
                  <h5 className="mb-0">{template.code} - {template.name}</h5>
                </div>
                <div className="card-body">
                  <p><strong>Description:</strong> {template.description}</p>
                  <p><strong>Purpose:</strong> {template.purpose}</p>
                  
                  <h6 className="mt-3">Key Fields:</h6>
                  <ul>
                    {template.fields.map((field, idx) => (
                      <li key={idx}><small>{field}</small></li>
                    ))}
                  </ul>
                  
                  <h6 className="mt-3">Relevant Regulations:</h6>
                  <ul className="mb-0">
                    {template.regulations.map((regulation, idx) => (
                      <li key={idx}><small>{regulation}</small></li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <h5>Template Comparison</h5>
          <table className="table table-bordered">
            <thead>
              <tr>
                <th>Feature</th>
                <th>C 01.00 - Own Funds</th>
                <th>C 14.00 - Large Exposures</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Primary Purpose</td>
                <td>Capital adequacy assessment</td>
                <td>Counterparty risk concentration</td>
              </tr>
              <tr>
                <td>Key Metric</td>
                <td>Capital ratios (CET1, Tier 1, Total)</td>
                <td>Exposure as % of eligible capital</td>
              </tr>
              <tr>
                <td>Main Regulation</td>
                <td>CRR Articles 25-41</td>
                <td>CRR Articles 395-403</td>
              </tr>
              <tr>
                <td>Reporting Frequency</td>
                <td>Quarterly</td>
                <td>Quarterly</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default App;
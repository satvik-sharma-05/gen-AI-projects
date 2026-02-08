import React, { useState } from 'react';
import { Form, Button, Card, Row, Col, Spinner, Alert } from 'react-bootstrap';

const QueryForm = ({ onResult, onError, systemStatus, apiBase }) => {
  const [formData, setFormData] = useState({
    question: '',
    scenario_description: '',
    template: 'C 01.00',
    institution_name: 'UK Banking Corporation',
    reporting_date: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(false);
  const API_BASE = import.meta.env.VITE_API_URL || apiBase || 'http://localhost:8000';
  console.log("QueryForm API_BASE:", API_BASE);
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Validate form
    if (!formData.question.trim()) {
      onError('Please enter a regulatory question');
      setLoading(false);
      return;
    }
    
    if (!formData.scenario_description.trim()) {
      onError('Please describe your scenario');
      setLoading(false);
      return;
    }
    
    // Check if system is initialized
    if (systemStatus && !systemStatus.initialized) {
      onError('System not initialized. Please initialize the system first.');
      setLoading(false);
      return;
    }
    
    // Check if GROQ is available
    if (systemStatus && !systemStatus.groq_available) {
      const proceed = window.confirm(
        'GROQ API key not configured. Responses will be in mock mode.\n' +
        'Add GROQ_API_KEY to .env file for full RAG functionality.\n\n' +
        'Continue with mock mode?'
      );
      if (!proceed) {
        setLoading(false);
        return;
      }
    }
    
    try {
      const response = await fetch(`${API_BASE}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to process query');
      }
      
      const result = await response.json();
      onResult(result);
      
    } catch (error) {
      onError(error.message || 'An error occurred while processing your query');
    } finally {
      setLoading(false);
    }
  };

  const sampleQueries = [
    {
      template: 'C 01.00',
      question: 'How should we report Common Equity Tier 1 capital for instruments that qualify as common equity?',
      scenario: 'Our bank has issued ordinary shares and retained earnings that meet CET1 criteria under CRR Article 25.'
    },
    {
      template: 'C 01.00',
      question: 'What are the deduction requirements for intangible assets from CET1 capital?',
      scenario: 'We have significant goodwill and other intangible assets on our balance sheet.'
    },
    {
      template: 'C 14.00',
      question: 'How do we calculate large exposures to a single counterparty?',
      scenario: 'We have multiple credit facilities with a large corporate client totaling £85 million.'
    },
    {
      template: 'C 14.00',
      question: 'What exposures are exempt from the large exposures limit?',
      scenario: 'We hold UK government bonds and exposures to public sector entities.'
    }
  ];

  const loadSampleQuery = (sample) => {
    setFormData(prev => ({
      ...prev,
      template: sample.template,
      question: sample.question,
      scenario_description: sample.scenario
    }));
  };

  return (
    <Card className="shadow-sm">
      <Card.Header className="bg-primary text-white">
        <h4 className="mb-0">Submit Regulatory Query</h4>
      </Card.Header>
      <Card.Body>
        {/* System Status Alert */}
        {systemStatus && (
          <Alert variant={systemStatus.initialized ? 'success' : 'warning'} className="mb-4">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <strong>System Status:</strong> {systemStatus.initialized ? 'Ready' : 'Needs Initialization'}
                {!systemStatus.groq_available && (
                  <span className="ms-2">(Mock Mode - No GROQ API Key)</span>
                )}
              </div>
              {!systemStatus.initialized && (
                <Button 
                  variant="outline-warning" 
                  size="sm"
                  onClick={() => window.alert('Use the Initialize System button in the header')}
                >
                  Initialize System
                </Button>
              )}
            </div>
          </Alert>
        )}

        {/* Sample Queries */}
        <div className="mb-4">
          <h6>Sample Queries:</h6>
          <div className="row g-2">
            {sampleQueries.map((sample, index) => (
              <div key={index} className="col-md-6">
                <Card className="h-100">
                  <Card.Body className="p-3">
                    <small>
                      <strong>Template:</strong> {sample.template}<br/>
                      <strong>Question:</strong> {sample.question.substring(0, 60)}...
                    </small>
                  </Card.Body>
                  <Card.Footer className="p-2">
                    <Button 
                      variant="outline-primary" 
                      size="sm"
                      onClick={() => loadSampleQuery(sample)}
                    >
                      Load This Query
                    </Button>
                  </Card.Footer>
                </Card>
              </div>
            ))}
          </div>
        </div>

        <Form onSubmit={handleSubmit}>
          <Row className="mb-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label>
                  <strong>COREP Template</strong>
                </Form.Label>
                <Form.Select 
                  name="template"
                  value={formData.template}
                  onChange={handleChange}
                  required
                  className="form-select-lg"
                >
                  <option value="C 01.00">C 01.00 - Own Funds</option>
                  <option value="C 14.00">C 14.00 - Large Exposures</option>
                </Form.Select>
                <Form.Text className="text-muted">
                  {formData.template === 'C 01.00' 
                    ? 'Capital requirements and own funds reporting'
                    : 'Large exposures limits and reporting'}
                </Form.Text>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>
                  <strong>Institution Name</strong>
                </Form.Label>
                <Form.Control
                  type="text"
                  name="institution_name"
                  value={formData.institution_name}
                  onChange={handleChange}
                  required
                  className="form-control-lg"
                  placeholder="Enter institution name"
                />
              </Form.Group>
            </Col>
          </Row>

          <Row className="mb-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label>
                  <strong>Reporting Date</strong>
                </Form.Label>
                <Form.Control
                  type="date"
                  name="reporting_date"
                  value={formData.reporting_date}
                  onChange={handleChange}
                  required
                  className="form-control-lg"
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <div className="mt-4 pt-2">
                <small className="text-muted">
                  <i className="bi bi-info-circle me-1"></i>
                  Templates restricted to C 01.00 and C 14.00 as per PRA requirements
                </small>
              </div>
            </Col>
          </Row>

          <Form.Group className="mb-4">
            <Form.Label>
              <strong>Regulatory Question</strong> <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              name="question"
              value={formData.question}
              onChange={handleChange}
              placeholder="e.g., How should I report common equity tier 1 capital for instruments that qualify as CET1?"
              required
              className="form-control-lg"
            />
            <Form.Text className="text-muted">
              Be specific about the regulatory aspect you need clarification on
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Label>
              <strong>Scenario Description</strong> <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              name="scenario_description"
              value={formData.scenario_description}
              onChange={handleChange}
              placeholder="e.g., Our bank has issued perpetual non-cumulative preference shares that meet the criteria for Additional Tier 1 capital under CRR Article 51..."
              required
              className="form-control-lg"
            />
            <Form.Text className="text-muted">
              Describe your specific situation, instruments, or reporting context
            </Form.Text>
          </Form.Group>

          <div className="d-grid gap-2 d-md-flex justify-content-md-end">
            <Button 
              variant="outline-secondary" 
              size="lg"
              onClick={() => {
                setFormData({
                  question: '',
                  scenario_description: '',
                  template: 'C 01.00',
                  institution_name: 'UK Banking Corporation',
                  reporting_date: new Date().toISOString().split('T')[0]
                });
              }}
              disabled={loading}
            >
              Clear Form
            </Button>
            
            <Button 
              variant="primary" 
              type="submit" 
              size="lg"
              disabled={loading || (systemStatus && !systemStatus.initialized)}
              className="px-5"
            >
              {loading ? (
                <>
                  <Spinner as="span" animation="border" size="sm" className="me-2" />
                  Processing...
                </>
              ) : 'Generate COREP Response'}
            </Button>
          </div>

          {systemStatus && !systemStatus.initialized && (
            <Alert variant="warning" className="mt-3">
              <i className="bi bi-exclamation-triangle me-2"></i>
              System needs initialization. Please initialize the system before submitting queries.
            </Alert>
          )}
        </Form>
      </Card.Body>
    </Card>
  );
};

export default QueryForm;
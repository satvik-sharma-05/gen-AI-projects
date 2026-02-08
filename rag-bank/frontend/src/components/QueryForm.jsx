import React, { useState } from 'react';
import { Form, Button, Card, Row, Col, Spinner, Alert, Badge, Tooltip, OverlayTrigger } from 'react-bootstrap';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { 
  FiSend, 
  FiFileText, 
  FiClipboard, 
  FiAlertCircle, 
  FiCheckCircle, 
  FiInfo,
  FiTrash2,
  FiRefreshCw,
  FiCalendar,
  FiHome,
  FiHelpCircle
} from 'react-icons/fi';
import './QueryForm.css'; // Optional CSS file for custom styles

const QueryForm = ({ onResult, onError, systemStatus, apiBase }) => {
  const [formData, setFormData] = useState({
    question: '',
    scenario_description: '',
    template: 'C 01.00',
    institution_name: 'UK Banking Corporation',
    reporting_date: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(false);
  const [characterCount, setCharacterCount] = useState({ question: 0, scenario: 0 });
  const API_BASE = import.meta.env.VITE_API_URL || apiBase || 'http://localhost:8000';

  // Toast notification function
  const showToast = (message, type = 'info', icon = null) => {
    const config = {
      position: "top-right",
      autoClose: 4000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      theme: "colored",
    };

    const content = (
      <div className="d-flex align-items-center">
        {icon && <span className="me-2">{icon}</span>}
        <span>{message}</span>
      </div>
    );

    switch (type) {
      case 'success':
        toast.success(content, { ...config, icon: <FiCheckCircle className="text-success" /> });
        break;
      case 'error':
        toast.error(content, { ...config, icon: <FiAlertCircle className="text-danger" /> });
        break;
      case 'warning':
        toast.warning(content, { ...config, icon: <FiAlertCircle className="text-warning" /> });
        break;
      case 'info':
        toast.info(content, { ...config, icon: <FiInfo className="text-info" /> });
        break;
      default:
        toast(content, config);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Update character count
    if (name === 'question') {
      setCharacterCount(prev => ({ ...prev, question: value.length }));
    } else if (name === 'scenario_description') {
      setCharacterCount(prev => ({ ...prev, scenario: value.length }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Show loading toast
    const loadingToast = toast.loading('Processing your regulatory query...', {
      position: "top-center",
      autoClose: false,
    });

    // Validate form
    if (!formData.question.trim()) {
      toast.update(loadingToast, {
        render: 'Please enter a regulatory question',
        type: 'warning',
        isLoading: false,
        autoClose: 3000,
      });
      setLoading(false);
      return;
    }

    if (!formData.scenario_description.trim()) {
      toast.update(loadingToast, {
        render: 'Please describe your scenario',
        type: 'warning',
        isLoading: false,
        autoClose: 3000,
      });
      setLoading(false);
      return;
    }

    // Check if system is initialized
    if (systemStatus && !systemStatus.initialized) {
      toast.update(loadingToast, {
        render: 'System not initialized. Please initialize first.',
        type: 'error',
        isLoading: false,
        autoClose: 3000,
      });
      setLoading(false);
      return;
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
      
      // Success toast
      toast.update(loadingToast, {
        render: (
          <div>
            <div className="d-flex align-items-center mb-2">
              <FiCheckCircle className="text-success me-2" size={20} />
              <strong>COREP Response Generated!</strong>
            </div>
            <small className="text-muted">
              Template: {result.template} • {result.fields?.length || 0} fields populated
            </small>
          </div>
        ),
        type: 'success',
        isLoading: false,
        autoClose: 5000,
      });

      onResult(result);

    } catch (error) {
      // Error toast
      toast.update(loadingToast, {
        render: (
          <div>
            <div className="d-flex align-items-center mb-2">
              <FiAlertCircle className="text-danger me-2" size={20} />
              <strong>Error Processing Query</strong>
            </div>
            <small>{error.message || 'An unexpected error occurred'}</small>
          </div>
        ),
        type: 'error',
        isLoading: false,
        autoClose: 5000,
      });
      
      if (onError) {
        onError(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const sampleQueries = [
    {
      id: 1,
      template: 'C 01.00',
      question: 'How should we report Common Equity Tier 1 capital for instruments that qualify as common equity?',
      scenario: 'Our bank has issued ordinary shares and retained earnings that meet CET1 criteria under CRR Article 25.',
      badgeColor: 'primary',
      icon: <FiFileText />
    },
    {
      id: 2,
      template: 'C 01.00',
      question: 'What are the deduction requirements for intangible assets from CET1 capital?',
      scenario: 'We have significant goodwill and other intangible assets on our balance sheet.',
      badgeColor: 'info',
      icon: <FiFileText />
    },
    {
      id: 3,
      template: 'C 14.00',
      question: 'How do we calculate large exposures to a single counterparty?',
      scenario: 'We have multiple credit facilities with a large corporate client totaling £85 million.',
      badgeColor: 'warning',
      icon: <FiClipboard />
    },
    {
      id: 4,
      template: 'C 14.00',
      question: 'What exposures are exempt from the large exposures limit?',
      scenario: 'We hold UK government bonds and exposures to public sector entities.',
      badgeColor: 'success',
      icon: <FiClipboard />
    }
  ];

  const loadSampleQuery = (sample) => {
    setFormData(prev => ({
      ...prev,
      template: sample.template,
      question: sample.question,
      scenario_description: sample.scenario
    }));
    
    showToast(
      `Loaded sample query for ${sample.template}`,
      'info',
      <FiInfo className="text-info me-1" />
    );
  };

  const clearForm = () => {
    setFormData({
      question: '',
      scenario_description: '',
      template: 'C 01.00',
      institution_name: 'UK Banking Corporation',
      reporting_date: new Date().toISOString().split('T')[0]
    });
    setCharacterCount({ question: 0, scenario: 0 });
    
    showToast(
      'Form cleared successfully',
      'success',
      <FiCheckCircle className="text-success me-1" />
    );
  };

  const handleTemplateChange = (template) => {
    setFormData(prev => ({ ...prev, template }));
    
    showToast(
      `Template changed to ${template}`,
      'info',
      <FiInfo className="text-info me-1" />
    );
  };

  // Tooltip components
  const questionTooltip = (props) => (
    <Tooltip id="question-tooltip" {...props}>
      Be specific about the regulatory aspect you need clarification on
    </Tooltip>
  );

  const scenarioTooltip = (props) => (
    <Tooltip id="scenario-tooltip" {...props}>
      Include specific numbers, conditions, or constraints for accurate results
    </Tooltip>
  );

  return (
    <>
      <ToastContainer 
        position="top-right"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
        limit={3}
      />

      <Card className="shadow-lg border-0">
        <Card.Header className="bg-gradient-primary text-white py-3">
          <div className="d-flex align-items-center justify-content-between">
            <div>
              <h4 className="mb-0 d-flex align-items-center">
                <FiSend className="me-2" size={24} />
                Submit Regulatory Query
              </h4>
              <small className="opacity-75">Get AI-powered COREP reporting assistance</small>
            </div>
            <Badge bg={systemStatus?.groq_available ? 'success' : 'warning'} pill>
              {systemStatus?.groq_available ? 'RAG Mode' : 'Mock Mode'}
            </Badge>
          </div>
        </Card.Header>
        
        <Card.Body className="p-4">
          {/* System Status */}
          {systemStatus && (
            <Alert 
              variant={systemStatus.initialized ? 'success' : 'warning'} 
              className="border-0 shadow-sm mb-4"
            >
              <div className="d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center">
                  {systemStatus.initialized ? 
                    <FiCheckCircle className="me-2" size={20} /> : 
                    <FiAlertCircle className="me-2" size={20} />
                  }
                  <div>
                    <strong>System Status:</strong> {systemStatus.initialized ? 'Ready' : 'Needs Initialization'}
                    {!systemStatus.groq_available && (
                      <span className="ms-2 text-muted">
                        <FiInfo className="me-1" size={14} />
                        Add GROQ_API_KEY for full functionality
                      </span>
                    )}
                  </div>
                </div>
                {!systemStatus.initialized && (
                  <Button 
                    variant="outline-warning" 
                    size="sm"
                    className="rounded-pill"
                    onClick={() => window.alert('Use the Initialize System button in the header')}
                  >
                    <FiRefreshCw className="me-1" />
                    Initialize
                  </Button>
                )}
              </div>
            </Alert>
          )}

          {/* Sample Queries Section */}
          <div className="mb-4">
            <div className="d-flex align-items-center mb-3">
              <FiHelpCircle className="me-2 text-primary" size={20} />
              <h6 className="mb-0">Quick Start Examples</h6>
              <Badge bg="light" text="dark" className="ms-2">
                {sampleQueries.length} samples
              </Badge>
            </div>
            <Row className="g-3">
              {sampleQueries.map((sample) => (
                <Col key={sample.id} md={6}>
                  <Card className="h-100 border-hover shadow-sm" onClick={() => loadSampleQuery(sample)}>
                    <Card.Body className="p-3">
                      <div className="d-flex align-items-start">
                        <div className="me-3">
                          <Badge bg={sample.badgeColor} pill>
                            {sample.icon}
                          </Badge>
                        </div>
                        <div className="flex-grow-1">
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <Badge bg={sample.badgeColor} className="mb-1">
                              {sample.template}
                            </Badge>
                            <small className="text-muted">Click to load</small>
                          </div>
                          <p className="mb-2 text-truncate-2" style={{ fontSize: '0.9rem' }}>
                            {sample.question}
                          </p>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>

          {/* Main Form */}
          <Form onSubmit={handleSubmit}>
            {/* Template Selection */}
            <div className="mb-4">
              <h6 className="mb-3">1. Select COREP Template</h6>
              <div className="d-flex gap-3">
                <Button
                  variant={formData.template === 'C 01.00' ? 'primary' : 'outline-primary'}
                  className="flex-grow-1 py-3"
                  onClick={() => handleTemplateChange('C 01.00')}
                  active={formData.template === 'C 01.00'}
                >
                  <div className="d-flex flex-column align-items-center">
                    <FiFileText size={24} className="mb-2" />
                    <span>C 01.00</span>
                    <small className="text-opacity-75">Own Funds</small>
                  </div>
                </Button>
                <Button
                  variant={formData.template === 'C 14.00' ? 'primary' : 'outline-primary'}
                  className="flex-grow-1 py-3"
                  onClick={() => handleTemplateChange('C 14.00')}
                  active={formData.template === 'C 14.00'}
                >
                  <div className="d-flex flex-column align-items-center">
                    <FiClipboard size={24} className="mb-2" />
                    <span>C 14.00</span>
                    <small className="text-opacity-75">Large Exposures</small>
                  </div>
                </Button>
              </div>
            </div>

            <Row className="mb-4">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-bold d-flex align-items-center">
                    <FiHome className="me-2" />
                    Institution Name
                  </Form.Label>
                  <Form.Control
                    type="text"
                    name="institution_name"
                    value={formData.institution_name}
                    onChange={handleChange}
                    required
                    className="py-2"
                    placeholder="e.g., UK Banking Corporation Ltd."
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-bold d-flex align-items-center">
                    <FiCalendar className="me-2" />
                    Reporting Date
                  </Form.Label>
                  <Form.Control
                    type="date"
                    name="reporting_date"
                    value={formData.reporting_date}
                    onChange={handleChange}
                    required
                    className="py-2"
                  />
                </Form.Group>
              </Col>
            </Row>

            {/* Regulatory Question */}
            <Form.Group className="mb-4">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <Form.Label className="fw-bold d-flex align-items-center mb-0">
                  <FiHelpCircle className="me-2" />
                  Regulatory Question
                  <span className="text-danger ms-1">*</span>
                </Form.Label>
                <OverlayTrigger placement="top" overlay={questionTooltip}>
                  <Badge bg="light" text="dark" className="cursor-pointer">
                    <FiInfo size={14} />
                  </Badge>
                </OverlayTrigger>
              </div>
              <Form.Control
                as="textarea"
                rows={3}
                name="question"
                value={formData.question}
                onChange={handleChange}
                placeholder="e.g., How should I report common equity tier 1 capital for instruments that qualify as CET1?"
                required
                className="py-2"
              />
              <div className="d-flex justify-content-between mt-1">
                <Form.Text className="text-muted">
                  Be specific about the regulatory aspect
                </Form.Text>
                <Form.Text className={characterCount.question > 200 ? 'text-warning' : 'text-muted'}>
                  {characterCount.question}/500
                </Form.Text>
              </div>
            </Form.Group>

            {/* Scenario Description */}
            <Form.Group className="mb-4">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <Form.Label className="fw-bold d-flex align-items-center mb-0">
                  <FiFileText className="me-2" />
                  Scenario Description
                  <span className="text-danger ms-1">*</span>
                </Form.Label>
                <OverlayTrigger placement="top" overlay={scenarioTooltip}>
                  <Badge bg="light" text="dark" className="cursor-pointer">
                    <FiInfo size={14} />
                  </Badge>
                </OverlayTrigger>
              </div>
              <Form.Control
                as="textarea"
                rows={4}
                name="scenario_description"
                value={formData.scenario_description}
                onChange={handleChange}
                placeholder="e.g., Our bank has issued perpetual non-cumulative preference shares that meet the criteria for Additional Tier 1 capital under CRR Article 51..."
                required
                className="py-2"
              />
              <div className="d-flex justify-content-between mt-1">
                <Form.Text className="text-muted">
                  Include specific numbers, conditions, or constraints
                </Form.Text>
                <Form.Text className={characterCount.scenario > 800 ? 'text-warning' : 'text-muted'}>
                  {characterCount.scenario}/1000
                </Form.Text>
              </div>
            </Form.Group>

            {/* Action Buttons */}
            <div className="d-flex gap-3 justify-content-end pt-3 border-top">
              <Button
                variant="outline-secondary"
                size="lg"
                onClick={clearForm}
                disabled={loading}
                className="rounded-pill px-4"
              >
                <FiTrash2 className="me-2" />
                Clear Form
              </Button>
              
              <Button
                variant="primary"
                type="submit"
                size="lg"
                disabled={loading || (systemStatus && !systemStatus.initialized)}
                className="rounded-pill px-5 shadow"
              >
                {loading ? (
                  <>
                    <Spinner as="span" animation="border" size="sm" className="me-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <FiSend className="me-2" />
                    Generate COREP Response
                  </>
                )}
              </Button>
            </div>

            {systemStatus && !systemStatus.initialized && (
              <Alert variant="warning" className="mt-4 border-0">
                <div className="d-flex align-items-center">
                  <FiAlertCircle className="me-2 flex-shrink-0" />
                  <div>
                    <strong>System needs initialization</strong>
                    <p className="mb-0 small">
                      Please initialize the system using the button in the header before submitting queries.
                    </p>
                  </div>
                </div>
              </Alert>
            )}
          </Form>
        </Card.Body>
        
        <Card.Footer className="bg-light border-0 py-3">
          <div className="text-center text-muted small">
            <div className="d-flex justify-content-center gap-4 mb-2">
              <span className="d-flex align-items-center">
                <FiCheckCircle className="text-success me-1" size={14} />
                AI-powered analysis
              </span>
              <span className="d-flex align-items-center">
                <FiCheckCircle className="text-success me-1" size={14} />
                Regulatory compliance
              </span>
              <span className="d-flex align-items-center">
                <FiCheckCircle className="text-success me-1" size={14} />
                Audit trail
              </span>
            </div>
            <p className="mb-0">
              This tool assists with regulatory interpretation but does not constitute legal advice.
            </p>
          </div>
        </Card.Footer>
      </Card>
    </>
  );
};

export default QueryForm;
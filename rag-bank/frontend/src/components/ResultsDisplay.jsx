// C:\satvik\legal\gen-AI-projects\rag-bank\frontend\src\components\ResultsDisplay.jsx
import React, { useState } from 'react';
import { Card, Table, Badge, Alert, Row, Col, Button, ProgressBar } from 'react-bootstrap';
import ReactJson from '@uiw/react-json-view';
import { toast } from 'react-toastify';

const ResultsDisplay = ({ results, onClose }) => {
  const [showRawJson, setShowRawJson] = useState(false);
  const [activeTab, setActiveTab] = useState('fields');

  if (!results) {
    return (
      <Alert variant="info">
        <i className="bi bi-info-circle me-2"></i>
        No results to display. Submit a query first.
      </Alert>
    );
  }

  const getValidationColor = (status) => {
    if (!status) return 'secondary';
    const statusLower = status.toLowerCase();
    if (statusLower === 'valid') return 'success';
    if (statusLower === 'invalid') return 'danger';
    if (statusLower === 'pending' || statusLower === 'warning') return 'warning';
    return 'secondary';
  };

  const formatValue = (value) => {
    if (value === null || value === undefined) return 'N/A';
    
    // Handle different data types
    if (typeof value === 'number') {
      // Format currency values
      if (Math.abs(value) >= 1000000) {
        return `£${(value / 1000000).toFixed(2)}M`;
      } else if (Math.abs(value) >= 1000) {
        return `£${(value / 1000).toFixed(2)}K`;
      }
      return new Intl.NumberFormat('en-GB', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(value);
    }
    
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    
    if (typeof value === 'string') {
      // Check if it's a percentage
      if (value.includes('%') || value.toLowerCase().includes('ratio')) {
        return value;
      }
      return value;
    }
    
    return String(value);
  };

  const getValidationIcon = (status) => {
    const statusLower = (status || '').toLowerCase();
    switch (statusLower) {
      case 'valid':
        return <i className="bi bi-check-circle-fill text-success me-1"></i>;
      case 'invalid':
        return <i className="bi bi-x-circle-fill text-danger me-1"></i>;
      case 'warning':
      case 'pending':
        return <i className="bi bi-exclamation-triangle-fill text-warning me-1"></i>;
      default:
        return <i className="bi bi-question-circle-fill text-secondary me-1"></i>;
    }
  };

  // Calculate statistics
  const totalFields = results.fields?.length || 0;
  const validFields = results.fields?.filter(f => 
    f.validation_status?.toLowerCase() === 'valid'
  ).length || 0;
  const warningFields = results.fields?.filter(f => 
    f.validation_status?.toLowerCase() === 'warning' || 
    f.validation_status?.toLowerCase() === 'pending'
  ).length || 0;
  const invalidFields = results.fields?.filter(f => 
    f.validation_status?.toLowerCase() === 'invalid'
  ).length || 0;

  const validationPercentage = totalFields > 0 ? (validFields / totalFields) * 100 : 0;

  const handleExport = (format) => {
    try {
      if (format === 'json') {
        const dataStr = JSON.stringify(results, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const exportFileDefaultName = `COREP_${results.template}_${results.reporting_date}.json`;
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        document.body.appendChild(linkElement);
        linkElement.click();
        document.body.removeChild(linkElement);
        toast.success('Data exported as JSON successfully!');
      } else if (format === 'csv') {
        if (!results.fields || results.fields.length === 0) {
          toast.warning('No data available for CSV export');
          return;
        }
        
        const headers = ['Field Code', 'Field Name', 'Value', 'Status', 'Description', 'Regulation'];
        const rows = results.fields.map(f => [
          f.field_code || '',
          f.field_name || '',
          f.value || '',
          f.validation_status || '',
          f.description || '',
          f.regulation_reference || ''
        ]);
        
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += headers.map(h => `"${h}"`).join(',') + "\n";
        rows.forEach(row => {
          csvContent += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + "\n";
        });
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `COREP_${results.template}_${results.reporting_date}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Data exported as CSV successfully!');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data: ' + error.message);
    }
  };

  const handleCopyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        toast.success('Copied to clipboard!');
      })
      .catch(err => {
        console.error('Copy failed:', err);
        toast.error('Failed to copy to clipboard');
      });
  };

  return (
    <div className="results-display">
      {/* Summary Card */}
      <Card className="mb-4 border-primary">
        <Card.Header className="bg-primary text-white">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h4 className="mb-1">
                <i className="bi bi-file-earmark-text me-2"></i>
                COREP Response: {results.template || 'N/A'}
              </h4>
              <div className="d-flex gap-3">
                <small>
                  <i className="bi bi-building me-1"></i>
                  {results.institution_name || 'Unknown Institution'}
                </small>
                <small>
                  <i className="bi bi-calendar me-1"></i>
                  {results.reporting_date || 'No date'}
                </small>
                <small>
                  <i className="bi bi-clock me-1"></i>
                  Generated: {new Date().toLocaleTimeString()}
                </small>
              </div>
            </div>
            <div className="text-end">
              <div className="d-flex align-items-center gap-2">
                <Badge bg="light" text="dark" className="px-3 py-2">
                  <i className="bi bi-check-circle text-success me-1"></i>
                  {validFields} Valid
                </Badge>
                <Badge bg="light" text="dark" className="px-3 py-2">
                  <i className="bi bi-exclamation-triangle text-warning me-1"></i>
                  {warningFields} Warnings
                </Badge>
                <Badge bg="light" text="dark" className="px-3 py-2">
                  <i className="bi bi-x-circle text-danger me-1"></i>
                  {invalidFields} Invalid
                </Badge>
              </div>
            </div>
          </div>
        </Card.Header>
        <Card.Body>
          {results.answer && (
            <Alert variant="info" className="mb-3">
              <h6 className="alert-heading">
                <i className="bi bi-chat-left-text me-2"></i>
                Regulatory Answer:
              </h6>
              <p className="mb-0">{results.answer}</p>
            </Alert>
          )}
          
          <div className="mb-3">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="text-muted">Validation Progress</span>
              <span className="fw-bold">{Math.round(validationPercentage)}%</span>
            </div>
            <ProgressBar now={validationPercentage} 
              variant={validationPercentage >= 80 ? "success" : validationPercentage >= 50 ? "warning" : "danger"}
              className="mb-2"
            />
            <div className="d-flex justify-content-between">
              <small className="text-muted">
                {validFields} of {totalFields} fields validated
              </small>
              <small className="text-muted">
                {totalFields - validFields} require attention
              </small>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Navigation Tabs */}
      <div className="mb-4">
        <ul className="nav nav-tabs">
          <li className="nav-item">
            <button 
              className={`nav-link ${activeTab === 'fields' ? 'active' : ''}`}
              onClick={() => setActiveTab('fields')}
            >
              <i className="bi bi-table me-1"></i>
              Reporting Fields
            </button>
          </li>
          <li className="nav-item">
            <button 
              className={`nav-link ${activeTab === 'analysis' ? 'active' : ''}`}
              onClick={() => setActiveTab('analysis')}
            >
              <i className="bi bi-graph-up me-1"></i>
              Analysis & Insights
            </button>
          </li>
          <li className="nav-item">
            <button 
              className={`nav-link ${activeTab === 'sources' ? 'active' : ''}`}
              onClick={() => setActiveTab('sources')}
            >
              <i className="bi bi-book me-1"></i>
              Sources & References
            </button>
          </li>
          <li className="nav-item">
            <button 
              className={`nav-link ${activeTab === 'json' ? 'active' : ''}`}
              onClick={() => setActiveTab('json')}
            >
              <i className="bi bi-code me-1"></i>
              Raw JSON
            </button>
          </li>
        </ul>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {/* Fields Tab */}
        {activeTab === 'fields' && (
          <Card>
            <Card.Header>
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  <i className="bi bi-table me-2"></i>
                  Template Fields
                </h5>
                <div className="d-flex gap-2">
                  <Button 
                    variant="outline-primary" 
                    size="sm"
                    onClick={() => handleCopyToClipboard(JSON.stringify(results.fields, null, 2))}
                  >
                    <i className="bi bi-clipboard me-1"></i>
                    Copy Fields
                  </Button>
                  <Button 
                    variant="outline-success" 
                    size="sm"
                    onClick={() => handleExport('csv')}
                  >
                    <i className="bi bi-file-earmark-spreadsheet me-1"></i>
                    Export CSV
                  </Button>
                </div>
              </div>
            </Card.Header>
            <Card.Body>
              {results.fields && results.fields.length > 0 ? (
                <div className="table-responsive">
                  <Table striped hover bordered className="mb-0">
                    <thead style={{ backgroundColor: '#2c3e50', color: 'white' }}>
                      <tr>
                        <th width="10%">Status</th>
                        <th width="15%">Field Code</th>
                        <th width="25%">Field Name</th>
                        <th width="15%">Value</th>
                        <th width="35%">Description & Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.fields.map((field, index) => (
                        <tr key={index} className={`border-start border-${getValidationColor(field.validation_status)}`}>
                          <td>
                            <Badge bg={getValidationColor(field.validation_status)} className="w-100">
                              {getValidationIcon(field.validation_status)}
                              {field.validation_status?.toUpperCase() || 'UNKNOWN'}
                            </Badge>
                          </td>
                          <td>
                            <code className="text-primary fw-bold">{field.field_code}</code>
                          </td>
                          <td>
                            <strong>{field.field_name}</strong>
                            {field.regulation_reference && (
                              <div className="mt-1">
                                <Badge bg="info" className="me-1" style={{ fontSize: '0.7em' }}>
                                  {field.regulation_reference}
                                </Badge>
                              </div>
                            )}
                          </td>
                          <td className="text-end">
                            <span className="fw-bold font-monospace">
                              {formatValue(field.value)}
                            </span>
                            {field.unit && (
                              <div className="text-muted small">{field.unit}</div>
                            )}
                          </td>
                          <td>
                            <div className="small text-muted">
                              {field.description || 'No description provided'}
                            </div>
                            {field.validation_notes && (
                              <div className="mt-2">
                                <Badge bg="warning" text="dark" className="me-1">
                                  <i className="bi bi-exclamation-circle me-1"></i>
                                  Note
                                </Badge>
                                <span className="small">{field.validation_notes}</span>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              ) : (
                <Alert variant="warning">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  No fields generated in the response
                </Alert>
              )}
            </Card.Body>
          </Card>
        )}

        {/* Analysis Tab */}
        {activeTab === 'analysis' && (
          <Row>
            <Col lg={8}>
              <Card className="mb-4">
                <Card.Header style={{ backgroundColor: '#3498db', color: 'white' }}>
                  <h5 className="mb-0">
                    <i className="bi bi-graph-up me-2"></i>
                    Compliance Analysis
                  </h5>
                </Card.Header>
                <Card.Body>
                  {results.validation_notes && (
                    <Alert variant="info">
                      <h6 className="alert-heading">
                        <i className="bi bi-clipboard-check me-2"></i>
                        Validation Summary
                      </h6>
                      <p className="mb-0">{results.validation_notes}</p>
                    </Alert>
                  )}
                  
                  {results.compliance_status && (
                    <div className="mb-4">
                      <h6>Compliance Status</h6>
                      <div className="d-flex gap-3">
                        <Badge 
                          bg={results.compliance_status.toLowerCase() === 'compliant' ? 'success' : 'danger'}
                          className="px-4 py-2 fs-6"
                        >
                          <i className="bi bi-shield-check me-2"></i>
                          {results.compliance_status.toUpperCase()}
                        </Badge>
                        {results.compliance_score && (
                          <div>
                            <span className="fw-bold">Score: </span>
                            <span className="text-primary">{results.compliance_score}/100</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {results.recommendations && results.recommendations.length > 0 && (
                    <div>
                      <h6>Recommendations</h6>
                      <ul className="list-group">
                        {results.recommendations.map((rec, idx) => (
                          <li key={idx} className="list-group-item">
                            <i className="bi bi-lightbulb text-warning me-2"></i>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
            <Col lg={4}>
              <Card className="mb-4">
                <Card.Header style={{ backgroundColor: '#2c3e50', color: 'white' }}>
                  <h6 className="mb-0">Field Validation Summary</h6>
                </Card.Header>
                <Card.Body>
                  <div className="text-center mb-3">
                    <div className="display-6 text-primary">{validFields}</div>
                    <small className="text-muted">Valid Fields</small>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span>Valid</span>
                    <span className="fw-bold">{validFields}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span>Warnings</span>
                    <span className="fw-bold text-warning">{warningFields}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span>Invalid</span>
                    <span className="fw-bold text-danger">{invalidFields}</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span>Total</span>
                    <span className="fw-bold">{totalFields}</span>
                  </div>
                </Card.Body>
              </Card>
              
              {results.rule_references && results.rule_references.length > 0 && (
                <Card>
                  <Card.Header style={{ backgroundColor: '#27ae60', color: 'white' }}>
                    <h6 className="mb-0">Key Regulations</h6>
                  </Card.Header>
                  <Card.Body>
                    <ul className="list-unstyled">
                      {results.rule_references.map((ref, idx) => (
                        <li key={idx} className="mb-2">
                          <Badge bg="info" className="me-2">§{idx + 1}</Badge>
                          <small>{ref}</small>
                        </li>
                      ))}
                    </ul>
                  </Card.Body>
                </Card>
              )}
            </Col>
          </Row>
        )}

        {/* Sources Tab */}
        {activeTab === 'sources' && (
          <Row>
            <Col lg={8}>
              {results.sources && results.sources.length > 0 ? (
                <Card>
                  <Card.Header style={{ backgroundColor: '#8e44ad', color: 'white' }}>
                    <h5 className="mb-0">
                      <i className="bi bi-book me-2"></i>
                      Document Sources
                    </h5>
                  </Card.Header>
                  <Card.Body>
                    <div className="list-group">
                      {results.sources.map((source, idx) => (
                        <div key={idx} className="list-group-item">
                          <div className="d-flex justify-content-between align-items-start">
                            <div>
                              <h6 className="mb-1">
                                <Badge bg="secondary" className="me-2">{idx + 1}</Badge>
                                {source.source}
                              </h6>
                              {source.page && (
                                <small className="text-muted me-3">
                                  <i className="bi bi-file-text me-1"></i>
                                  Page {source.page}
                                </small>
                              )}
                              {source.section && (
                                <small className="text-muted">
                                  <i className="bi bi-bookmark me-1"></i>
                                  Section {source.section}
                                </small>
                              )}
                            </div>
                            {source.relevance_score && (
                              <Badge bg="success" className="px-3 py-2">
                                {Math.round(source.relevance_score * 100)}% Relevant
                              </Badge>
                            )}
                          </div>
                          {source.content && (
                            <div className="mt-2 p-2 bg-light rounded">
                              <small className="text-muted">{source.content}</small>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </Card.Body>
                </Card>
              ) : (
                <Alert variant="info">
                  <i className="bi bi-info-circle me-2"></i>
                  No source documents referenced
                </Alert>
              )}
            </Col>
            <Col lg={4}>
              {results.validation_errors && results.validation_errors.length > 0 && (
                <Card className="border-danger mb-4">
                  <Card.Header className="bg-danger text-white">
                    <h6 className="mb-0">
                      <i className="bi bi-exclamation-triangle me-2"></i>
                      Validation Issues
                    </h6>
                  </Card.Header>
                  <Card.Body>
                    <ul className="mb-0">
                      {results.validation_errors.map((error, idx) => (
                        <li key={idx} className="text-danger mb-2">
                          <small>
                            <i className="bi bi-x-circle me-1"></i>
                            {error}
                          </small>
                        </li>
                      ))}
                    </ul>
                  </Card.Body>
                </Card>
              )}
              
              <Card>
                <Card.Header style={{ backgroundColor: '#34495e', color: 'white' }}>
                  <h6 className="mb-0">Audit Information</h6>
                </Card.Header>
                <Card.Body>
                  <dl className="row mb-0">
                    <dt className="col-sm-5">Generated</dt>
                    <dd className="col-sm-7">{new Date().toLocaleString()}</dd>
                    
                    <dt className="col-sm-5">Template</dt>
                    <dd className="col-sm-7">{results.template || 'N/A'}</dd>
                    
                    <dt className="col-sm-5">Mode</dt>
                    <dd className="col-sm-7">
                      <Badge bg={results.mode === 'RAG' ? 'success' : 'warning'}>
                        {results.mode || 'Mock'}
                      </Badge>
                    </dd>
                    
                    <dt className="col-sm-5">Processing Time</dt>
                    <dd className="col-sm-7">{results.processing_time || 'N/A'}</dd>
                  </dl>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        )}

        {/* JSON Tab */}
        {activeTab === 'json' && (
          <Card>
            <Card.Header style={{ backgroundColor: '#2c3e50', color: 'white' }}>
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  <i className="bi bi-code me-2"></i>
                  Raw JSON Data
                </h5>
                <div className="d-flex gap-2">
                  <Button 
                    variant="outline-light" 
                    size="sm"
                    onClick={() => handleCopyToClipboard(JSON.stringify(results, null, 2))}
                  >
                    <i className="bi bi-clipboard me-1"></i>
                    Copy JSON
                  </Button>
                  <Button 
                    variant="outline-light" 
                    size="sm"
                    onClick={() => handleExport('json')}
                  >
                    <i className="bi bi-download me-1"></i>
                    Export JSON
                  </Button>
                </div>
              </div>
            </Card.Header>
            <Card.Body>
              <div style={{ 
                maxHeight: '500px', 
                overflow: 'auto',
                backgroundColor: '#1e1e1e',
                padding: '15px',
                borderRadius: '5px'
              }}>
                <ReactJson 
                  src={results} 
                  theme="monokai"
                  collapsed={1}
                  displayDataTypes={false}
                  enableClipboard={false}
                  style={{ fontSize: '13px' }}
                  name={false}
                  iconStyle="triangle"
                />
              </div>
            </Card.Body>
          </Card>
        )}
      </div>

      {/* Footer Actions */}
      <div className="mt-4 d-flex justify-content-between align-items-center">
        <Button 
          variant="outline-secondary"
          onClick={onClose}
        >
          <i className="bi bi-arrow-left me-1"></i>
          Back to Query
        </Button>
        
        <div className="d-flex gap-2">
          <Button 
            variant="outline-primary"
            onClick={() => window.print()}
          >
            <i className="bi bi-printer me-1"></i>
            Print Report
          </Button>
          
          <Button 
            variant="success"
            onClick={() => {
              // You could add save functionality here
              toast.info('Save functionality to be implemented');
            }}
          >
            <i className="bi bi-save me-1"></i>
            Save Report
          </Button>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-4 text-center text-muted">
        <small>
          <i className="bi bi-shield-check me-1"></i>
          ReguLens COREP Assistant • 
          Template: {results.template} • 
          Generated: {new Date().toLocaleString()} • 
          Validation: {validFields}/{totalFields} fields
        </small>
      </div>
    </div>
  );
};

export default ResultsDisplay;
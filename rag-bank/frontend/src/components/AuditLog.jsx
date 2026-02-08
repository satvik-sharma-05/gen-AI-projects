import React, { useState } from 'react';
import { Card, Table, Badge, Button, Form, Row, Col, Alert } from 'react-bootstrap';

const AuditLog = ({ logs, onRefresh }) => {
  const [filter, setFilter] = useState({
    template: 'all',
    dateRange: 'all',
    search: ''
  });

  const filteredLogs = logs.filter(log => {
    // Filter by template
    if (filter.template !== 'all' && log.query?.template !== filter.template) {
      return false;
    }
    
    // Filter by search
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      const question = log.query?.question?.toLowerCase() || '';
      const scenario = log.query?.scenario_description?.toLowerCase() || '';
      const sources = log.sources?.join(' ').toLowerCase() || '';
      
      if (!question.includes(searchLower) && 
          !scenario.includes(searchLower) &&
          !sources.includes(searchLower)) {
        return false;
      }
    }
    
    return true;
  });

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const getTemplateColor = (template) => {
    return template === 'C 01.00' ? 'primary' : 'success';
  };

  return (
    <Card className="shadow-sm">
      <Card.Header className="bg-dark text-white">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h4 className="mb-0">Audit Log</h4>
            <small>Track all queries and responses</small>
          </div>
          <Button 
            variant="outline-light" 
            size="sm"
            onClick={onRefresh}
          >
            <i className="bi bi-arrow-clockwise me-1"></i>
            Refresh
          </Button>
        </div>
      </Card.Header>
      
      <Card.Body>
        {/* Stats Summary */}
        <Row className="mb-4">
          <Col md={3}>
            <Card className="text-center">
              <Card.Body>
                <h3 className="text-primary">{logs.length}</h3>
                <small className="text-muted">Total Queries</small>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center">
              <Card.Body>
                <h3 className="text-success">
                  {logs.filter(l => l.query?.template === 'C 01.00').length}
                </h3>
                <small className="text-muted">C 01.00 Queries</small>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center">
              <Card.Body>
                <h3 className="text-info">
                  {logs.filter(l => l.query?.template === 'C 14.00').length}
                </h3>
                <small className="text-muted">C 14.00 Queries</small>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center">
              <Card.Body>
                <h3 className="text-warning">
                  {logs.reduce((sum, log) => sum + (log.retrieved_docs_count || 0), 0)}
                </h3>
                <small className="text-muted">Total Documents Retrieved</small>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Filters */}
        <Card className="mb-4">
          <Card.Body>
            <h6>Filters</h6>
            <Row>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Template</Form.Label>
                  <Form.Select 
                    value={filter.template}
                    onChange={(e) => setFilter({...filter, template: e.target.value})}
                    size="sm"
                  >
                    <option value="all">All Templates</option>
                    <option value="C 01.00">C 01.00 - Own Funds</option>
                    <option value="C 14.00">C 14.00 - Large Exposures</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Search</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Search questions, scenarios, or sources..."
                    value={filter.search}
                    onChange={(e) => setFilter({...filter, search: e.target.value})}
                    size="sm"
                  />
                </Form.Group>
              </Col>
              <Col md={2} className="d-flex align-items-end">
                <Button 
                  variant="outline-secondary" 
                  size="sm"
                  onClick={() => setFilter({ template: 'all', dateRange: 'all', search: '' })}
                >
                  Clear Filters
                </Button>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* Audit Log Table */}
        {filteredLogs.length > 0 ? (
          <div className="table-responsive">
            <Table striped hover size="sm">
              <thead>
                <tr>
                  <th width="15%">Timestamp</th>
                  <th width="10%">Template</th>
                  <th width="30%">Question</th>
                  <th width="15%">Documents</th>
                  <th width="15%">Fields</th>
                  <th width="15%">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log, index) => (
                  <tr key={index}>
                    <td>
                      <small>{formatDate(log.timestamp)}</small>
                    </td>
                    <td>
                      <Badge bg={getTemplateColor(log.query?.template)}>
                        {log.query?.template || 'N/A'}
                      </Badge>
                    </td>
                    <td>
                      <div className="text-truncate" style={{ maxWidth: '300px' }} title={log.query?.question}>
                        {log.query?.question || 'No question'}
                      </div>
                      <small className="text-muted d-block">
                        Inst: {log.query?.institution_name}
                      </small>
                    </td>
                    <td>
                      <Badge bg="info">
                        {log.retrieved_docs_count || 0} docs
                      </Badge>
                      {log.sources && (
                        <small className="d-block text-muted mt-1">
                          {log.sources.slice(0, 2).map((s, i) => (
                            <span key={i} className="d-block">{s}</span>
                          ))}
                          {log.sources.length > 2 && '...'}
                        </small>
                      )}
                    </td>
                    <td>
                      <Badge bg="success">
                        {log.response_fields_count || 0} fields
                      </Badge>
                    </td>
                    <td>
                      <Button 
                        variant="outline-primary" 
                        size="sm"
                        onClick={() => {
                          const details = {
                            query: log.query,
                            timestamp: log.timestamp,
                            retrieved_docs_count: log.retrieved_docs_count,
                            response_fields_count: log.response_fields_count,
                            sources: log.sources,
                            validation_results: log.validation_results
                          };
                          alert(JSON.stringify(details, null, 2));
                        }}
                      >
                        View Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        ) : (
          <Alert variant="info">
            {logs.length === 0 ? 'No audit logs found' : 'No logs match your filters'}
          </Alert>
        )}

        {/* Export Options */}
        {logs.length > 0 && (
          <div className="mt-4 d-flex justify-content-between align-items-center">
            <small className="text-muted">
              Showing {filteredLogs.length} of {logs.length} logs
            </small>
            <div>
              <Button 
                variant="outline-success" 
                size="sm"
                onClick={() => {
                  const dataStr = JSON.stringify(logs, null, 2);
                  const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
                  const linkElement = document.createElement('a');
                  linkElement.setAttribute('href', dataUri);
                  linkElement.setAttribute('download', `audit_log_${new Date().toISOString().split('T')[0]}.json`);
                  linkElement.click();
                }}
              >
                Export All as JSON
              </Button>
            </div>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default AuditLog;
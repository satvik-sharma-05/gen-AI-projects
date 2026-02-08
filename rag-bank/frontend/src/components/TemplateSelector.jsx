import React, { useState } from 'react';
import { Card, Table, Badge, Alert, Row, Col, Button, Accordion } from 'react-bootstrap';

const TemplateSelector = () => {
  const [selectedTemplate, setSelectedTemplate] = useState('C 01.00');

  const templates = {
    'C 01.00': {
      name: 'Own Funds',
      description: 'Reporting of own funds and capital requirements',
      purpose: 'To report the institution\'s own funds, capital requirements, and capital buffers.',
      scope: 'All institutions subject to CRR',
      frequency: 'Quarterly',
      fields: [
        { code: 'r010, c010', name: 'Common Equity Tier 1 capital', description: 'CET1 capital before regulatory adjustments' },
        { code: 'r020, c020', name: 'Additional Tier 1 capital', description: 'AT1 capital before regulatory adjustments' },
        { code: 'r030, c030', name: 'Tier 2 capital', description: 'Tier 2 capital before regulatory adjustments' },
        { code: 'r040, c040', name: 'Total capital', description: 'Sum of CET1, AT1, and Tier 2 capital' },
        { code: 'r050, c050', name: 'Total risk exposure amount', description: 'Total risk-weighted exposure amount' },
        { code: 'r060, c060', name: 'Total capital ratio', description: 'Total capital as percentage of total risk exposure amount' }
      ],
      regulations: ['CRR Articles 25-30', 'CRR Articles 36-41', 'PRA Rulebook GENPRU 2.2'],
      examples: [
        'Reporting CET1 capital for ordinary shares',
        'Deductions for intangible assets',
        'Additional Tier 1 capital instruments',
        'Capital conservation buffer requirements'
      ]
    },
    'C 14.00': {
      name: 'Large Exposures',
      description: 'Reporting of large exposures to single counterparties or groups',
      purpose: 'To monitor and control exposures to single counterparties or groups of connected clients.',
      scope: 'All institutions subject to large exposures regime',
      frequency: 'Quarterly',
      fields: [
        { code: 'r010, c010', name: 'Large exposures to single counterparty', description: 'Total exposure to a single counterparty' },
        { code: 'r020, c020', name: 'Exempt exposures', description: 'Exposures exempt from large exposures limit' },
        { code: 'r030, c030', name: 'Large exposures limit', description: '25% limit of eligible capital' },
        { code: 'r040, c040', name: 'Excess over limit', description: 'Amount exceeding large exposures limit' },
        { code: 'r050, c050', name: 'Eligible capital', description: 'Capital base for limit calculation' }
      ],
      regulations: ['CRR Articles 395-403', 'PRA Rulebook LAR 3.1', 'EBA/GL/2019/01'],
      examples: [
        'Calculating exposure to a single corporate client',
        'Exempt exposures to UK government',
        'Exposures to connected clients',
        'Intra-group exposures'
      ]
    }
  };

  const selected = templates[selectedTemplate];

  return (
    <div className="template-selector">
      <Card className="shadow-sm mb-4">
        <Card.Header className="bg-primary text-white">
          <h4 className="mb-0">COREP Template Reference</h4>
        </Card.Header>
        <Card.Body>
          <Alert variant="info" className="mb-4">
            <i className="bi bi-info-circle me-2"></i>
            ReguLens is restricted to templates <strong>C 01.00</strong> and <strong>C 14.00</strong> as per the prototype requirements.
          </Alert>

          {/* Template Selection */}
          <div className="mb-4">
            <h5>Select Template</h5>
            <div className="d-flex gap-3">
              {Object.keys(templates).map(template => (
                <Button
                  key={template}
                  variant={selectedTemplate === template ? "primary" : "outline-primary"}
                  onClick={() => setSelectedTemplate(template)}
                  size="lg"
                  className="px-4"
                >
                  {template} - {templates[template].name}
                </Button>
              ))}
            </div>
          </div>

          {/* Template Details */}
          <Card className="mb-4">
            <Card.Header>
              <h5 className="mb-0">{selectedTemplate} - {selected.name}</h5>
            </Card.Header>
            <Card.Body>
              <Row className="mb-4">
                <Col md={6}>
                  <div className="mb-3">
                    <strong>Description:</strong>
                    <p className="mt-1">{selected.description}</p>
                  </div>
                  <div className="mb-3">
                    <strong>Purpose:</strong>
                    <p className="mt-1">{selected.purpose}</p>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="mb-3">
                    <strong>Scope:</strong>
                    <p className="mt-1">{selected.scope}</p>
                  </div>
                  <div className="mb-3">
                    <strong>Reporting Frequency:</strong>
                    <Badge bg="info" className="ms-2">{selected.frequency}</Badge>
                  </div>
                </Col>
              </Row>

              {/* Fields Table */}
              <h6 className="mb-3">Key Reporting Fields</h6>
              <div className="table-responsive">
                <Table striped bordered hover size="sm">
                  <thead>
                    <tr>
                      <th width="20%">Field Code</th>
                      <th width="30%">Field Name</th>
                      <th width="50%">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.fields.map((field, index) => (
                      <tr key={index}>
                        <td>
                          <code>{selectedTemplate}, {field.code}</code>
                        </td>
                        <td>
                          <strong>{field.name}</strong>
                        </td>
                        <td>
                          <small className="text-muted">{field.description}</small>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>

              {/* Regulations and Examples */}
              <Row className="mt-4">
                <Col md={6}>
                  <Card>
                    <Card.Header>
                      <h6 className="mb-0">Relevant Regulations</h6>
                    </Card.Header>
                    <Card.Body>
                      <ul className="mb-0">
                        {selected.regulations.map((regulation, index) => (
                          <li key={index}>
                            <small>{regulation}</small>
                          </li>
                        ))}
                      </ul>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={6}>
                  <Card>
                    <Card.Header>
                      <h6 className="mb-0">Example Use Cases</h6>
                    </Card.Header>
                    <Card.Body>
                      <ul className="mb-0">
                        {selected.examples.map((example, index) => (
                          <li key={index}>
                            <small>{example}</small>
                          </li>
                        ))}
                      </ul>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              {/* Sample Query Suggestions */}
              <Accordion className="mt-4">
                <Accordion.Item eventKey="0">
                  <Accordion.Header>
                    <strong>Sample Queries for {selectedTemplate}</strong>
                  </Accordion.Header>
                  <Accordion.Body>
                    {selectedTemplate === 'C 01.00' ? (
                      <ul>
                        <li>"How should we report Common Equity Tier 1 capital for instruments that qualify as common equity?"</li>
                        <li>"What are the deduction requirements for intangible assets from CET1 capital?"</li>
                        <li>"How do we report Additional Tier 1 capital for perpetual non-cumulative preference shares?"</li>
                        <li>"What is the treatment of deferred tax assets for capital adequacy purposes?"</li>
                      </ul>
                    ) : (
                      <ul>
                        <li>"How do we calculate large exposures to a single counterparty?"</li>
                        <li>"What exposures are exempt from the large exposures limit?"</li>
                        <li>"How should we report exposures to connected clients?"</li>
                        <li>"What is the treatment of intra-group exposures for large exposures reporting?"</li>
                      </ul>
                    )}
                  </Accordion.Body>
                </Accordion.Item>
              </Accordion>
            </Card.Body>
          </Card>

          {/* Template Comparison */}
          <Card>
            <Card.Header>
              <h5 className="mb-0">Template Comparison</h5>
            </Card.Header>
            <Card.Body>
              <Table bordered>
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
                  <tr>
                    <td>Applicable to</td>
                    <td>All CRR institutions</td>
                    <td>Institutions with material exposures</td>
                  </tr>
                </tbody>
              </Table>
            </Card.Body>
          </Card>

          {/* Usage Tips */}
          <Alert variant="success" className="mt-4">
            <h6><i className="bi bi-lightbulb me-2"></i>Usage Tips</h6>
            <ul className="mb-0">
              <li>Be specific about the regulatory aspect in your query</li>
              <li>Describe your specific scenario or instruments in detail</li>
              <li>Reference specific articles or regulations when possible</li>
              <li>Check the audit log to track your queries</li>
              <li>Export results for compliance documentation</li>
            </ul>
          </Alert>
        </Card.Body>
      </Card>
    </div>
  );
};

export default TemplateSelector;
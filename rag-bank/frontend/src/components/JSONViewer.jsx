import React, { useState } from 'react';
import './JSONViewer.css';

const JSONViewer = ({ data, title = "Structured Output" }) => {
  const [viewMode, setViewMode] = useState('pretty'); // 'pretty', 'raw', 'table'
  const [expandedSections, setExpandedSections] = useState([]);

  if (!data) {
    return (
      <div className="json-viewer-empty">
        <p>No data to display. Submit a query to see results.</p>
      </div>
    );
  }

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const renderPrettyJSON = () => {
    return (
      <div className="json-container">
        {/* Summary Card */}
        <div className="json-summary-card">
          <div className="row">
            <div className="col-md-4">
              <div className="summary-item">
                <span className="summary-label">Template</span>
                <span className="summary-value badge bg-primary">
                  {data.template || 'N/A'}
                </span>
              </div>
            </div>
            <div className="col-md-4">
              <div className="summary-item">
                <span className="summary-label">Confidence</span>
                <span className="summary-value">
                  <div className="progress" style={{ height: '8px' }}>
                    <div 
                      className={`progress-bar ${data.confidence > 0.7 ? 'bg-success' : data.confidence > 0.4 ? 'bg-warning' : 'bg-danger'}`}
                      style={{ width: `${data.confidence * 100}%` }}
                    ></div>
                  </div>
                  <small>{Math.round(data.confidence * 100)}%</small>
                </span>
              </div>
            </div>
            <div className="col-md-4">
              <div className="summary-item">
                <span className="summary-label">Status</span>
                <span className="summary-value badge bg-success">
                  {data.validation_errors?.length === 0 ? 'Valid' : 'Needs Review'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Answer */}
        {data.answer && (
          <div className="json-section">
            <div className="section-header">
              <h5>Answer</h5>
            </div>
            <div className="section-content">
              <div className="answer-box">
                {data.answer}
              </div>
            </div>
          </div>
        )}

        {/* Template Sections */}
        {data.sections && data.sections.length > 0 && (
          <div className="json-section">
            <div className="section-header d-flex justify-content-between align-items-center">
              <h5>Template Sections</h5>
              <small className="text-muted">
                {data.sections.length} section(s), {data.sections.reduce((acc, s) => acc + (s.fields?.length || 0), 0)} field(s)
              </small>
            </div>
            <div className="section-content">
              {data.sections.map((section, sIndex) => (
                <div key={sIndex} className="template-section mb-4">
                  <div 
                    className="section-title clickable"
                    onClick={() => toggleSection(`section-${sIndex}`)}
                  >
                    <h6>
                      {section.section_id} - {section.section_name}
                      <span className="badge bg-info ms-2">
                        {section.fields?.length || 0} fields
                      </span>
                      <span className="badge bg-secondary ms-2">
                        {section.completeness?.toFixed(1) || 0}% complete
                      </span>
                      <span className="float-end">
                        {expandedSections.includes(`section-${sIndex}`) ? '−' : '+'}
                      </span>
                    </h6>
                  </div>
                  
                  {expandedSections.includes(`section-${sIndex}`) && (
                    <div className="section-fields">
                      {section.fields && section.fields.map((field, fIndex) => (
                        <div key={fIndex} className="field-row">
                          <div className="row align-items-center">
                            <div className="col-md-3">
                              <div className="field-id">
                                <code>{field.field_id}</code>
                              </div>
                              <div className="field-name">
                                <strong>{field.field_name}</strong>
                              </div>
                              <div className="field-description small text-muted">
                                {field.description}
                              </div>
                            </div>
                            <div className="col-md-2">
                              <div className="field-value">
                                {field.value !== null && field.value !== undefined ? (
                                  <span className="value-display">
                                    {typeof field.value === 'number' 
                                      ? field.value.toLocaleString('en-GB')
                                      : String(field.value)}
                                    {field.unit && <span className="unit"> {field.unit}</span>}
                                  </span>
                                ) : (
                                  <span className="text-muted fst-italic">Not provided</span>
                                )}
                              </div>
                            </div>
                            <div className="col-md-3">
                              <div className="field-validation">
                                <span className={`badge ${field.validation?.is_valid ? 'bg-success' : 'bg-danger'}`}>
                                  {field.validation?.is_valid ? '✓ Valid' : '✗ Invalid'}
                                </span>
                                {field.validation?.errors?.map((error, eIndex) => (
                                  <div key={eIndex} className="error-item small text-danger">
                                    • {error}
                                  </div>
                                ))}
                                {field.validation?.warnings?.map((warning, wIndex) => (
                                  <div key={wIndex} className="warning-item small text-warning">
                                    • {warning}
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="col-md-4">
                              {field.source_paragraphs && field.source_paragraphs.length > 0 && (
                                <div className="field-sources">
                                  <small className="text-muted">Sources:</small>
                                  <div className="source-list">
                                    {field.source_paragraphs.map((source, srcIndex) => (
                                      <div key={srcIndex} className="source-item">
                                        <small>• {source.substring(0, 80)}...</small>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Validation Errors */}
        {data.validation_errors && data.validation_errors.length > 0 && (
          <div className="json-section">
            <div className="section-header">
              <h5 className="text-danger">
                Validation Issues
                <span className="badge bg-danger ms-2">{data.validation_errors.length}</span>
              </h5>
            </div>
            <div className="section-content">
              <div className="validation-errors">
                {data.validation_errors.map((error, index) => (
                  <div key={index} className="alert alert-warning mb-2">
                    <strong>Issue {index + 1}:</strong> {error}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Retrieved Sources */}
        {data.retrieved_sources && data.retrieved_sources.length > 0 && (
          <div className="json-section">
            <div className="section-header">
              <h5>
                Retrieved Sources
                <span className="badge bg-info ms-2">{data.retrieved_sources.length}</span>
              </h5>
            </div>
            <div className="section-content">
              <div className="sources-list">
                {data.retrieved_sources.map((source, index) => (
                  <div key={index} className="source-card">
                    <div className="source-header">
                      <span className="badge bg-secondary">#{index + 1}</span>
                      <span className="source-name ms-2">{source}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Audit Info */}
        {data.audit_trail_id && (
          <div className="json-section">
            <div className="section-header">
              <h5>Audit Information</h5>
            </div>
            <div className="section-content">
              <div className="audit-info">
                <div className="row">
                  <div className="col-md-6">
                    <div className="audit-item">
                      <span className="audit-label">Audit ID:</span>
                      <span className="audit-value">
                        <code>{data.audit_trail_id}</code>
                      </span>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="audit-item">
                      <span className="audit-label">Template Name:</span>
                      <span className="audit-value">{data.template_name}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderRawJSON = () => {
    return (
      <div className="json-container">
        <pre className="json-raw">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    );
  };

  const renderTable = () => {
    if (!data.sections || data.sections.length === 0) {
      return <div className="alert alert-info">No table data available</div>;
    }

    const allFields = data.sections.flatMap(section => 
      section.fields?.map(field => ({
        ...field,
        section: section.section_name
      })) || []
    );

    return (
      <div className="json-container">
        <div className="table-responsive">
          <table className="table table-hover table-sm">
            <thead>
              <tr>
                <th>Section</th>
                <th>Field ID</th>
                <th>Field Name</th>
                <th>Value</th>
                <th>Unit</th>
                <th>Status</th>
                <th>Sources</th>
              </tr>
            </thead>
            <tbody>
              {allFields.map((field, index) => (
                <tr key={index}>
                  <td>
                    <small>{field.section}</small>
                  </td>
                  <td>
                    <code>{field.field_id}</code>
                  </td>
                  <td>
                    <strong>{field.field_name}</strong>
                    <br/>
                    <small className="text-muted">{field.description}</small>
                  </td>
                  <td>
                    {field.value !== null && field.value !== undefined ? (
                      <span className="value-cell">
                        {typeof field.value === 'number' 
                          ? field.value.toLocaleString('en-GB')
                          : String(field.value)}
                      </span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td>
                    {field.unit && <span className="badge bg-light text-dark">{field.unit}</span>}
                  </td>
                  <td>
                    <span className={`badge ${field.validation?.is_valid ? 'bg-success' : 'bg-danger'}`}>
                      {field.validation?.is_valid ? '✓' : '✗'}
                    </span>
                    {field.validation?.errors?.length > 0 && (
                      <div className="error-tooltip">
                        <small className="text-danger">
                          {field.validation.errors.length} error(s)
                        </small>
                      </div>
                    )}
                  </td>
                  <td>
                    {field.source_paragraphs?.length > 0 ? (
                      <span className="badge bg-info">
                        {field.source_paragraphs.length} source(s)
                      </span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="json-viewer">
      <div className="json-viewer-header">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h4 className="mb-0">
            {title}
            {data.template && (
              <span className="badge bg-primary ms-2">
                {data.template} - {data.template_name}
              </span>
            )}
          </h4>
          <div className="view-mode-selector">
            <div className="btn-group btn-group-sm">
              <button
                type="button"
                className={`btn ${viewMode === 'pretty' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setViewMode('pretty')}
              >
                <i className="bi bi-layout-text-sidebar"></i> Pretty
              </button>
              <button
                type="button"
                className={`btn ${viewMode === 'table' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setViewMode('table')}
              >
                <i className="bi bi-table"></i> Table
              </button>
              <button
                type="button"
                className={`btn ${viewMode === 'raw' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setViewMode('raw')}
              >
                <i className="bi bi-code"></i> Raw JSON
              </button>
            </div>
          </div>
        </div>

        {/* Download Button */}
        <div className="mb-3">
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => {
              const dataStr = JSON.stringify(data, null, 2);
              const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
              const exportFileDefaultName = `corep-response-${data.template || 'data'}-${Date.now()}.json`;
              const linkElement = document.createElement('a');
              linkElement.setAttribute('href', dataUri);
              linkElement.setAttribute('download', exportFileDefaultName);
              linkElement.click();
            }}
          >
            <i className="bi bi-download"></i> Download JSON
          </button>
        </div>
      </div>

      <div className="json-viewer-body">
        {viewMode === 'pretty' && renderPrettyJSON()}
        {viewMode === 'raw' && renderRawJSON()}
        {viewMode === 'table' && renderTable()}
      </div>
    </div>
  );
};

export default JSONViewer;
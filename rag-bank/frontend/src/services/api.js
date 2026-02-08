import axios from 'axios';

export const api = {
  initialize: (forceRecreate = false) =>
    axios.post('/api/initialize', { force_recreate: forceRecreate }),

  getTemplates: () =>
    axios.get('/api/templates'),

  submitQuery: (queryData) =>
    axios.post('/api/query', queryData),

  healthCheck: () =>
    axios.get('/api/health')
};
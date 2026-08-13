import axios from 'axios'

const modelApi = axios.create({
  baseURL: 'http://localhost:18080/api',
  timeout: 30000,
})

const aiApi = axios.create({
  baseURL: 'http://localhost:18081/api',
  timeout: 60000,
})

// Ontology CRUD
export const ontologyApi = {
  list: () => modelApi.get('/ontology'),
  get: (id: string) => modelApi.get(`/ontology/${id}`),
  create: (data: { name: string; namespace: string; description?: string }) =>
    modelApi.post('/ontology', data),
  delete: (id: string) => modelApi.delete(`/ontology/${id}`),
  import: (formData: FormData) =>
    modelApi.post('/ontology/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  export: (id: string, format = 'RDF/XML') =>
    modelApi.get(`/ontology/${id}/export`, { params: { format }, responseType: 'blob' }),
}

// Class operations
export const classApi = {
  list: (ontologyId: string) => modelApi.get(`/ontology/${ontologyId}/classes`),
  create: (ontologyId: string, data: any) =>
    modelApi.post(`/ontology/${ontologyId}/classes`, data),
  update: (ontologyId: string, classUri: string, data: any) =>
    modelApi.put(`/ontology/${ontologyId}/classes/${encodeURIComponent(classUri)}`, data),
  delete: (ontologyId: string, classUri: string) =>
    modelApi.delete(`/ontology/${ontologyId}/classes/${encodeURIComponent(classUri)}`),
}

// Property operations
export const propertyApi = {
  list: (ontologyId: string) => modelApi.get(`/ontology/${ontologyId}/properties`),
  create: (ontologyId: string, data: any) =>
    modelApi.post(`/ontology/${ontologyId}/properties`, data),
  delete: (ontologyId: string, propertyUri: string) =>
    modelApi.delete(`/ontology/${ontologyId}/properties/${encodeURIComponent(propertyUri)}`),
}

// Relation operations
export const relationApi = {
  create: (ontologyId: string, data: any) =>
    modelApi.post(`/ontology/${ontologyId}/relations`, data),
}

// Graph
export const graphApi = {
  get: (ontologyId: string) => modelApi.get(`/ontology/${ontologyId}/graph`),
}

// SPARQL
export const sparqlApi = {
  execute: (ontologyId: string, query: string) =>
    modelApi.post(`/ontology/${ontologyId}/sparql`, { query }),
}

// Reasoning
export const reasoningApi = {
  classify: (ontologyId: string) =>
    aiApi.post('/reasoning/classify', { ontologyId }),
  consistency: (ontologyId: string) =>
    aiApi.post('/reasoning/consistency', { ontologyId }),
  infer: (ontologyId: string) =>
    aiApi.post('/reasoning/infer', { ontologyId }),
}

// LLM
export const llmApi = {
  extract: (text: string, ontologyId?: string) =>
    aiApi.post('/llm/extract', { text, ontologyId }),
  suggest: (ontologyId: string, context?: string) =>
    aiApi.post('/llm/suggest', { ontologyId, context }),
  query: (ontologyId: string, question: string) =>
    aiApi.post('/llm/query', { ontologyId, question }),
  chatStream: (ontologyId: string, message: string) =>
    fetch('http://localhost:18081/api/llm/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ontologyId, message }),
    }),
}

export default { modelApi, aiApi }

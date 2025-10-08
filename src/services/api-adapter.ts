import { httpApi } from './http-api';

// Sistema agora usa backend real com PostgreSQL
export const api = httpApi;

// Alias para compatibilidade
export default api;

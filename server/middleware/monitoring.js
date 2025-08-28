import systemMonitor from '../services/monitoring/systemMonitor.js';

// Middleware para monitorar todas as requisições
export const monitoringMiddleware = (req, res, next) => {
  const startTime = Date.now();
  
  // Capturar resposta original
  const originalSend = res.send;
  const originalJson = res.json;
  
  // Interceptar resposta para capturar métricas
  res.send = function(data) {
    const responseTime = Date.now() - startTime;
    const success = res.statusCode < 400;
    
    systemMonitor.recordApiCall(responseTime, success);
    
    return originalSend.call(this, data);
  };
  
  res.json = function(data) {
    const responseTime = Date.now() - startTime;
    const success = res.statusCode < 400;
    
    systemMonitor.recordApiCall(responseTime, success);
    
    return originalJson.call(this, data);
  };
  
  next();
};

// Middleware para capturar erros
export const errorMonitoringMiddleware = (error, req, res, next) => {
  const responseTime = Date.now() - (req.startTime || Date.now());
  systemMonitor.recordApiCall(responseTime, false);
  
  next(error);
};

// Middleware para adicionar timestamp de início
export const requestTimestampMiddleware = (req, res, next) => {
  req.startTime = Date.now();
  next();
};

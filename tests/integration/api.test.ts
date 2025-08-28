import { api } from '@/services/api';

// Mock do localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

describe('API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue('mock-token');
  });

  describe('GET requests', () => {
    it('should make GET request with auth token', async () => {
      const mockResponse = { data: { id: 1, name: 'Test' } };
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.get('/test');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/test',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token',
            'Content-Type': 'application/json',
          }),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle GET request without auth token', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      const mockResponse = { data: { id: 1, name: 'Test' } };
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.get('/test');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/test',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('POST requests', () => {
    it('should make POST request with data', async () => {
      const mockData = { name: 'Test', email: 'test@example.com' };
      const mockResponse = { data: { id: 1, ...mockData } };
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.post('/users', mockData);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/users',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(mockData),
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token',
            'Content-Type': 'application/json',
          }),
        })
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('PUT requests', () => {
    it('should make PUT request with data', async () => {
      const mockData = { name: 'Updated Test' };
      const mockResponse = { data: { id: 1, ...mockData } };
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.put('/users/1', mockData);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/users/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(mockData),
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token',
            'Content-Type': 'application/json',
          }),
        })
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('DELETE requests', () => {
    it('should make DELETE request', async () => {
      const mockResponse = { success: true };
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.delete('/users/1');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/users/1',
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token',
            'Content-Type': 'application/json',
          }),
        })
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Error handling', () => {
    it('should handle network errors', async () => {
      global.fetch = jest.fn().mockRejectedValueOnce(new Error('Network error'));

      await expect(api.get('/test')).rejects.toThrow('Network error');
    });

    it('should handle HTTP error responses', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ error: 'Resource not found' }),
      });

      await expect(api.get('/test')).rejects.toThrow('HTTP error! status: 404');
    });

    it('should handle unauthorized responses', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ error: 'Unauthorized' }),
      });

      await expect(api.get('/test')).rejects.toThrow('HTTP error! status: 401');
    });
  });

  describe('Request interceptors', () => {
    it('should add auth token to requests', async () => {
      const mockResponse = { data: { id: 1 } };
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await api.get('/test');

      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('token');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token',
          }),
        })
      );
    });
  });

  describe('Response interceptors', () => {
    it('should handle successful responses', async () => {
      const mockResponse = { data: { id: 1, name: 'Test' } };
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.get('/test');
      expect(result).toEqual(mockResponse);
    });

    it('should handle empty responses', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => null,
      });

      const result = await api.get('/test');
      expect(result).toBeNull();
    });
  });
});

import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from '../src/App';

// Mock do App component para teste básico
const MockApp = () => (
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

describe('App', () => {
  it('renders without crashing', () => {
    render(<MockApp />);
    // Teste básico para verificar se o componente renderiza
    expect(document.body).toBeInTheDocument();
  });
});

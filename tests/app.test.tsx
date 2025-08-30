import { render } from '@testing-library/react';
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
    // Teste básico para verificar se o componente renderiza sem erros
    expect(() => render(<MockApp />)).not.toThrow();
  });

  it('renders a div element', () => {
    const { container } = render(<MockApp />);
    expect(container.querySelector('div')).toBeInTheDocument();
  });
});

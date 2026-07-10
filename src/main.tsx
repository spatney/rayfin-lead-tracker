import { createRoot } from 'react-dom/client';

import App from '@/App';
import { AuthProvider } from '@/hooks/AuthContext';
import { ThemeProvider } from '@/hooks/ThemeContext';
import { bootstrapAuth } from '@/services/bootstrap';

import './main.css';

const authService = bootstrapAuth();

createRoot(document.getElementById('root')!).render(
  <ThemeProvider>
    <AuthProvider authService={authService}>
      <App />
    </AuthProvider>
  </ThemeProvider>
);

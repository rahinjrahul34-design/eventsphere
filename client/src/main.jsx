import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import App from './App';
import { useTheme, applyTheme } from './store/theme';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

function ThemeSync() {
  const theme = useTheme((s) => s.theme);
  React.useEffect(() => applyTheme(theme), [theme]);
  return (
    <Toaster
      position="top-center"
      theme={theme}
      toastOptions={{
        classNames: {
          toast: '!bg-card !text-card-foreground !border !border-border !shadow-lift !rounded-xl',
        },
      }}
    />
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeSync />
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);

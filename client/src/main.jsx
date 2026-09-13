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
      closeButton
      toastOptions={{
        duration: 4000,
        classNames: {
          toast:
            '!rounded-xl !border !border-border !bg-card !text-card-foreground !shadow-pop !text-sm !font-medium',
          title: '!text-sm !font-semibold',
          description: '!text-xs !text-muted-foreground',
          actionButton: '!bg-primary !text-primary-foreground !rounded-md !font-semibold',
          cancelButton: '!bg-secondary !text-secondary-foreground !rounded-md',
          // Semantic accents — a colored icon area instead of a fully tinted card
          success: '!border-success/30',
          error: '!border-destructive/30',
          warning: '!border-warning/35',
          info: '!border-info/30',
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

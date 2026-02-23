import '@/style.css';
import '@fontsource/inter';
import { RouterProvider } from '@tanstack/react-router';
import { ThemeProvider } from '@/hooks/use-theme';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { createRouter } from '@/router';

const ROOT_ELEMENT_ID = 'app';

const rootElement = document.getElementById(ROOT_ELEMENT_ID);

if (!rootElement) {
  throw new Error(`Root element with ID '${ROOT_ELEMENT_ID}' not found.`);
}

const router = createRouter();

if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    </React.StrictMode>,
  );
}

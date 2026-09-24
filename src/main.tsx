import React from 'react';
import { createRoot } from 'react-dom/client';
import { CascadeShell } from './cascade/ui/CascadeShell';
import './styles/app.css';

const container = document.getElementById('root');
if (!container) throw new Error('Missing #root');

createRoot(container).render(
  <React.StrictMode>
    <CascadeShell />
  </React.StrictMode>,
);

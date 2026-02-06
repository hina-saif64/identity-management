
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Suppress console warnings in a production-like simulation
if (window.location.hostname !== 'localhost') {
  console.warn = () => { };
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

import React from 'react';

const TestComponent: React.FC = () => {
  return (
    <div style={{ 
      background: 'red', 
      color: 'white', 
      padding: '20px', 
      fontSize: '24px',
      textAlign: 'center'
    }}>
      🚨 TEST COMPONENT - IF YOU SEE THIS, THE APP IS WORKING 🚨
    </div>
  );
};

export default TestComponent;
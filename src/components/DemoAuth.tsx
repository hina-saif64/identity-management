/**
 * Demo Authentication Screen - Auto-connects with demo credentials
 */

import React, { useState, useEffect } from 'react';
import { Shield, CheckCircle, Loader2 } from 'lucide-react';

interface DemoAuthProps {
  onAuthenticated: () => void;
}

export const DemoAuth: React.FC<DemoAuthProps> = ({ onAuthenticated }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(0);

  const steps = [
    'Connecting to Azure AD...',
    'Validating demo credentials...',
    'Establishing secure session...',
    'Loading demo environment...'
  ];

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(true);
      
      const stepTimer = setInterval(() => {
        setStep(prev => {
          if (prev >= steps.length - 1) {
            clearInterval(stepTimer);
            setTimeout(() => {
              onAuthenticated();
            }, 500);
            return prev;
          }
          return prev + 1;
        });
      }, 800);

      return () => clearInterval(stepTimer);
    }, 1000);

    return () => clearTimeout(timer);
  }, [onAuthenticated]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Shield className="mx-auto h-16 w-16 text-blue-500" />
          <h2 className="mt-6 text-3xl font-extrabold text-white">
            Hyperion Demo
          </h2>
          <p className="mt-2 text-sm text-slate-300">
            Enterprise Identity Management Platform
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 border border-white/20">
          {!isLoading ? (
            <div className="text-center">
              <h3 className="text-lg font-medium text-white mb-4">
                Welcome to the Demo Environment
              </h3>
              <p className="text-slate-300 text-sm mb-6">
                Experience the full power of Hyperion with realistic demo data. 
                No real credentials required!
              </p>
              <div className="space-y-3 text-left text-sm text-slate-300">
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                  1000+ Demo devices across all systems
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                  500+ Demo users with realistic data
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                  Complete CA policies and PowerBI usage
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                  Full bulk action capabilities
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <Loader2 className="mx-auto h-8 w-8 text-blue-400 animate-spin mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">
                Initializing Demo Environment
              </h3>
              <p className="text-slate-300 text-sm mb-4">
                {steps[step]}
              </p>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((step + 1) / steps.length) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="text-center text-xs text-slate-400">
          <p>🎭 Demo Mode - All data is simulated</p>
          <p>No real systems or credentials are accessed</p>
        </div>
      </div>
    </div>
  );
};
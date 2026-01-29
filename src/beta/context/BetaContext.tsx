import React, { createContext, useContext } from 'react';
import type { BetaUser } from '../hooks/useBetaAuth';

interface BetaContextValue {
  betaUser: BetaUser | null;
  isAdmin: boolean;
}

const BetaContext = createContext<BetaContextValue | null>(null);

export function BetaProvider({ 
  children, 
  betaUser, 
  isAdmin 
}: { 
  children: React.ReactNode; 
  betaUser: BetaUser | null;
  isAdmin: boolean;
}) {
  return (
    <BetaContext.Provider value={{ betaUser, isAdmin }}>
      {children}
    </BetaContext.Provider>
  );
}

export function useBetaContext() {
  const context = useContext(BetaContext);
  if (!context) {
    throw new Error('useBetaContext must be used within a BetaProvider');
  }
  return context;
}

export function useBetaContextOptional() {
  return useContext(BetaContext);
}

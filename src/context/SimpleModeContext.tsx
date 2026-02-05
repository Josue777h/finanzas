import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface SimpleModeContextType {
  isSimpleMode: boolean;
  toggleSimpleMode: () => void;
  setSimpleMode: (value: boolean) => void;
}

const SimpleModeContext = createContext<SimpleModeContextType | undefined>(undefined);

export const SimpleModeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isSimpleMode, setIsSimpleMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('simpleMode');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem('simpleMode', JSON.stringify(isSimpleMode));
  }, [isSimpleMode]);

  const toggleSimpleMode = () => setIsSimpleMode((prev) => !prev);
  const setSimpleMode = (value: boolean) => setIsSimpleMode(value);

  return (
    <SimpleModeContext.Provider value={{ isSimpleMode, toggleSimpleMode, setSimpleMode }}>
      {children}
    </SimpleModeContext.Provider>
  );
};

export const useSimpleMode = () => {
  const context = useContext(SimpleModeContext);
  if (context === undefined) {
    throw new Error('useSimpleMode must be used within a SimpleModeProvider');
  }
  return context;
};

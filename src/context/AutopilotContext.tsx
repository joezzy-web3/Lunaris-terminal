import React, { createContext, useContext, useState } from 'react';

const AutopilotContext = createContext<any>(null);

export const AutopilotProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAutopilotActive, setIsAutopilotActive] = useState(false);

  return (
    <AutopilotContext.Provider value={{ isAutopilotActive, setIsAutopilotActive }}>
      {children}
    </AutopilotContext.Provider>
  );
};

export const useAutopilot = () => useContext(AutopilotContext);

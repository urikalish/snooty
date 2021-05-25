import React, { createContext, useState, useEffect } from 'react';
import useScreenSize from '../hooks/useScreenSize';

const SidebarContext = createContext({
  isSidebarEnabled: true,
  isSidebarMenuOpen: true,
  setIsSidebarMenuOpen: null,
});

const SidebarContextProvider = ({ children, isSidebarEnabled = true }) => {
  const { isTabletOrMobile } = useScreenSize();
  const [isSidebarMenuOpen, setIsSidebarMenuOpen] = useState(!isTabletOrMobile);

  useEffect(() => {
    setIsSidebarMenuOpen(!isTabletOrMobile);
  }, [isTabletOrMobile]);

  return (
    <SidebarContext.Provider
      value={{
        isSidebarEnabled,
        isSidebarMenuOpen,
        setIsSidebarMenuOpen,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
};

export { SidebarContext, SidebarContextProvider };
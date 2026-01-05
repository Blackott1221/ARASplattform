/**
 * ARAS Command Palette Context
 * Provides registry instance via React context
 * No import-time side effects - registry created at runtime
 */

import React, { createContext, useContext, useRef, useEffect, useState, type ReactNode } from 'react';
import { createCommandRegistry, type CommandRegistry } from './command-registry';
import { registerNavigationCommands } from './modules/navigation-commands';

interface CommandContextValue {
  registry: CommandRegistry;
  isReady: boolean;
}

const CommandContext = createContext<CommandContextValue | null>(null);

interface CommandProviderProps {
  children: ReactNode;
  navigate: (path: string) => void;
}

/**
 * Command Provider - creates registry and bootstraps core commands
 */
export function CommandProvider({ children, navigate }: CommandProviderProps) {
  const registryRef = useRef<CommandRegistry | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Create registry once
  if (!registryRef.current) {
    registryRef.current = createCommandRegistry();
  }

  // Bootstrap core commands at runtime (not import time)
  useEffect(() => {
    const registry = registryRef.current;
    if (!registry) return;

    // Register navigation commands
    registerNavigationCommands(registry, navigate);
    
    setIsReady(true);

    // Cleanup on unmount
    return () => {
      registry.unregister('navigation');
    };
  }, [navigate]);

  const value: CommandContextValue = {
    registry: registryRef.current!,
    isReady,
  };

  return (
    <CommandContext.Provider value={value}>
      {children}
    </CommandContext.Provider>
  );
}

/**
 * Hook to access the command registry
 */
export function useCommandRegistry(): CommandRegistry | null {
  const context = useContext(CommandContext);
  return context?.registry ?? null;
}

/**
 * Hook to check if commands are ready
 */
export function useCommandsReady(): boolean {
  const context = useContext(CommandContext);
  return context?.isReady ?? false;
}

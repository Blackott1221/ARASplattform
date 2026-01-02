/**
 * ARAS Command Registration Hook
 * Registers commands on mount, unregisters on unmount
 */

import { useEffect, useRef } from 'react';
import type { Command } from './command-types';
import { registerCommands, unregisterCommands } from './command-registry';

/**
 * Hook to register commands from a component
 * Automatically cleans up on unmount
 */
export function useRegisterCommands(sourceId: string, commands: Command[]): void {
  const commandsRef = useRef(commands);
  commandsRef.current = commands;

  useEffect(() => {
    registerCommands(sourceId, commandsRef.current);
    
    return () => {
      unregisterCommands(sourceId);
    };
  }, [sourceId]);

  // Update commands when they change
  useEffect(() => {
    registerCommands(sourceId, commands);
  }, [sourceId, commands]);
}

/**
 * Hook to register commands lazily (for dynamic commands)
 */
export function useRegisterDynamicCommands(
  sourceId: string,
  getCommands: () => Command[],
  deps: React.DependencyList
): void {
  useEffect(() => {
    const commands = getCommands();
    registerCommands(sourceId, commands);
    
    return () => {
      unregisterCommands(sourceId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceId, ...deps]);
}

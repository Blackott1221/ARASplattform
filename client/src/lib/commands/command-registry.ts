/**
 * ARAS Command Registry
 * In-memory registry for commands from various sources
 * No circular imports - lib/* never imports from components/*
 */

import type { Command, CommandRegistration } from './command-types';

// In-memory registry
const registrations = new Map<string, CommandRegistration>();

// Event listeners for state changes
type Listener = () => void;
const listeners = new Set<Listener>();

// Last used command storage key
const LAST_USED_KEY = 'aras:command-palette:last-used';

/**
 * Register commands from a source
 */
export function registerCommands(sourceId: string, commands: Command[]): void {
  registrations.set(sourceId, { sourceId, commands });
  notifyListeners();
}

/**
 * Unregister commands from a source
 */
export function unregisterCommands(sourceId: string): void {
  registrations.delete(sourceId);
  notifyListeners();
}

/**
 * Get all available commands
 */
export function getAllCommands(): Command[] {
  const allCommands: Command[] = [];
  
  for (const registration of registrations.values()) {
    for (const cmd of registration.commands) {
      // Only include available commands
      if (!cmd.isAvailable || cmd.isAvailable()) {
        allCommands.push(cmd);
      }
    }
  }
  
  return allCommands;
}

/**
 * Search commands by query
 */
export function searchCommands(query: string): Command[] {
  const commands = getAllCommands();
  
  if (!query.trim()) {
    return commands;
  }
  
  const q = query.toLowerCase().trim();
  
  return commands.filter(cmd => {
    // Match title
    if (cmd.title.toLowerCase().includes(q)) return true;
    // Match subtitle
    if (cmd.subtitle?.toLowerCase().includes(q)) return true;
    // Match keywords
    if (cmd.keywords?.some(k => k.toLowerCase().includes(q))) return true;
    // Match group
    if (cmd.group.toLowerCase().includes(q)) return true;
    
    return false;
  }).sort((a, b) => {
    // Prioritize exact title matches
    const aExact = a.title.toLowerCase().startsWith(q);
    const bExact = b.title.toLowerCase().startsWith(q);
    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;
    
    // Then by group order
    const groupOrder = ['Navigation', 'Aktionen', 'Fokus', 'Öffnen', 'System'];
    const aGroupIdx = groupOrder.indexOf(a.group);
    const bGroupIdx = groupOrder.indexOf(b.group);
    if (aGroupIdx !== bGroupIdx) return aGroupIdx - bGroupIdx;
    
    // Then alphabetically
    return a.title.localeCompare(b.title, 'de');
  });
}

/**
 * Group commands by their group
 */
export function groupCommands(commands: Command[]): Map<string, Command[]> {
  const groups = new Map<string, Command[]>();
  const groupOrder = ['Navigation', 'Aktionen', 'Fokus', 'Öffnen', 'System'];
  
  // Initialize groups in order
  for (const group of groupOrder) {
    groups.set(group, []);
  }
  
  for (const cmd of commands) {
    const group = groups.get(cmd.group);
    if (group) {
      group.push(cmd);
    } else {
      groups.set(cmd.group, [cmd]);
    }
  }
  
  // Remove empty groups
  for (const [key, value] of groups) {
    if (value.length === 0) {
      groups.delete(key);
    }
  }
  
  return groups;
}

/**
 * Save last used command
 */
export function saveLastUsedCommand(commandId: string, userId?: string): void {
  try {
    const key = userId ? `${LAST_USED_KEY}:${userId}` : LAST_USED_KEY;
    const history = getLastUsedCommands(userId);
    
    // Add to front, remove duplicates, limit to 5
    const newHistory = [commandId, ...history.filter(id => id !== commandId)].slice(0, 5);
    localStorage.setItem(key, JSON.stringify(newHistory));
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Get last used commands
 */
export function getLastUsedCommands(userId?: string): string[] {
  try {
    const key = userId ? `${LAST_USED_KEY}:${userId}` : LAST_USED_KEY;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Subscribe to registry changes
 */
export function subscribeToRegistry(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Notify all listeners of changes
 */
function notifyListeners(): void {
  for (const listener of listeners) {
    try {
      listener();
    } catch (err) {
      console.error('[CommandRegistry] Listener error:', err);
    }
  }
}

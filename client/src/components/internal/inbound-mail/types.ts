/**
 * ============================================================================
 * INBOUND MAIL TYPES
 * ============================================================================
 */

export type InboundMailStatus = 'NEW' | 'OPEN' | 'DONE' | 'ARCHIVED';

export interface InboundMailListItem {
  id: number;
  mailbox?: string | null;
  subject: string;
  fromEmail: string;
  fromName?: string | null;
  receivedAt: string;
  status: InboundMailStatus;
  snippet: string;
  labels: string[];
}

export interface InboundMailDetail extends InboundMailListItem {
  messageId: string;
  threadId?: string | null;
  bodyText: string;
  bodyHtml: string;
  toEmails?: string[];
  ccEmails?: string[];
  meta?: Record<string, any>;
  updatedAt?: string;
  createdAt?: string;
}

export interface InboundMailCounts {
  NEW: number;
  OPEN: number;
  DONE: number;
  ARCHIVED: number;
  total: number;
}

export interface InboundMailFilters {
  status?: InboundMailStatus;
  q?: string;
  mailbox?: string;
  limit?: number;
}

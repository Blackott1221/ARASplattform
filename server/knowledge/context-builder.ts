/**
 * 🧠 ARAS AI Knowledge Context Builder
 * 
 * Central "Single Source of Truth" for building knowledge context
 * used by both SPACE (Chat) and POWER (Telephony).
 * 
 * Budgeted, defensive, and optimized for LLM prompt injection.
 */

import { storage } from '../storage';
import { logger } from '../logger';
import type { User, UserDataSource } from '@shared/schema';

// Configuration defaults
const DEFAULT_MAX_SOURCES = 8;
const DEFAULT_MAX_CHARS_SPACE = 3500;  // For SPACE chat
const DEFAULT_MAX_CHARS_POWER = 2000;  // For POWER calls (shorter)
const SNIPPET_MAX_CHARS = 800;         // Per-source snippet limit

export interface KnowledgeContextOptions {
  maxSources?: number;
  maxChars?: number;
  includeFileMeta?: boolean;
  mode?: 'space' | 'power';  // Determines budget
}

export interface SourcesDebug {
  rawCount: number;
  mappedCount: number;
  filteredCount: number;
  ids: number[];
  types: string[];
  statuses: string[];
  titlesPreview: string[];
}

export interface KnowledgeContext {
  aiProfile: Record<string, any> | null;
  sources: UserDataSource[];
  digest: string;
  sourceCount: number;
  truncated: boolean;
  sourcesDebug: SourcesDebug;
}

/**
 * Extract a snippet from content text, safely clamped
 */
function extractSnippet(text: string | null | undefined, maxLength: number = SNIPPET_MAX_CHARS): string {
  if (!text || typeof text !== 'string') return '';
  const cleaned = text.trim().replace(/\s+/g, ' ');
  if (cleaned.length <= maxLength) return cleaned;
  return cleaned.substring(0, maxLength - 3) + '...';
}

/**
 * Format a single data source for the digest
 */
function formatSourceEntry(source: UserDataSource, includeFileMeta: boolean): string {
  const typeLabel = source.type.toUpperCase();
  const title = source.title || source.fileName || 'Untitled';
  
  let content = '';
  
  if (source.type === 'url') {
    content = source.url || '';
    if (source.contentText) {
      content += ` — ${extractSnippet(source.contentText, 400)}`;
    }
  } else if (source.type === 'file') {
    if (source.contentText) {
      content = extractSnippet(source.contentText, 600);
    } else if (includeFileMeta) {
      const size = source.fileSize ? `${Math.round(source.fileSize / 1024)}KB` : 'unknown size';
      content = `(File: ${source.fileName}, ${size} — text not extracted)`;
    } else {
      content = '(File attached)';
    }
  } else {
    // text type
    content = extractSnippet(source.contentText, 600);
  }
  
  return `• [${typeLabel}] ${title}${content ? `: ${content}` : ''}`;
}

/**
 * Build AI Profile bullet points for digest
 */
function buildAiProfileBullets(aiProfile: Record<string, any> | null): string[] {
  if (!aiProfile) return [];
  
  const bullets: string[] = [];
  
  // Core company info
  if (aiProfile.companyDescription) {
    bullets.push(`Company: ${extractSnippet(aiProfile.companyDescription, 200)}`);
  }
  if (aiProfile.targetAudience) {
    bullets.push(`Target Audience: ${extractSnippet(aiProfile.targetAudience, 150)}`);
  }
  if (aiProfile.products && Array.isArray(aiProfile.products) && aiProfile.products.length > 0) {
    bullets.push(`Products/Services: ${aiProfile.products.slice(0, 5).join(', ')}`);
  }
  if (aiProfile.uniqueSellingPoints && Array.isArray(aiProfile.uniqueSellingPoints) && aiProfile.uniqueSellingPoints.length > 0) {
    bullets.push(`USPs: ${aiProfile.uniqueSellingPoints.slice(0, 3).join(', ')}`);
  }
  if (aiProfile.competitors && Array.isArray(aiProfile.competitors) && aiProfile.competitors.length > 0) {
    bullets.push(`Competitors: ${aiProfile.competitors.slice(0, 4).join(', ')}`);
  }
  if (aiProfile.brandVoice) {
    bullets.push(`Brand Voice: ${extractSnippet(aiProfile.brandVoice, 100)}`);
  }
  
  // Personal intelligence
  if (aiProfile.personalityType) {
    bullets.push(`Personality: ${aiProfile.personalityType}`);
  }
  if (aiProfile.communicationTone) {
    bullets.push(`Communication Style: ${aiProfile.communicationTone}`);
  }
  if (aiProfile.painPoints && Array.isArray(aiProfile.painPoints) && aiProfile.painPoints.length > 0) {
    bullets.push(`Pain Points: ${aiProfile.painPoints.slice(0, 3).join(', ')}`);
  }
  if (aiProfile.goals && Array.isArray(aiProfile.goals) && aiProfile.goals.length > 0) {
    bullets.push(`Goals: ${aiProfile.goals.slice(0, 3).join(', ')}`);
  }
  
  // Limit to 10 bullets max
  return bullets.slice(0, 10);
}

/**
 * Main function: Build knowledge context for a user
 * 
 * @param userId - The user ID to build context for
 * @param opts - Configuration options
 * @returns KnowledgeContext with aiProfile, sources, and digest string
 */
export async function buildKnowledgeContext(
  userId: string,
  opts: KnowledgeContextOptions = {}
): Promise<KnowledgeContext> {
  const {
    maxSources = DEFAULT_MAX_SOURCES,
    maxChars = opts.mode === 'power' ? DEFAULT_MAX_CHARS_POWER : DEFAULT_MAX_CHARS_SPACE,
    includeFileMeta = true,
    mode = 'space'
  } = opts;

  try {
    // 1. Load user data
    const user = await storage.getUser(userId);
    if (!user) {
      logger.warn(`[KNOWLEDGE] User not found: ${userId}`);
      return {
        aiProfile: null,
        sources: [],
        digest: '',
        sourceCount: 0,
        truncated: false,
        sourcesDebug: { rawCount: 0, mappedCount: 0, filteredCount: 0, ids: [], types: [], statuses: [], titlesPreview: [] }
      };
    }

    const aiProfile = user.aiProfile || null;

    // 2. Load active data sources (newest first, limited)
    let sources: UserDataSource[] = [];
    let sourcesDebug: SourcesDebug = {
      rawCount: 0,
      mappedCount: 0,
      filteredCount: 0,
      ids: [],
      types: [],
      statuses: [],
      titlesPreview: []
    };
    
    try {
      const allSources = await storage.getUserDataSources(userId);
      sourcesDebug.rawCount = allSources.length;
      
      logger.info(`[DIGEST] ═══ LOADING SOURCES for userId=${userId} mode=${mode} ═══`);
      logger.info(`[DIGEST] Raw sources from storage: ${allSources.length}`);
      
      // Log each source for debugging
      allSources.forEach((s: any, i: number) => {
        logger.info(`[DIGEST] Source[${i}]: id=${s.id} type=${s.type} status="${s.status}" title="${s.title?.substring(0, 30)}" contentText.length=${s.contentText?.length || 0}`);
      });
      
      // Map sources (all of them first)
      const mappedSources = allSources.map((s: any) => ({
        ...s,
        // Ensure contentText has a value - use title as fallback if empty
        contentText: s.contentText || s.title || ''
      }));
      sourcesDebug.mappedCount = mappedSources.length;
      
      // Filter: accept 'active', null, undefined, or empty string as active
      const filtered = mappedSources.filter((s: any) => {
        const status = (s.status || '').toLowerCase().trim();
        const isActive = !status || status === 'active';
        if (!isActive) {
          logger.info(`[DIGEST] FILTERED OUT: id=${s.id} status="${s.status}"`);
        }
        return isActive;
      });
      
      // Apply limit
      sources = filtered.slice(0, maxSources);
      sourcesDebug.filteredCount = sources.length;
      sourcesDebug.ids = sources.map((s: any) => s.id);
      sourcesDebug.types = sources.map((s: any) => s.type);
      sourcesDebug.statuses = sources.map((s: any) => s.status || 'active');
      sourcesDebug.titlesPreview = sources.map((s: any) => (s.title || '').substring(0, 40));
      
      logger.info(`[DIGEST] After filter: ${sources.length} sources (raw=${sourcesDebug.rawCount} mapped=${sourcesDebug.mappedCount} filtered=${sourcesDebug.filteredCount})`);
      logger.info(`[DIGEST] IDs: ${sourcesDebug.ids.join(', ')}`);
    } catch (err) {
      logger.error('[KNOWLEDGE] Failed to load data sources:', err);
      // Continue with empty sources
    }

    // 3. Build digest
    let digestParts: string[] = [];
    let truncated = false;

    // Header
    digestParts.push('═══ USER KNOWLEDGE CONTEXT ═══');
    
    // AI Profile section
    const profileBullets = buildAiProfileBullets(aiProfile);
    if (profileBullets.length > 0) {
      digestParts.push('');
      digestParts.push('📊 BUSINESS INTELLIGENCE:');
      digestParts.push(...profileBullets.map(b => `  • ${b}`));
    }

    // Data Sources section
    if (sources.length > 0) {
      digestParts.push('');
      digestParts.push(`📁 USER SOURCES (${sources.length} active):`);
      
      for (const source of sources) {
        const entry = formatSourceEntry(source, includeFileMeta);
        digestParts.push(`  ${entry}`);
      }
    } else {
      digestParts.push('');
      digestParts.push('📁 USER SOURCES: None added yet.');
    }

    digestParts.push('═══════════════════════════════');

    // 4. Combine and clamp to budget
    let digest = digestParts.join('\n');
    
    if (digest.length > maxChars) {
      digest = digest.substring(0, maxChars - 20) + '\n[...truncated...]';
      truncated = true;
    }

    logger.info(`[KNOWLEDGE] Built context for ${userId}: ${sources.length} sources, ${digest.length} chars, mode=${mode}`);

    return {
      aiProfile,
      sources,
      digest,
      sourceCount: sources.length,
      truncated,
      sourcesDebug
    };

  } catch (error) {
    logger.error('[KNOWLEDGE] Error building context:', error);
    return {
      aiProfile: null,
      sources: [],
      digest: '',
      sourceCount: 0,
      truncated: false,
      sourcesDebug: { rawCount: 0, mappedCount: 0, filteredCount: 0, ids: [], types: [], statuses: [], titlesPreview: [] }
    };
  }
}

/**
 * Quick helper: Get just the digest string for prompt injection
 */
export async function getKnowledgeDigest(
  userId: string,
  mode: 'space' | 'power' = 'space'
): Promise<string> {
  const context = await buildKnowledgeContext(userId, { mode });
  return context.digest;
}

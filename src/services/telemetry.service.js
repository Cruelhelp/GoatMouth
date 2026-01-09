/**
 * Telemetry Service
 *
 * Stores API request logs and config for odds API monitoring.
 */

const { supabase } = require('../config/database');

const DEFAULT_CONFIG = {
  logging_enabled: true,
  retention_days: 30
};

let cachedConfig = { ...DEFAULT_CONFIG };

async function refreshConfig() {
  try {
    const { data, error } = await supabase
      .from('odds_guidance_config')
      .select('*')
      .eq('id', 1)
      .single();

    if (!error && data) {
      cachedConfig = { ...DEFAULT_CONFIG, ...data };
    }
  } catch (error) {
    // Leave defaults if config is unavailable
  }

  return cachedConfig;
}

function getConfig() {
  return cachedConfig;
}

function shouldLog() {
  return cachedConfig.logging_enabled !== false;
}

async function logRequest(entry) {
  if (!shouldLog()) return;

  try {
    await supabase.from('odds_api_request_logs').insert(entry);
  } catch (error) {
    // Avoid breaking API responses if telemetry fails
  }
}

async function cleanupOldLogs() {
  const retentionDays = Number(cachedConfig.retention_days);
  if (!retentionDays || retentionDays <= 0) return;

  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();

  try {
    await supabase.from('odds_api_request_logs').delete().lt('created_at', cutoff);
    await supabase.from('odds_api_health_checks').delete().lt('created_at', cutoff);
  } catch (error) {
    // Ignore retention cleanup failures
  }
}

module.exports = {
  refreshConfig,
  getConfig,
  logRequest,
  cleanupOldLogs
};

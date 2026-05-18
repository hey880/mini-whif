'use strict'

exports.config = {
  app_name: [process.env.NEW_RELIC_APP_NAME || 'PersonaChat-API'],
  license_key: process.env.NEW_RELIC_LICENSE_KEY,
  logging: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'trace',
    filepath: 'stdout',
  },
  distributed_tracing: { enabled: true },
  transaction_tracer: {
    enabled: true,
    transaction_threshold: 'apdex_f',
    record_sql: 'obfuscated',
  },
  error_collector: {
    enabled: true,
    ignore_status_codes: [404],
  },
  application_logging: {
    enabled: true,
    forwarding: { enabled: true },
  },
  agent_enabled: process.env.NEW_RELIC_LICENSE_KEY !== undefined,
}

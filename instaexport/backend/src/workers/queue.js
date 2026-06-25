const PgBoss = require('pg-boss');

let boss = null;

async function initQueue() {
  // pg-boss uses the same Postgres DB as Supabase
  // Extract connection string from Supabase URL
  const connectionString = process.env.DATABASE_URL || buildConnectionString();

  boss = new PgBoss({
    connectionString,
    retryLimit: 3,
    retryDelay: 30,
    expireInHours: 24,
    deleteAfterDays: 7,
  });

  boss.on('error', err => console.error('[Queue] pg-boss error:', err));

  await boss.start();

  // Register worker
  const { processCommentIngestion } = require('./commentWorker');
  await boss.work('comment-ingestion', { teamSize: 3, teamConcurrency: 1 }, processCommentIngestion);

  console.log('[Queue] Workers registered');
  return boss;
}

function buildConnectionString() {
  // Supabase DB URL format
  const url = new URL(process.env.SUPABASE_URL);
  const host = url.hostname.replace('supabase.co', 'supabase.co').replace('https://', '');
  // Use direct connection for pg-boss (not the REST API)
  // Set DATABASE_URL in env for production
  return `postgresql://postgres:${process.env.SUPABASE_DB_PASSWORD}@db.${host}:5432/postgres`;
}

async function enqueueCommentIngestion(data) {
  if (!boss) throw new Error('Queue not initialized');
  const jobId = await boss.send('comment-ingestion', data, {
    priority: 1,
    retryLimit: 3,
  });
  return jobId;
}

async function getQueue() {
  return boss;
}

module.exports = { initQueue, enqueueCommentIngestion, getQueue };

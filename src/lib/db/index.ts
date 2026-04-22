import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

// Validate DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set in environment variables. Please add it to .env.local');
}

// Log the hostname for debugging
const dbUrl = process.env.DATABASE_URL;
const hostnameMatch = dbUrl.match(/@([^/]+)\//);
if (hostnameMatch) {
  console.log('🔗 Database hostname:', hostnameMatch[1]);
}

// Create a Pool with SSL configuration for all networks
const pool = new Pool({
  connectionString: dbUrl,
  ssl: {
    rejectUnauthorized: false,
  },
});

export const db = drizzle(pool, { schema });

// Re-export schema for convenience
export { schema };
export type Database = typeof db;

import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from './schema';
import 'dotenv/config';

// 1. Initialize the Neon connection
const client = new Pool({ connectionString: process.env.DATABASE_URL });
// 2. Initialize Drizzle with your schema
export const db = drizzle(client, { schema });
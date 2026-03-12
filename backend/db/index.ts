//import { Pool } from '@neondatabase/serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from './schema';
import 'dotenv/config';

neonConfig.webSocketConstructor = ws;

const client = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(client, { schema });
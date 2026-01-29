// Script to create an admin user for the dashboard
// Run with: npx tsx backend/scripts/create-admin.ts

import 'dotenv/config';
import { Pool } from '@neondatabase/serverless';
import bcrypt from 'bcrypt';

async function createAdmin() {
    const email = 'admin@freezybite.com';
    const password = 'admin123'; // Change this in production!
    const name = 'Admin User';
    const role = 'Super Admin';

    console.log('Creating admin user...');

    const client = new Pool({ connectionString: process.env.DATABASE_URL });

    const passwordHash = await bcrypt.hash(password, 10);

    try {
        // First check if user exists
        const existing = await client.query(
            'SELECT id FROM admin_users WHERE email = $1',
            [email.toLowerCase()]
        );

        if (existing.rows.length > 0) {
            console.log('');
            console.log('⚠️ Admin user already exists!');
            console.log('');
            console.log('📧 Email:', email);
            console.log('🔐 Password: admin123');
            console.log('');
            console.log('Login at: /admin/login.html');
        } else {
            // Create the user
            await client.query(
                `INSERT INTO admin_users (email, password_hash, name, role, is_active) 
                 VALUES ($1, $2, $3, $4, $5)`,
                [email.toLowerCase(), passwordHash, name, role, true]
            );

            console.log('');
            console.log('✅ Admin user created successfully!');
            console.log('');
            console.log('📧 Email:', email);
            console.log('🔐 Password:', password);
            console.log('👤 Role:', role);
            console.log('');
            console.log('Login at: /admin/login.html');
        }

    } catch (error: any) {
        console.error('Error:', error.message || error);
    }

    await client.end();
    process.exit(0);
}

createAdmin();

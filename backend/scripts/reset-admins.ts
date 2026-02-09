// Script to reset admin users - delete all and create new super admins
// Run with: npx tsx scripts/reset-admins.ts

import 'dotenv/config';
import { Pool } from '@neondatabase/serverless';
import bcrypt from 'bcrypt';

async function resetAdmins() {
    console.log('🔄 Resetting admin users...\n');

    const client = new Pool({ connectionString: process.env.DATABASE_URL });

    try {
        // 1. Delete all existing admin users
        console.log('🗑️  Deleting all existing admin users...');
        await client.query('DELETE FROM admin_users');
        console.log('✅ All existing admins deleted.\n');

        // 2. Hash passwords
        const password1Hash = await bcrypt.hash('EUI@2005', 10);
        const password2Hash = await bcrypt.hash('Karma@2005', 10);

        // 3. Insert new super admins
        console.log('👤 Creating new super admins...\n');

        // Admin 1
        await client.query(
            `INSERT INTO admin_users (email, password_hash, name, role, is_active, access) 
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
                'jojogaber123@gmail.com',
                password1Hash,
                'Jojo Gaber',
                'Super Admin',
                true,
                JSON.stringify(['overview', 'content', 'offers', 'products', 'orders', 'customers', 'messages', 'analytics', 'inventory', 'employees', 'users', 'settings'])
            ]
        );
        console.log('✅ Created: Jojogaber123@gmail.com (Super Admin)');

        // Admin 2
        await client.query(
            `INSERT INTO admin_users (email, password_hash, name, role, is_active, access) 
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
                'tootaa_20104@hotmail.com',
                password2Hash,
                'Tootaa',
                'Super Admin',
                true,
                JSON.stringify(['overview', 'content', 'offers', 'products', 'orders', 'customers', 'messages', 'analytics', 'inventory', 'employees', 'users', 'settings'])
            ]
        );
        console.log('✅ Created: Tootaa_20104@hotmail.com (Super Admin)');

        console.log('\n🎉 Admin reset complete!');
        console.log('\n📋 New admin credentials:');
        console.log('   1. Email: Jojogaber123@gmail.com | Password: EUI@2005');
        console.log('   2. Email: Tootaa_20104@hotmail.com | Password: Karma@2005');

    } catch (error: any) {
        console.error('❌ Error resetting admins:', error.message || error);
    }

    await client.end();
    process.exit(0);
}

resetAdmins();

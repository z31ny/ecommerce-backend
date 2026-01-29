// Script to reset admin password
import 'dotenv/config';
import { Pool } from '@neondatabase/serverless';
import bcrypt from 'bcrypt';

async function resetPassword() {
    const email = 'admin@freezybite.com';
    const password = 'admin123';

    console.log('Resetting password for:', email);

    const client = new Pool({ connectionString: process.env.DATABASE_URL });
    const passwordHash = await bcrypt.hash(password, 10);

    try {
        const result = await client.query(
            'UPDATE admin_users SET password_hash = $1 WHERE email = $2',
            [passwordHash, email]
        );

        if (result.rowCount && result.rowCount > 0) {
            console.log('');
            console.log('✅ Password reset successfully!');
            console.log('');
            console.log('📧 Email:', email);
            console.log('🔐 Password:', password);
        } else {
            console.log('No user found with that email');
        }

    } catch (error: any) {
        console.error('Error:', error.message);
    }

    await client.end();
    process.exit(0);
}

resetPassword();

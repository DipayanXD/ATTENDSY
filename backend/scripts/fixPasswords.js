const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function fixPasswords() {
    const hash = bcrypt.hashSync('password123', 10);
    console.log('New hash:', hash);
    console.log('Hash length:', hash.length);

    const result = await prisma.user.updateMany({
        data: { password_hash: hash }
    });

    console.log('Updated', result.count, 'users with corrected password hash');
    await prisma.$disconnect();
}

fixPasswords();

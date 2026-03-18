require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
    connectionString: process.env.DATABASE_URL,
});

async function migrate() {
    try {
        await client.connect();
        console.log('Connected to Neon Database.');

        // 1. Create the table
        await client.query(`
            CREATE TABLE IF NOT EXISTS site_content (
                id SERIAL PRIMARY KEY,
                data JSONB NOT NULL
            );
        `);
        console.log('Verified table exists.');

        // 2. Read local data
        const dataPath = path.join(__dirname, 'data', 'content.json');
        if (!fs.existsSync(dataPath)) {
            console.error('No content.json found to migrate.');
            process.exit(1);
        }

        const rawData = fs.readFileSync(dataPath, 'utf8');
        const contentJson = JSON.parse(rawData);

        // 3. Upsert into database
        // Delete all rows to ensure clean state, then insert.
        await client.query('TRUNCATE site_content RESTART IDENTITY CASCADE;');
        await client.query(
            'INSERT INTO site_content (data) VALUES ($1)',
            [JSON.stringify(contentJson)]
        );

        console.log('Successfully migrated content.json to Neon PostgreSQL JSONB store.');

    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        await client.end();
    }
}

migrate();

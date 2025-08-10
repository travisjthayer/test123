require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function runMigration() {
  try {
    console.log('Starting database migration...');
    
    // Check if files_new table already exists
    const checkTableQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'files_new'
      );
    `;
    
    const tableExists = await pool.query(checkTableQuery);
    
    if (tableExists.rows[0].exists) {
      console.log('Table files_new already exists. Skipping creation.');
    } else {
      // Create the files_new table
      const createTableQuery = `
        CREATE TABLE files_new (
          id SERIAL PRIMARY KEY,
          original_name VARCHAR(255) NOT NULL,
          stored_name VARCHAR(255) NOT NULL,
          mime_type VARCHAR(100),
          size BIGINT,
          upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `;
      
      await pool.query(createTableQuery);
      console.log('Table files_new created successfully.');
      
      // Create index
      const createIndexQuery = `
        CREATE INDEX idx_files_new_upload_date ON files_new(upload_date DESC);
      `;
      
      await pool.query(createIndexQuery);
      console.log('Index created successfully.');
    }
    
    // Verify the migration
    const verifyQuery = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'files_new'
      ORDER BY ordinal_position;
    `;
    
    const columns = await pool.query(verifyQuery);
    console.log('\nTable structure:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });
    
    console.log('\nMigration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
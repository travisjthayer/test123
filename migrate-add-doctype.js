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
    console.log('Starting database migration to add document_type_id...');
    
    // Check if column already exists
    const checkColumnQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'files_new' 
        AND column_name = 'document_type_id'
      );
    `;
    
    const columnExists = await pool.query(checkColumnQuery);
    
    if (columnExists.rows[0].exists) {
      console.log('Column document_type_id already exists. Skipping migration.');
    } else {
      // Add document_type_id column
      const alterTableQuery = `
        ALTER TABLE files_new 
        ADD COLUMN document_type_id INTEGER;
      `;
      
      await pool.query(alterTableQuery);
      console.log('Column document_type_id added successfully.');
      
      // Add foreign key constraint (optional, but good for referential integrity)
      const addForeignKeyQuery = `
        ALTER TABLE files_new 
        ADD CONSTRAINT fk_document_type 
        FOREIGN KEY (document_type_id) 
        REFERENCES "vlex_DocumentType"("DocumentTypeID")
        ON DELETE SET NULL;
      `;
      
      try {
        await pool.query(addForeignKeyQuery);
        console.log('Foreign key constraint added successfully.');
      } catch (fkError) {
        console.log('Note: Could not add foreign key constraint. This is okay if vlex_DocumentType structure is different.');
      }
    }
    
    // Verify the migration
    const verifyQuery = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'files_new'
      ORDER BY ordinal_position;
    `;
    
    const columns = await pool.query(verifyQuery);
    console.log('\nUpdated table structure:');
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
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function checkFilesNewColumns() {
  try {
    console.log('Checking files_new table structure...\n');
    
    // Get column information
    const query = `
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'files_new'
      ORDER BY ordinal_position;
    `;
    
    const result = await pool.query(query);
    
    console.log('Current columns in files_new:');
    console.log('--------------------------------');
    result.rows.forEach(col => {
      console.log(`${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
    // Check for the new columns specifically
    const hasPropertyId = result.rows.some(col => col.column_name.toLowerCase() === 'property_id' || col.column_name.toLowerCase() === 'propertyid');
    const hasDocumentTitle = result.rows.some(col => col.column_name.toLowerCase() === 'document_title' || col.column_name.toLowerCase() === 'documenttitle');
    
    console.log('\n--------------------------------');
    console.log(`PropertyID column: ${hasPropertyId ? '✓ EXISTS' : '✗ MISSING'}`);
    console.log(`DocumentTitle column: ${hasDocumentTitle ? '✓ EXISTS' : '✗ MISSING'}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkFilesNewColumns();
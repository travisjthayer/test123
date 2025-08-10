require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function checkTableStructure() {
  try {
    console.log('Checking vlex_DocumentType table structure...\n');
    
    // Get column information
    const query = `
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'vlex_DocumentType'
      ORDER BY ordinal_position;
    `;
    
    const result = await pool.query(query);
    
    if (result.rows.length === 0) {
      console.log('Table vlex_DocumentType not found or no columns.');
    } else {
      console.log('Columns in vlex_DocumentType:');
      console.log('--------------------------------');
      result.rows.forEach(col => {
        console.log(`Column: ${col.column_name}`);
        console.log(`  Type: ${col.data_type}`);
        console.log(`  Nullable: ${col.is_nullable}`);
        console.log(`  Default: ${col.column_default || 'none'}`);
        console.log('');
      });
    }
    
    // Also try to get a sample row
    console.log('\nSample data (first row):');
    console.log('--------------------------------');
    try {
      const sampleQuery = 'SELECT * FROM "vlex_DocumentType" LIMIT 1';
      const sampleResult = await pool.query(sampleQuery);
      if (sampleResult.rows.length > 0) {
        console.log(sampleResult.rows[0]);
      } else {
        console.log('No data in table');
      }
    } catch (err) {
      console.log('Could not fetch sample data:', err.message);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkTableStructure();
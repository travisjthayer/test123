require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function checkVlexDocuments() {
  try {
    console.log('Checking vlex_Documents table structure...\n');
    
    // Get column information
    const columnsQuery = `
      SELECT 
        column_name,
        data_type,
        is_nullable,
        character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'vlex_Documents'
      ORDER BY ordinal_position;
    `;
    
    const columnsResult = await pool.query(columnsQuery);
    
    if (columnsResult.rows.length === 0) {
      console.log('Table vlex_Documents not found.');
      return;
    }
    
    console.log('Columns in vlex_Documents:');
    console.log('--------------------------------');
    columnsResult.rows.forEach(col => {
      console.log(`${col.column_name}: ${col.data_type}${col.character_maximum_length ? `(${col.character_maximum_length})` : ''}`);
    });
    
    // Get sample data
    console.log('\n\nSample data (first 3 rows):');
    console.log('--------------------------------');
    const sampleQuery = `
      SELECT "FileName", "ContentType", "Size", "Folder"
      FROM "vlex_Documents" 
      LIMIT 3
    `;
    
    try {
      const sampleResult = await pool.query(sampleQuery);
      if (sampleResult.rows.length > 0) {
        sampleResult.rows.forEach((row, index) => {
          console.log(`\nRow ${index + 1}:`);
          console.log(`  FileName: ${row.FileName}`);
          console.log(`  ContentType: ${row.ContentType}`);
          console.log(`  Size: ${row.Size}`);
          console.log(`  Folder: ${row.Folder}`);
        });
      } else {
        console.log('No data in table');
      }
    } catch (err) {
      console.log('Could not fetch sample data. Columns might be named differently.');
      console.log('Error:', err.message);
    }
    
    // Get row count
    const countQuery = 'SELECT COUNT(*) as count FROM "vlex_Documents"';
    const countResult = await pool.query(countQuery);
    console.log(`\nTotal rows in vlex_Documents: ${countResult.rows[0].count}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkVlexDocuments();
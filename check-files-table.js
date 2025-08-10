require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function checkFilesTable() {
  try {
    console.log('Checking Files table structure...\n');
    
    // Get column information
    const columnsQuery = `
      SELECT 
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'Files'
      ORDER BY ordinal_position;
    `;
    
    const columnsResult = await pool.query(columnsQuery);
    
    console.log('Columns in Files table:');
    console.log('--------------------------------');
    columnsResult.rows.forEach(col => {
      console.log(`${col.column_name}: ${col.data_type}`);
    });
    
    // Get sample data matching FileIDs from vlex_Documents
    console.log('\n\nSample Files data (matching FileIDs from vlex_Documents):');
    console.log('--------------------------------');
    const sampleQuery = `
      SELECT *
      FROM "Files" 
      WHERE "FileID" IN (165, 166, 167)
      LIMIT 3
    `;
    
    try {
      const sampleResult = await pool.query(sampleQuery);
      if (sampleResult.rows.length > 0) {
        sampleResult.rows.forEach((row, index) => {
          console.log(`\nRow ${index + 1}:`);
          Object.entries(row).forEach(([key, value]) => {
            if (key === 'FileContent' && value) {
              console.log(`  ${key}: <Binary data, ${value.length} bytes>`);
            } else {
              console.log(`  ${key}: ${value}`);
            }
          });
        });
      } else {
        console.log('No matching data found');
      }
    } catch (err) {
      console.log('Error fetching Files data:', err.message);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkFilesTable();
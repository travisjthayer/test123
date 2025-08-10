require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function checkVlexDocumentsDetailed() {
  try {
    console.log('Checking vlex_Documents table - detailed view...\n');
    
    // Get sample data with actual column names
    console.log('Sample data (first 3 rows):');
    console.log('--------------------------------');
    const sampleQuery = `
      SELECT *
      FROM "vlex_Documents" 
      LIMIT 3
    `;
    
    const sampleResult = await pool.query(sampleQuery);
    if (sampleResult.rows.length > 0) {
      sampleResult.rows.forEach((row, index) => {
        console.log(`\nRow ${index + 1}:`);
        Object.entries(row).forEach(([key, value]) => {
          console.log(`  ${key}: ${value}`);
        });
      });
    } else {
      console.log('No data in table');
    }
    
    // Check if there's a related Files table
    console.log('\n\nChecking for related files information...');
    console.log('--------------------------------');
    
    // Look for tables that might contain file data
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND (table_name LIKE '%file%' OR table_name LIKE '%File%')
      ORDER BY table_name;
    `;
    
    const tablesResult = await pool.query(tablesQuery);
    console.log('Tables with "file" in name:');
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkVlexDocumentsDetailed();
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function checkFilesCorrect() {
  try {
    // Get sample data from Files table using correct column name
    console.log('Sample Files data (FileId 165, 166, 167):');
    console.log('--------------------------------');
    const sampleQuery = `
      SELECT "FileId", "FileName", "Extension", "Size", "ContentType", "Folder", "Content"
      FROM "Files" 
      WHERE "FileId" IN (165, 166, 167)
    `;
    
    const sampleResult = await pool.query(sampleQuery);
    if (sampleResult.rows.length > 0) {
      sampleResult.rows.forEach((row, index) => {
        console.log(`\nFileId ${row.FileId}:`);
        console.log(`  FileName: ${row.FileName}`);
        console.log(`  Extension: ${row.Extension}`);
        console.log(`  Size: ${row.Size}`);
        console.log(`  ContentType: ${row.ContentType}`);
        console.log(`  Folder: ${row.Folder}`);
        console.log(`  Content: ${row.Content ? `<Data exists, ${row.Content.length} chars>` : 'NULL'}`);
      });
    } else {
      console.log('No matching files found');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkFilesCorrect();
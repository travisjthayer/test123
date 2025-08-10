require('dotenv').config();
const { Pool } = require('pg');

async function checkDatabase() {
  // First connect without specifying a database to check what databases exist
  const poolCheck = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'postgres' // Connect to default postgres database
  });

  try {
    console.log('Checking available databases...');
    
    // List all databases
    const dbListQuery = `
      SELECT datname 
      FROM pg_database 
      WHERE datistemplate = false
      ORDER BY datname;
    `;
    
    const databases = await poolCheck.query(dbListQuery);
    console.log('\nAvailable databases:');
    databases.rows.forEach(db => {
      console.log(`  - ${db.datname}`);
    });
    
    // Check if satrac-files exists
    const checkDbQuery = `
      SELECT EXISTS (
        SELECT FROM pg_database 
        WHERE datname = 'satrac-files'
      );
    `;
    
    const dbExists = await poolCheck.query(checkDbQuery);
    
    if (!dbExists.rows[0].exists) {
      console.log('\nDatabase "satrac-files" does not exist.');
      console.log('Creating database "satrac-files"...');
      
      // Create the database
      await poolCheck.query('CREATE DATABASE "satrac-files"');
      console.log('Database "satrac-files" created successfully!');
    } else {
      console.log('\nDatabase "satrac-files" already exists.');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await poolCheck.end();
  }
}

checkDatabase();
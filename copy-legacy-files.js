require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function copyLegacyFiles() {
  try {
    console.log('Starting legacy file copy process...\n');
    
    // Get all files from the Files table
    const query = `
      SELECT 
        "FileId",
        "FileName",
        "Folder",
        "Size",
        "ContentType"
      FROM "Files"
      WHERE "FileName" IS NOT NULL
      ORDER BY "FileId"
    `;
    
    const result = await pool.query(query);
    console.log(`Found ${result.rows.length} files in database\n`);
    
    let successCount = 0;
    let errorCount = 0;
    let notFoundCount = 0;
    const errors = [];
    const notFound = [];
    
    // Process each file
    for (const file of result.rows) {
      const sourcePath = path.join('Old_Files', file.Folder || '', file.FileName);
      const destPath = path.join('uploads', 'temp', file.FileName);
      
      try {
        // Check if source file exists
        if (fs.existsSync(sourcePath)) {
          // Check if destination already exists
          if (fs.existsSync(destPath)) {
            // Add FileId to filename if duplicate exists
            const ext = path.extname(file.FileName);
            const nameWithoutExt = path.basename(file.FileName, ext);
            const newDestPath = path.join('uploads', 'temp', `${nameWithoutExt}_${file.FileId}${ext}`);
            
            fs.copyFileSync(sourcePath, newDestPath);
            console.log(`✓ Copied (renamed): ${file.FileName} -> ${path.basename(newDestPath)}`);
          } else {
            fs.copyFileSync(sourcePath, destPath);
            console.log(`✓ Copied: ${file.FileName}`);
          }
          successCount++;
        } else {
          console.log(`✗ Not found: ${sourcePath}`);
          notFoundCount++;
          notFound.push({
            fileId: file.FileId,
            fileName: file.FileName,
            expectedPath: sourcePath
          });
        }
      } catch (error) {
        console.log(`✗ Error copying ${file.FileName}: ${error.message}`);
        errorCount++;
        errors.push({
          fileId: file.FileId,
          fileName: file.FileName,
          error: error.message
        });
      }
    }
    
    // Print summary
    console.log('\n' + '='.repeat(50));
    console.log('COPY SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total files in database: ${result.rows.length}`);
    console.log(`Successfully copied: ${successCount}`);
    console.log(`Files not found: ${notFoundCount}`);
    console.log(`Errors: ${errorCount}`);
    
    if (notFound.length > 0) {
      console.log('\nFiles not found (first 10):');
      notFound.slice(0, 10).forEach(f => {
        console.log(`  - FileId ${f.fileId}: ${f.fileName}`);
        console.log(`    Expected at: ${f.expectedPath}`);
      });
      
      if (notFound.length > 10) {
        console.log(`  ... and ${notFound.length - 10} more`);
      }
    }
    
    if (errors.length > 0) {
      console.log('\nErrors encountered:');
      errors.forEach(e => {
        console.log(`  - FileId ${e.fileId}: ${e.fileName}`);
        console.log(`    Error: ${e.error}`);
      });
    }
    
    // Create a report file
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalFiles: result.rows.length,
        successCount,
        notFoundCount,
        errorCount
      },
      notFound,
      errors
    };
    
    fs.writeFileSync(
      path.join('uploads', 'temp', 'migration_report.json'),
      JSON.stringify(report, null, 2)
    );
    
    console.log('\nDetailed report saved to: uploads/temp/migration_report.json');
    
  } catch (error) {
    console.error('Fatal error:', error.message);
  } finally {
    await pool.end();
  }
}

copyLegacyFiles();
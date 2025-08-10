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

async function importLegacyData() {
  try {
    console.log('Starting legacy data import...\n');
    
    // Get data from vlex_Documents joined with Files
    const query = `
      SELECT 
        d."DocumentID",
        d."PropertyID",
        d."DocumentTitle",
        d."DateAdded",
        d."DocumentTypeID",
        d."FileID",
        f."FileName",
        f."ContentType",
        f."Size"
      FROM "vlex_Documents" d
      INNER JOIN "Files" f ON d."FileID" = f."FileId"
      WHERE f."FileName" IS NOT NULL
      ORDER BY d."DocumentID"
    `;
    
    const result = await pool.query(query);
    console.log(`Found ${result.rows.length} records to import\n`);
    
    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors = [];
    const skipped = [];
    
    // Check which files exist in uploads/temp
    const tempFiles = fs.readdirSync('uploads/temp').filter(f => f !== 'migration_report.json');
    console.log(`${tempFiles.length} files available in uploads/temp\n`);
    
    for (const record of result.rows) {
      try {
        const fileName = record.FileName;
        
        // Check if file exists in temp folder (or with renamed version)
        let storedName = fileName;
        let fileExists = tempFiles.includes(fileName);
        
        if (!fileExists) {
          // Check for renamed version (with FileID appended)
          const ext = path.extname(fileName);
          const nameWithoutExt = path.basename(fileName, ext);
          const renamedVersion = `${nameWithoutExt}_${record.FileID}${ext}`;
          
          if (tempFiles.includes(renamedVersion)) {
            storedName = renamedVersion;
            fileExists = true;
          }
        }
        
        if (!fileExists) {
          console.log(`⚠ Skipping ${fileName} - file not found in temp folder`);
          skippedCount++;
          skipped.push({
            documentId: record.DocumentID,
            fileName: record.FileName,
            reason: 'File not found in uploads/temp'
          });
          continue;
        }
        
        // Insert into files_new
        const insertQuery = `
          INSERT INTO files_new (
            original_name,
            stored_name,
            mime_type,
            size,
            upload_date,
            document_type_id,
            "PropertyID",
            "DocumentTitle"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `;
        
        const values = [
          record.FileName,           // original_name
          storedName,               // stored_name (actual file in temp folder)
          record.ContentType,       // mime_type
          record.Size,              // size
          record.DateAdded,         // upload_date
          record.DocumentTypeID,    // document_type_id
          record.PropertyID,        // PropertyID
          record.DocumentTitle      // DocumentTitle
        ];
        
        await pool.query(insertQuery, values);
        console.log(`✓ Imported: ${record.DocumentTitle} (${fileName})`);
        successCount++;
        
      } catch (error) {
        console.log(`✗ Error importing ${record.FileName}: ${error.message}`);
        errorCount++;
        errors.push({
          documentId: record.DocumentID,
          fileName: record.FileName,
          error: error.message
        });
      }
    }
    
    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('IMPORT SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total records found: ${result.rows.length}`);
    console.log(`Successfully imported: ${successCount}`);
    console.log(`Skipped (file not found): ${skippedCount}`);
    console.log(`Errors: ${errorCount}`);
    
    if (skipped.length > 0) {
      console.log('\nSkipped files:');
      skipped.forEach(s => {
        console.log(`  - DocumentID ${s.documentId}: ${s.fileName}`);
      });
    }
    
    if (errors.length > 0) {
      console.log('\nErrors encountered:');
      errors.forEach(e => {
        console.log(`  - DocumentID ${e.documentId}: ${e.fileName}`);
        console.log(`    Error: ${e.error}`);
      });
    }
    
    // Verify import
    const verifyQuery = 'SELECT COUNT(*) as count FROM files_new';
    const verifyResult = await pool.query(verifyQuery);
    console.log(`\nTotal records now in files_new: ${verifyResult.rows[0].count}`);
    
    // Sample the imported data
    console.log('\nSample imported records:');
    const sampleQuery = `
      SELECT 
        f.id,
        f.original_name,
        f.stored_name,
        f."DocumentTitle",
        f."PropertyID",
        dt."TypeName" as document_type
      FROM files_new f
      LEFT JOIN "vlex_DocumentType" dt ON f.document_type_id = dt."DocumentTypeID"
      WHERE f."PropertyID" IS NOT NULL
      ORDER BY f.id
      LIMIT 5
    `;
    
    const sampleResult = await pool.query(sampleQuery);
    sampleResult.rows.forEach((row, index) => {
      console.log(`\n${index + 1}. ${row.DocumentTitle}`);
      console.log(`   File: ${row.original_name}`);
      console.log(`   Stored: ${row.stored_name}`);
      console.log(`   PropertyID: ${row.PropertyID}`);
      console.log(`   Type: ${row.document_type || 'Unknown'}`);
    });
    
    // Create final report
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalRecords: result.rows.length,
        successCount,
        skippedCount,
        errorCount
      },
      skipped,
      errors
    };
    
    fs.writeFileSync(
      'import_report.json',
      JSON.stringify(report, null, 2)
    );
    
    console.log('\nDetailed report saved to: import_report.json');
    
  } catch (error) {
    console.error('Fatal error:', error.message);
  } finally {
    await pool.end();
  }
}

importLegacyData();
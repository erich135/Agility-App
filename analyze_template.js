import XLSX from 'xlsx';
import fs from 'fs';

// Read the Excel template file
try {
    const workbook = XLSX.readFile('2017 draft AFS - GC.xlsx');
    const sheetNames = workbook.SheetNames;
    
    console.log('=== FINANCIAL TEMPLATE ANALYSIS ===');
    console.log('Sheet Names:', sheetNames);
    console.log('\n');
    
    // Analyze each sheet
    sheetNames.forEach(sheetName => {
        console.log(`=== Sheet: ${sheetName} ===`);
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });
        
        // Show first 20 rows to understand structure
        console.log('First 20 rows:');
        data.slice(0, 20).forEach((row, index) => {
            if (row.length > 0) {
                console.log(`Row ${index + 1}:`, row.slice(0, 5)); // First 5 columns
            }
        });
        console.log('\n');
    });
    
} catch (error) {
    console.error('Error reading Excel file:', error);
}
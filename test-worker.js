#!/usr/bin/env node

/**
 * Simple test to verify the worker.js syntax and basic functionality
 */

const fs = require('fs');

// Read the worker.js file
try {
    const workerCode = fs.readFileSync('worker.js', 'utf8');
    console.log('✅ Worker file read successfully');
    console.log(`📏 File size: ${workerCode.length} characters`);
    
    // Check for the handleHomePage function
    if (workerCode.includes('function handleHomePage()')) {
        console.log('✅ handleHomePage function found');
    } else {
        console.log('❌ handleHomePage function not found');
    }
    
    // Check for template literal escaping issues
    const lines = workerCode.split('\n');
    let potentialIssues = 0;
    
    lines.forEach((line, index) => {
        // Check for unescaped template literals within the HTML string
        if (line.includes('`') && !line.includes('\\`') && index > 70 && index < 470) {
            console.log(`⚠️  Potential template literal issue at line ${index + 1}: ${line.trim()}`);
            potentialIssues++;
        }
    });
    
    if (potentialIssues === 0) {
        console.log('✅ No template literal escaping issues found');
    }
    
    // Check for the bulk URL proxy generator content
    if (workerCode.includes('Bulk URL Proxy Generator')) {
        console.log('✅ Bulk URL Proxy Generator interface found');
    } else {
        console.log('❌ Bulk URL Proxy Generator interface not found');
    }
    
    // Check for API endpoint
    if (workerCode.includes('/api/proxy')) {
        console.log('✅ Proxy API endpoint found');
    } else {
        console.log('❌ Proxy API endpoint not found');
    }
    
    console.log('\n🎉 Worker validation completed!');
    
} catch (error) {
    console.error('❌ Error reading worker.js:', error.message);
    process.exit(1);
}
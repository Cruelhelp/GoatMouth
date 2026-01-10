#!/usr/bin/env node

/**
 * Console Log Removal Script
 * Removes console.log, console.warn, console.error statements from production JavaScript files
 * while preserving critical error boundaries
 */

const fs = require('fs');
const path = require('path');

// Configuration
const JS_DIR = path.join(__dirname, '../public/js');
const BACKUP_DIR = path.join(__dirname, '../backups/js-before-console-removal');

// Console methods to remove
const CONSOLE_METHODS = ['log', 'warn', 'error', 'info', 'debug', 'trace'];

// Files to exclude from processing
const EXCLUDED_FILES = ['sanitize-helper.js']; // Keep error logging in sanitize helper

/**
 * Create backup of files before modification
 */
function createBackup() {
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    const files = fs.readdirSync(JS_DIR).filter(file => file.endsWith('.js'));
    files.forEach(file => {
        const src = path.join(JS_DIR, file);
        const dest = path.join(BACKUP_DIR, file);
        fs.copyFileSync(src, dest);
    });

    console.log(`✓ Backed up ${files.length} files to ${BACKUP_DIR}`);
}

/**
 * Remove console statements from a string of code
 * @param {string} code - JavaScript code
 * @returns {string} - Code with console statements removed
 */
function removeConsoleLogs(code) {
    let modifiedCode = code;
    let removedCount = 0;

    CONSOLE_METHODS.forEach(method => {
        // Match console.method(...) including multiline calls
        const regex = new RegExp(
            `console\\.${method}\\s*\\([^;]*\\);?`,
            'g'
        );

        // Count matches before removal
        const matches = modifiedCode.match(regex);
        if (matches) {
            removedCount += matches.length;
        }

        // Remove console statements
        modifiedCode = modifiedCode.replace(regex, '');
    });

    // Remove empty lines that were left after removal
    modifiedCode = modifiedCode.replace(/^\s*[\r\n]/gm, match => {
        // Only remove if it's truly empty, keep single newlines
        return match.trim() === '' ? '' : match;
    });

    return { code: modifiedCode, removedCount };
}

/**
 * Process a single JavaScript file
 * @param {string} filePath - Path to JS file
 */
function processFile(filePath) {
    const fileName = path.basename(filePath);

    // Skip excluded files
    if (EXCLUDED_FILES.includes(fileName)) {
        console.log(`⊘ Skipped ${fileName} (excluded)`);
        return;
    }

    const code = fs.readFileSync(filePath, 'utf8');
    const { code: modifiedCode, removedCount } = removeConsoleLogs(code);

    if (removedCount > 0) {
        fs.writeFileSync(filePath, modifiedCode, 'utf8');
        console.log(`✓ ${fileName}: Removed ${removedCount} console statement(s)`);
    } else {
        console.log(`- ${fileName}: No console statements found`);
    }
}

/**
 * Main execution
 */
function main() {
    console.log('🧹 Starting console log removal...\n');

    // Create backup first
    createBackup();
    console.log('');

    // Process all JS files
    const files = fs.readdirSync(JS_DIR)
        .filter(file => file.endsWith('.js'))
        .map(file => path.join(JS_DIR, file));

    files.forEach(processFile);

    console.log('\n✅ Console log removal complete!');
    console.log(`📁 Backups saved to: ${BACKUP_DIR}`);
}

// Run if executed directly
if (require.main === module) {
    main();
}

module.exports = { removeConsoleLogs };

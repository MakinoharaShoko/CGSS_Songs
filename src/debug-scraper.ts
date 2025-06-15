import { CGSSScraper } from './scraper.js';
import * as cheerio from 'cheerio';
import fs from 'fs';

async function debugScraper() {
  const scraper = new CGSSScraper();
  const url = 'https://project-imas.wiki/THE_iDOLM@STER_CINDERELLA_GIRLS_STARLIGHT_STAGE';
  
  try {
    console.log('🔍 Fetching page for debugging...');
    const html = await scraper.fetchPage(url);
    
    // Save HTML to file for inspection
    fs.writeFileSync('debug-page.html', html);
    console.log('💾 Saved HTML to debug-page.html');
    
    const $ = cheerio.load(html);
    
    // Find all tables and their headers
    console.log('\n📋 Analyzing tables on the page:');
    $('table').each((i, table) => {
      const $table = $(table);
      console.log(`\n--- Table ${i + 1} ---`);
      
      // Get headers
      const headers: string[] = [];
      $table.find('tr').first().find('th').each((j, th) => {
        headers.push($(th).text().trim());
      });
      
      if (headers.length > 0) {
        console.log(`Headers: [${headers.join(' | ')}]`);
        
        // Show first few data rows
        const dataRows = $table.find('tr').slice(1, 4);
        dataRows.each((k, row) => {
          const cells: string[] = [];
          $(row).find('td').each((l, cell) => {
            cells.push($(cell).text().trim().substring(0, 30) + '...');
          });
          if (cells.length > 0) {
            console.log(`Row ${k + 1}: [${cells.join(' | ')}]`);
          }
        });
      } else {
        console.log('No headers found');
      }
    });
    
    // Look for specific patterns
    console.log('\n🔍 Looking for song-related content:');
    const songElements = $('*:contains("Song")');
    console.log(`Found ${songElements.length} elements containing "Song"`);
    
    const idolElements = $('*:contains("Idol")');
    console.log(`Found ${idolElements.length} elements containing "Idol"`);
    
    const attributeElements = $('*:contains("Attribute")');
    console.log(`Found ${attributeElements.length} elements containing "Attribute"`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

debugScraper(); 
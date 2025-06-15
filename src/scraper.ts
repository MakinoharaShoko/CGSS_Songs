import * as cheerio from 'cheerio';
import fetch from 'node-fetch';

export interface ScrapedSong {
  name: string;           // Song Name
  attributeType: string;  // "All Types", "Cool", "Cute", "Passion"
  howToObtain?: string;   // How to obtain the song
  originalIdols: string;  // Original idol string for verification
  idols: string[];        // Array of idol names (comma and "and" separated in original)
}

export interface ScrapedIdol {
  name: string;
}

export class CGSSScraper {
  private userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
  
  async fetchPage(url: string): Promise<string> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.text();
    } catch (error) {
      console.error(`Failed to fetch ${url}:`, error);
      throw error;
    }
  }

  findSongTables(html: string): ScrapedSong[] {
    const $ = cheerio.load(html);
    const songs: ScrapedSong[] = [];

    // Find all tables on the page
    $('table').each((tableIndex, table) => {
      const $table = $(table);
      
      // Check if this table has the right headers
      const headers: string[] = [];
      $table.find('tr').first().find('th').each((i, th) => {
        headers.push($(th).text().trim());
      });
      
      // Look for tables that contain song data (be more flexible with matching)
      const headerText = headers.join(' ').toLowerCase();
      const containsSongs = headerText.includes('song') || 
                           headers.some(h => h.includes('Songs')) ||
                           headers.some(h => h.includes('Solo Songs')) ||
                           headers.some(h => h.includes('MASTER'));
      
      // Also check table content for song patterns
      let hasAttributeInfo = false;
      let hasIdolInfo = false;
      
      $table.find('tr').slice(1, 5).each((i, row) => {
        const rowText = $(row).text().toLowerCase();
        if (rowText.includes('cute') || rowText.includes('cool') || rowText.includes('passion') || rowText.includes('all types')) {
          hasAttributeInfo = true;
        }
        if (rowText.length > 50) { // Likely contains idol names
          hasIdolInfo = true;
        }
      });
      
      if (containsSongs && (hasAttributeInfo || hasIdolInfo)) {
        console.log(`📋 Found potential song table ${tableIndex + 1} with headers: [${headers.join(', ')}]`);
        
        // Parse this table
        const tableSongs = this.parseSongTable($, $table, headers);
        if (tableSongs.length > 0) {
          console.log(`✅ Successfully parsed ${tableSongs.length} songs from table ${tableIndex + 1}`);
          songs.push(...tableSongs);
        }
      }
    });

    return songs;
  }

  parseSongTable($: cheerio.CheerioAPI, $table: cheerio.Cheerio<cheerio.Element>, headers: string[]): ScrapedSong[] {
    const songs: ScrapedSong[] = [];
    
    // Try to intelligently detect column positions
    let songNameIndex = -1;
    let attributeIndex = -1;
    let idolsIndex = -1;
    let obtainIndex = -1;
    
    // Look for column patterns in the first few data rows
    const firstDataRow = $table.find('tr').slice(1).first();
    const sampleCells = firstDataRow.find('td');
    
    sampleCells.each((i, cell) => {
      const cellText = $(cell).text().trim().toLowerCase();
      
      // Song name is usually first column or contains musical titles
      if (i === 0 || cellText.includes('☆') || cellText.includes('♪') || cellText.includes('!')) {
        songNameIndex = i;
      }
      
      // Attribute type column
      if (cellText.includes('cute') || cellText.includes('cool') || cellText.includes('passion') || cellText.includes('all types')) {
        attributeIndex = i;
      }
      
      // Idols column (usually longer text with names)
      if (cellText.length > 20 && (cellText.includes(' ') || cellText.includes(','))) {
        idolsIndex = i;
      }
      
      // How to obtain column
      if (cellText.includes('available') || cellText.includes('purchase') || cellText.includes('episode')) {
        obtainIndex = i;
      }
    });
    
    // Fallback: use header-based detection
    if (songNameIndex === -1) {
      songNameIndex = headers.findIndex(h => h.toLowerCase().includes('song'));
    }
    if (attributeIndex === -1) {
      attributeIndex = headers.findIndex(h => h.toLowerCase().includes('attribute') || h.toLowerCase().includes('type'));
    }
    if (idolsIndex === -1) {
      idolsIndex = headers.findIndex(h => h.toLowerCase().includes('idol'));
    }
    if (obtainIndex === -1) {
      obtainIndex = headers.findIndex(h => h.toLowerCase().includes('obtain') || h.toLowerCase().includes('how'));
    }
    
    // Use position-based fallback if detection fails
    if (songNameIndex === -1) songNameIndex = 0;
    if (attributeIndex === -1) attributeIndex = 1;
    if (idolsIndex === -1) idolsIndex = 2;
    if (obtainIndex === -1) obtainIndex = 3;
    
    console.log(`📊 Column mapping: Song=${songNameIndex}, Attribute=${attributeIndex}, Idols=${idolsIndex}, Obtain=${obtainIndex}`);
    
    // Parse data rows (skip header row)
    $table.find('tr').slice(1).each((rowIndex, row) => {
      const $row = $(row);
      
      // Skip rows that are section dividers or have colspan
      if ($row.find('td[colspan]').length > 0) return;
      
      const cells = $row.find('td');
      if (cells.length < 3) return; // Need at least 3 columns
      
      const name = songNameIndex < cells.length ? $(cells[songNameIndex]).text().trim() : '';
      const attributeType = attributeIndex < cells.length ? $(cells[attributeIndex]).text().trim() : '';
      const idolsCell = idolsIndex < cells.length ? $(cells[idolsIndex]) : null;
      const howToObtain = obtainIndex < cells.length ? $(cells[obtainIndex]).text().trim() : '';
      
      // Parse idols - handle both links and plain text
      const idols: string[] = [];
      let originalIdolsText = '';
      
      if (idolsCell) {
        // Get original text for verification
        originalIdolsText = idolsCell.text().trim();
        
        // First try to get text from links
        idolsCell.find('a').each((i, link) => {
          const idolName = $(link).text().trim();
          if (idolName && idolName.length > 1) idols.push(idolName);
        });
        
        // If no links found, parse plain text and split by comma and "and"
        if (idols.length === 0) {
          const plainText = originalIdolsText;
          if (plainText && plainText.length > 1) {
            // Split by comma and "and", clean up names
            const names = plainText
              .split(/,|\sand\s/i) // Split by comma or " and " (case insensitive)
              .map(n => n.trim())
              .filter(n => n && n.length > 1);
            idols.push(...names);
          }
        }
      }

      if (name && name.length > 1 && attributeType && idols.length > 0) {
        songs.push({
          name,
          attributeType,
          howToObtain: howToObtain || undefined,
          originalIdols: originalIdolsText,
          idols,
        });
        
        console.log(`  ➤ ${name} (${attributeType}) - ${idols.length} idols`);
      }
    });

    return songs;
  }

  async scrapeSongs(url: string): Promise<ScrapedSong[]> {
    const html = await this.fetchPage(url);
    return this.findSongTables(html);
  }

  async scrapeIdols(url: string): Promise<ScrapedIdol[]> {
    // Simple implementation - in reality this would parse idol pages
    return [];
  }
}
import * as cheerio from 'cheerio';
import fetch from 'node-fetch';

export interface ScrapedSong {
  name: string;           // Song Name
  attributeType: string;  // "All Types", "Cool", "Cute", "Passion"
  howToObtain?: string;   // How to obtain the song
  originalIdols: string;  // Original idol string for verification
  idols: string[];        // Array of idol names (comma and "and" separated in original)
  unitName?: string;      // Unit name if this is a unit song
  unitUrl?: string;       // Unit page URL for scraping
}

export interface ScrapedIdol {
  name: string;
}

export interface ScrapedUnit {
  name: string;
  url: string;
  members: string[];
}

export class CGSSScraper {
  private userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
  private baseUrl = 'https://project-imas.wiki';
  
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

  isUnitLink(element: cheerio.Cheerio<any>): boolean {
    const href = element.attr('href') || '';
    const text = element.text().trim();
    
    // Check if it's a unit page link (groups typically have their own pages)
    const isUnitPage = href.includes('/') && !href.includes('#') && 
                      !href.includes('Idol') && text.length > 3;
    
    // Additional checks for common unit patterns
    const unitPatterns = [
      'mirror', 'TRUE COLORS', 'VelvetRose', 'Fascinate', 'Cute', 'Cool', 'Passion',
      'O-Ku-Ri-Mo-No', 'Sunday!', 'Mujuuryoku Shuttle', 'Babel', 'cosmic cosmic',
      'Mirror Ball Love', 'Unlock Starbeat'
    ];
    
    const isKnownUnit = unitPatterns.some(pattern => 
      text.toLowerCase().includes(pattern.toLowerCase())
    );
    
    return isUnitPage || isKnownUnit;
  }

  async scrapeUnitPage(url: string): Promise<ScrapedUnit | null> {
    try {
      console.log(`🎭 Scraping unit page: ${url}`);
      const html = await this.fetchPage(url);
      const $ = cheerio.load(html);
      
      // Get unit name from page title or first heading
      let unitName = '';
      const titleElement = $('h1').first();
      if (titleElement.length) {
        unitName = titleElement.text().trim();
      } else {
        // Fallback to extracting from URL
        const urlParts = url.split('/');
        unitName = urlParts[urlParts.length - 1].replace(/_/g, ' ');
      }
      
      // Look for unit data table or member information
      const members: string[] = [];
      
      // Method 1: Look for "General Unit Data" or similar tables
      $('table').each((i, table) => {
        const $table = $(table);
        const tableText = $table.text().toLowerCase();
        
        if (tableText.includes('members') || tableText.includes('original name')) {
          $table.find('tr').each((j, row) => {
            const $row = $(row);
            const rowText = $row.text().toLowerCase();
            
            if (rowText.includes('members') || rowText.includes('member')) {
              // Find links in this row
              $row.find('a').each((k, link) => {
                const memberName = $(link).text().trim();
                if (memberName && memberName.length > 2 && !memberName.includes('http')) {
                  members.push(memberName);
                }
              });
              
              // Also try parsing text if no links
              if (members.length === 0) {
                const memberText = $row.find('td').last().text().trim();
                if (memberText && memberText.length > 5) {
                  const parsedMembers = memberText
                    .split(/,|\sand\s/i)
                    .map(m => m.trim())
                    .filter(m => m && m.length > 2);
                  members.push(...parsedMembers);
                }
              }
            }
          });
        }
      });
      
      // Method 2: Look for member links in the page content
      if (members.length === 0) {
        $('a').each((i, link) => {
          const href = $(link).attr('href') || '';
          const text = $(link).text().trim();
          
          // Check if this looks like an idol page link
          if (href.includes('/') && text.length > 2 && text.length < 30 &&
              !text.includes('http') && !text.includes('@') && 
              !href.includes('#') && !href.includes('Category:')) {
            
            // Additional filtering for common idol name patterns
            const hasJapaneseName = /[a-zA-Z]+ [a-zA-Z]+/.test(text) || 
                                  text.includes('Hisakawa') || text.includes('Sakurai');
            
            if (hasJapaneseName && !members.includes(text)) {
              members.push(text);
            }
          }
        });
        
        // Limit to reasonable number of members (units typically have 2-5 members)
        if (members.length > 10) {
          members.splice(5); // Keep only first 5
        }
      }
      
      if (unitName && members.length > 0) {
        console.log(`✅ Found unit: ${unitName} with ${members.length} members: ${members.join(', ')}`);
        return {
          name: unitName,
          url,
          members
        };
      } else {
        console.log(`⚠️ Could not find unit data in page: ${url}`);
        return null;
      }
      
    } catch (error) {
      console.error(`❌ Failed to scrape unit page ${url}:`, error);
      return null;
    }
  }

  parseSongTable($: cheerio.CheerioAPI, $table: cheerio.Cheerio<any>, headers: string[]): ScrapedSong[] {
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
      
      // Parse idols - handle both links and plain text, detect units
      const idols: string[] = [];
      let originalIdolsText = '';
      let unitName: string | undefined;
      let unitUrl: string | undefined;
      
      if (idolsCell) {
        // Get original text for verification
        originalIdolsText = idolsCell.text().trim();
        
        // Check for unit links first
        const links = idolsCell.find('a');
        if (links.length === 1) {
          const singleLink = links.first();
          if (this.isUnitLink(singleLink)) {
            unitName = singleLink.text().trim();
            unitUrl = this.baseUrl + (singleLink.attr('href') || '');
            console.log(`🎭 Detected unit link: ${unitName} -> ${unitUrl}`);
          }
        }
        
        // If not a unit, parse individual idols
        if (!unitName) {
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
      }

      if (name && name.length > 1 && attributeType && (idols.length > 0 || unitName)) {
        const song: ScrapedSong = {
          name,
          attributeType,
          howToObtain: howToObtain || undefined,
          originalIdols: originalIdolsText,
          idols: unitName ? [] : idols, // Empty idols if it's a unit song
          unitName,
          unitUrl,
        };
        
        songs.push(song);
        
        if (unitName) {
          console.log(`  ➤ ${name} (${attributeType}) - Unit: ${unitName}`);
        } else {
          console.log(`  ➤ ${name} (${attributeType}) - ${idols.length} idols`);
        }
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
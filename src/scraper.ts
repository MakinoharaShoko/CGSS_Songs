import * as cheerio from 'cheerio';
import fetch from 'node-fetch';
import { DatabaseService } from './database-service.js';

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
  type?: string;          // Unit type: Cute, Cool, Passion, Mixed
  imageSongs?: string[];  // Array of image songs
  debut?: string;         // Debut information
}

export class CGSSScraper {
  private userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
  private baseUrl = 'https://project-imas.wiki';
  private unitsMap: Map<string, ScrapedUnit> = new Map(); // All units from the page
  private db: DatabaseService = new DatabaseService();
  
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

  // Extract units from the main page Units table
  parseUnitsTable(html: string): ScrapedUnit[] {
    const $ = cheerio.load(html);
    
    // Find the Units table by looking for the specific table structure
    console.log('🔍 Searching for Units table...');
    let foundUnitsTable = false;
    
    $('table').each((tableIndex, table) => {
      const $table = $(table);
      
      // Check if this is the Units table by looking for the header content
      const tableText = $table.text();
      console.log(`🔍 Table ${tableIndex}: ${tableText.substring(0, 100)}...`);
      
      if (tableText.includes('Cinderella Girls Starlight Stage Units') && 
          tableText.includes('Unit Name (Romaji)') &&
          tableText.includes('Members')) {
        
        foundUnitsTable = true;
        console.log('📋 Found Units table, parsing...');
        
        // Parse tbody rows only (skip thead)
        const rows = $table.find('tbody tr');
        console.log(`📋 Found ${rows.length} data rows in Units table`);
        
        $table.find('tbody tr').each((rowIndex, row) => {
          const $row = $(row);
          const cells = $row.find('td');
          
          if (cells.length >= 6) { // Should have 6 columns
            const unitNameRomaji = $(cells[0]).find('a').text().trim() || $(cells[0]).text().trim();
            const unitNameJp = $(cells[1]).text().trim();
            const unitType = $(cells[2]).text().trim();
            const membersCell = $(cells[3]);
            const songsCell = $(cells[4]);
            const debutCell = $(cells[5]);
            
            // Extract members from links in the members cell
            let members: string[] = [];
            
            // Extract member names from links
            membersCell.find('a').each((i, link) => {
              const memberName = $(link).text().trim();
              if (memberName && memberName.length > 1) {
                members.push(memberName);
              }
            });
            
            // If no links found, try parsing text content
            if (members.length === 0) {
              const memberText = membersCell.text().trim();
              if (memberText && memberText.length > 3) {
                // Parse member names from text
                members = memberText
                  .split(/,\s*|\s+and\s+/i) // Split by comma or " and " (case insensitive)
                  .map(name => name.trim())
                  .filter(name => name && name.length > 1 && !name.includes('http') && !name.includes('TBA'));
              }
            }
            
            // Extract image songs
            const imageSongs: string[] = [];
            songsCell.find('a').each((i, link) => {
              const songName = $(link).text().trim();
              if (songName && songName.length > 1 && !songName.includes('http')) {
                imageSongs.push(songName);
              }
            });
            
            const debut = debutCell.text().trim();
            
            if (unitNameRomaji && members.length > 0) {
              const unit: ScrapedUnit = {
                name: unitNameRomaji,
                url: '', // We have all info here, no need for external URL
                members,
                type: unitType || undefined,
                imageSongs: imageSongs.length > 0 ? imageSongs : undefined,
                debut: debut || undefined
              };
              
              // Store unit with exact name as key
              this.unitsMap.set(unitNameRomaji, unit);
              
              // Also store by Japanese name if different
              if (unitNameJp && unitNameJp !== unitNameRomaji) {
                this.unitsMap.set(unitNameJp, unit);
                console.log(`✅ Found unit: ${unitNameRomaji} (also as: ${unitNameJp}) - ${members.length} members: ${members.join(', ')}`);
              } else {
                console.log(`✅ Found unit: ${unitNameRomaji} - ${members.length} members: ${members.join(', ')}`);
              }
            } else {
              console.log(`⚠️ Skipped unit row: ${unitNameRomaji} (${members.length} members)`);
            }
          }
        });
        
        console.log(`📦 Total ${this.unitsMap.size} units found from table`);
        return false; // Break out of each loop
      }
    });
    
    if (!foundUnitsTable) {
      console.log('❌ Units table not found!');
    }
    
    // Return all units found (could be empty if table not found)
    return Array.from(this.unitsMap.values());
  }
  
  findSongTables(html: string): ScrapedSong[] {
    const $ = cheerio.load(html);
    const songs: ScrapedSong[] = [];

    // First, parse the Units table to cache all unit information
    this.parseUnitsTable(html);

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
      
      // Skip the Units table - we already processed it
      if (headerText.includes('cinderella girls starlight stage units')) {
        return;
      }
      
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

    // Statistics
    const totalSongs = songs.length;
    const unitSongs = songs.filter(s => s.unitName).length;
    const resolvedUnitSongs = songs.filter(s => s.unitName && s.idols.length > 0).length;
    const unresolvedUnitSongs = unitSongs - resolvedUnitSongs;
    
    console.log(`\n📊 Parsing Summary:`);
    console.log(`   Total songs: ${totalSongs}`);
    console.log(`   Unit songs: ${unitSongs}`);
    console.log(`   Resolved from cache/title: ${resolvedUnitSongs}`);
    console.log(`   Need external scraping: ${unresolvedUnitSongs}`);
    if (unresolvedUnitSongs > 0) {
      console.log(`   ⚠️  ${unresolvedUnitSongs} unit songs still need external scraping`);
    } else {
      console.log(`   ✅ All unit songs resolved from page content!`);
    }

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
      console.log(`🎭 Fallback: Scraping external unit page: ${url}`);
      const html = await this.fetchPage(url);
      const $ = cheerio.load(html);
      
      // Get unit name from page title
      let unitName = '';
      const titleElement = $('h1').first();
      if (titleElement.length) {
        unitName = titleElement.text().trim();
      } else {
        // Fallback to extracting from URL
        const urlParts = url.split('/');
        unitName = urlParts[urlParts.length - 1].replace(/_/g, ' ');
      }
      
      // Find the Members row in the table and extract member links
      const members: string[] = [];
      
      // Look for table rows with "Members" label
      $('table tr').each((i, row) => {
        const $row = $(row);
        const firstCell = $row.find('td').first();
        
        if (firstCell.text().toLowerCase().includes('members')) {
          // Found the Members row, extract links from the second cell
          const secondCell = $row.find('td').eq(1);
          secondCell.find('a').each((j, link) => {
            const memberName = $(link).text().trim();
            if (memberName && memberName.length > 1) {
              members.push(memberName);
            }
          });
        }
      });
      
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
      let foundUnit: ScrapedUnit | null = null;
      
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
            
            // Look up unit directly from the units table
            foundUnit = this.unitsMap.get(unitName) || null;
            
            // If exact match fails, try fuzzy matching
            if (!foundUnit) {
              for (const [key, unit] of this.unitsMap.entries()) {
                // Try case-insensitive match
                if (key.toLowerCase() === unitName.toLowerCase()) {
                  foundUnit = unit;
                  break;
                }
                // Try partial match (unit name contains or is contained in link text)
                if (key.toLowerCase().includes(unitName.toLowerCase()) || 
                    unitName.toLowerCase().includes(key.toLowerCase())) {
                  foundUnit = unit;
                  break;
                }
              }
            }
            
            if (foundUnit) {
              console.log(`🎭 Found unit: ${unitName} (${foundUnit.members.length} members: ${foundUnit.members.join(', ')})`);
            } else {
              console.log(`🎭 Unit not found in table: ${unitName}`);
            }
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
          idols: unitName ? (foundUnit?.members || []) : idols, // Use cached unit members if available
          unitName,
          unitUrl,
        };
        
        songs.push(song);
        
        if (unitName) {
          if (foundUnit) {
            console.log(`  ➤ ${name} (${attributeType}) - Unit: ${unitName} [${foundUnit.members.length} members - RESOLVED]`);
          } else {
            console.log(`  ➤ ${name} (${attributeType}) - Unit: ${unitName} [NEEDS EXTERNAL SCRAPING]`);
          }
        } else {
          console.log(`  ➤ ${name} (${attributeType}) - ${idols.length} idols`);
        }
      }
    });

    return songs;
  }

  async scrapeUnits(url: string): Promise<ScrapedUnit[]> {
    const html = await this.fetchPage(url);
    const units = this.parseUnitsTable(html);
    
    // Write all units to database
    console.log(`📦 Writing ${units.length} units to database...`);
    for (const unit of units) {
      await this.db.createOrUpdateUnit(unit);
    }
    
    console.log(`✅ All ${units.length} units saved to database!`);
    return units;
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
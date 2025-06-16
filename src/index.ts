import { CGSSScraper, ScrapedSong } from './scraper.js';
import DatabaseService from './database-service.js';

async function processUnitIfNeeded(scraper: CGSSScraper, dbService: DatabaseService, song: ScrapedSong): Promise<void> {
  if (song.unitName && song.unitUrl) {
    const isAlreadyScraped = await dbService.isUnitScraped(song.unitName);
    
    if (!isAlreadyScraped) {
      console.log(`🎭 Unit "${song.unitName}" not found in database, scraping unit page...`);
      const unitData = await scraper.scrapeUnitPage(song.unitUrl);
      
      if (unitData) {
        await dbService.createOrUpdateUnit(unitData);
      } else {
        console.log(`⚠️ Failed to scrape unit data for "${song.unitName}"`);
      }
    }
  }
}

async function main() {
  const scraper = new CGSSScraper();
  const dbService = new DatabaseService();

  try {
    console.log('🚀 Starting CGSS Songs scraper with unit support...');

    // Get database stats before
    const statsBefore = await dbService.getSongStats();
    console.log('📊 Database stats before scraping:');
    console.log(`  Songs: ${statsBefore.totalSongs}`);
    console.log(`  Idols: ${statsBefore.totalIdols}`);
    console.log(`  Units: ${statsBefore.totalUnits}`);

    // Scrape actual wiki page
    const wikiUrl = 'https://project-imas.wiki/THE_iDOLM@STER_CINDERELLA_GIRLS_STARLIGHT_STAGE';
    console.log(`🌐 Scraping CGSS wiki: ${wikiUrl}`);

    const scrapedSongs = await scraper.scrapeSongsWithDetails(wikiUrl, true);
    console.log(`📋 Found ${scrapedSongs.length} songs on the wiki page (with detailed info)`);
    const scrapedUnits = await scraper.scrapeUnits(wikiUrl);
    console.log(`📋 Found ${scrapedUnits.length} units on the wiki page`);
    
    // 🆕 Extract and scrape idol details from the songs (concurrent)
    console.log('\n👥 Starting concurrent idol extraction and detailed scraping...');
    const scrapedIdols = await scraper.scrapeIdolsFromSongs(scrapedSongs, true, 100); // Enable detailed scraping with 100 concurrent
    console.log(`📋 Found ${scrapedIdols.length} idols, processed with detailed info`);

    // Process scraped songs with unit handling
    if (scrapedSongs.length > 0) {
      for (const songData of scrapedSongs) {
        // Process unit first if present (only for units that need external scraping)
        await processUnitIfNeeded(scraper, dbService, songData);
        
        // Songs are already saved to database by scrapeSongsWithDetails
        // No need to call createOrUpdateSong again
      }
    } else {
      console.log('⚠️  No songs found, using fallback test data...');
      
      // Fallback test data if scraping fails - now includes unit data
      const testSongs = [
        {
          name: 'Test Song 1',
          attributeType: 'All Types',
          howToObtain: 'Test data',
          originalIdols: 'Test Idol 1, Test Idol 2',
          idols: ['Test Idol 1', 'Test Idol 2'],
        },
        {
          name: 'Test Unit Song',
          attributeType: 'Cool',
          howToObtain: 'Test unit data',
          originalIdols: 'mirror',
          idols: [],
          unitName: 'mirror',
          unitUrl: 'https://project-imas.wiki/mirror',
        }
      ];

      for (const songData of testSongs) {
        await processUnitIfNeeded(scraper, dbService, songData);
        await dbService.createOrUpdateSong(songData);
      }
    }

    // Get final stats
    const statsAfter = await dbService.getSongStats();
    console.log('\n📊 Database stats after processing:');
    console.log(`  Songs: ${statsAfter.totalSongs}`);
    console.log(`  Idols: ${statsAfter.totalIdols}`);
    console.log(`  Units: ${statsAfter.totalUnits}`);
    
    console.log('\n🎵 Songs by attribute:');
    Object.entries(statsAfter.songsByAttribute).forEach(([attr, count]) => {
      console.log(`  ${attr}: ${count}`);
    });
    
    console.log('\n⭐ Most popular idols:');
    statsAfter.popularIdols.forEach((idol, index) => {
      console.log(`  ${index + 1}. ${idol.name} (${idol.songCount} songs)`);
    });

    console.log('\n🎭 Most popular units:');
    statsAfter.popularUnits.forEach((unit, index) => {
      console.log(`  ${index + 1}. ${unit.name} (${unit.songCount} songs, ${unit.memberCount} members)`);
    });

    console.log('\n✅ Data processing complete with unit support!');
    console.log('\n💡 Next steps:');
    console.log('  1. The scraper now automatically detects and processes units');
    console.log('  2. Unit pages are scraped for member information');
    console.log('  3. Run: npm run db:studio to explore the database');

  } catch (error) {
    console.error('💥 Error in main function:', error);
  } finally {
    await dbService.close();
  }
}

// Run the main function
main().catch((error) => {
  console.error('💥 Unhandled error:', error);
  process.exit(1);
}); 
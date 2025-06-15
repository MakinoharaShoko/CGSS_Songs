import { CGSSScraper } from './scraper.js';
import DatabaseService from './database-service.js';

async function main() {
  const scraper = new CGSSScraper();
  const dbService = new DatabaseService();

  try {
    console.log('🚀 Starting CGSS Songs scraper...');

    // Get database stats before
    const statsBefore = await dbService.getSongStats();
    console.log('📊 Database stats before scraping:');
    console.log(`  Songs: ${statsBefore.totalSongs}`);
    console.log(`  Idols: ${statsBefore.totalIdols}`);

    // Scrape actual wiki page
    const wikiUrl = 'https://project-imas.wiki/THE_iDOLM@STER_CINDERELLA_GIRLS_STARLIGHT_STAGE';
    console.log(`🌐 Scraping CGSS wiki: ${wikiUrl}`);

    const scrapedSongs = await scraper.scrapeSongs(wikiUrl);
    console.log(`📋 Found ${scrapedSongs.length} songs on the wiki page`);

    // Process scraped songs
    if (scrapedSongs.length > 0) {
      for (const songData of scrapedSongs) {
        await dbService.createOrUpdateSong(songData);
      }
    } else {
      console.log('⚠️  No songs found, using fallback test data...');
      
      // Fallback test data if scraping fails
      const testSongs = [
        {
          name: 'Test Song 1',
          attributeType: 'All Types',
          howToObtain: 'Test data',
          idols: ['Test Idol 1', 'Test Idol 2'],
        },
      ];

      for (const songData of testSongs) {
        await dbService.createOrUpdateSong(songData);
      }
    }

    // Get final stats
    const statsAfter = await dbService.getSongStats();
    console.log('\n📊 Database stats after processing:');
    console.log(`  Songs: ${statsAfter.totalSongs}`);
    console.log(`  Idols: ${statsAfter.totalIdols}`);
    
    console.log('\n🎵 Songs by attribute:');
    Object.entries(statsAfter.songsByAttribute).forEach(([attr, count]) => {
      console.log(`  ${attr}: ${count}`);
    });
    
    console.log('\n⭐ Most popular idols:');
    statsAfter.popularIdols.forEach((idol, index) => {
      console.log(`  ${index + 1}. ${idol.name} (${idol.songCount} songs)`);
    });

    console.log('\n✅ Sample data processing complete!');
    console.log('\n💡 Next steps:');
    console.log('  1. Find the actual CGSS wiki/database URL');
    console.log('  2. Update scraper selectors to match the HTML structure');
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
import { CGSSScraper } from './src/scraper.js';
import DatabaseService from './src/database-service.js';

async function testSongDetails() {
  const scraper = new CGSSScraper();
  const dbService = new DatabaseService();

  try {
    console.log('🧪 Testing song details scraping with first 5 songs...');

    // Get basic songs first
    const wikiUrl = 'https://project-imas.wiki/THE_iDOLM@STER_CINDERELLA_GIRLS_STARLIGHT_STAGE';
    const basicSongs = await scraper.scrapeSongs(wikiUrl);
    
    // Take only first 5 songs with URLs
    const testSongs = basicSongs.filter(song => song.songUrl).slice(0, 5);
    console.log(`🎯 Testing with ${testSongs.length} songs:\n`);
    
    for (let i = 0; i < testSongs.length; i++) {
      const song = testSongs[i];
      console.log(`\n🎵 [${i + 1}/${testSongs.length}] Processing: ${song.name}`);
      console.log(`🔗 URL: ${song.songUrl}`);
      
      try {
        // Scrape details
        const details = await scraper.scrapeSongDetails(song.songUrl);
        
        // Merge details
        const detailedSong = { ...song, ...details };
        
        // Save to database
        await dbService.createOrUpdateSong(detailedSong);
        
        // Add small delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Error processing ${song.name}:`, error);
      }
    }
    
    console.log('\n📊 Testing complete! Checking database...');
    
    // Query database to verify data was saved
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    const savedSongs = await prisma.song.findMany({
      where: {
        OR: testSongs.map(s => ({ name: s.name }))
      },
      select: {
        name: true,
        originalTitle: true,
        romanizedTitle: true,
        composer: true,
        lyricist: true,
        bpm: true,
        starlightStageType: true
      }
    });
    
    console.log('\n✅ Saved songs in database:');
    savedSongs.forEach(song => {
      console.log(`\n📀 ${song.name}`);
      if (song.originalTitle) console.log(`   Original: ${song.originalTitle}`);
      if (song.romanizedTitle) console.log(`   Romanized: ${song.romanizedTitle}`);
      if (song.composer) console.log(`   Composer: ${song.composer}`);
      if (song.lyricist) console.log(`   Lyricist: ${song.lyricist}`);
      if (song.bpm) console.log(`   BPM: ${song.bpm}`);
      if (song.starlightStageType) console.log(`   Type: ${song.starlightStageType}`);
    });
    
    await prisma.$disconnect();
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testSongDetails(); 
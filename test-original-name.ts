import { CGSSScraper } from './src/scraper.js';

async function testOriginalNameFeature() {
  const scraper = new CGSSScraper();

  try {
    console.log('🧪 Testing original name feature...');

    // Test scraping Riina Tada's details
    console.log('\n👤 Testing: Riina Tada');
    const riina = await scraper.scrapeIdolFromUrl('Riina Tada');
    
    if (riina) {
      console.log('✅ Successfully scraped:');
      console.log(`   English Name (name): ${riina.name}`);
      console.log(`   Japanese Name (originalName): ${riina.originalName || 'N/A'}`);
      console.log(`   Voice Actor: ${riina.voiceActor || 'N/A'}`);
      console.log(`   Age: ${riina.age || 'N/A'}`);
      console.log(`   Card Type: ${riina.cardType || 'N/A'}`);
      
      // Save to database to test the schema
      await scraper.db.createOrUpdateIdol(riina);
      console.log('💾 Successfully saved to database!');
      
      // Verify the distinction between name fields
      if (riina.originalName && riina.originalName !== riina.name) {
        console.log('✅ Original name feature working correctly!');
        console.log(`   📝 English: "${riina.name}" vs Japanese: "${riina.originalName}"`);
      } else {
        console.log('⚠️  Original name not found or same as English name');
      }
      
    } else {
      console.log('❌ Failed to scrape Riina Tada');
    }

    console.log('\n📊 Testing complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testOriginalNameFeature(); 
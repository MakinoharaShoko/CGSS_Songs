import { PrismaClient } from '@prisma/client';
import { CGSSScraper, ScrapedIdol } from './scraper.js';
import { DatabaseService } from './database-service.js';

const prisma = new PrismaClient();

interface IdolUpdateStats {
  total: number;
  alreadyComplete: number;
  needsUpdate: number;
  successful: number;
  failed: number;
  skipped: number;
}

async function updateIdolDetails(concurrency: number = 5) {
  const scraper = new CGSSScraper();
  const dbService = new DatabaseService();
  
  const stats: IdolUpdateStats = {
    total: 0,
    alreadyComplete: 0,
    needsUpdate: 0,
    successful: 0,
    failed: 0,
    skipped: 0
  };

  try {
    console.log('🔍 Fetching all idols from database...');
    
    // Get all idols from database
    const allIdols = await prisma.idol.findMany({
      orderBy: { name: 'asc' }
    });
    
    stats.total = allIdols.length;
    console.log(`📊 Found ${stats.total} idols in database`);
    
    if (stats.total === 0) {
      console.log('❌ No idols found in database. Run the main scraper first!');
      return;
    }
    
    // Filter idols that need updates (missing key details)
    const idolsNeedingUpdate = allIdols.filter(idol => 
      !idol.voiceActor || !idol.age || !idol.cardType
    );
    
    stats.alreadyComplete = stats.total - idolsNeedingUpdate.length;
    stats.needsUpdate = idolsNeedingUpdate.length;
    
    console.log(`📈 Analysis:`);
    console.log(`   Already have details: ${stats.alreadyComplete}`);
    console.log(`   Need updates: ${stats.needsUpdate}`);
    
    if (stats.needsUpdate === 0) {
      console.log('✅ All idols already have complete information!');
      return;
    }
    
    console.log(`\n🚀 Starting concurrent detail updates for ${stats.needsUpdate} idols (${concurrency} concurrent)...`);
    const estimatedTime = Math.ceil(stats.needsUpdate / concurrency * 1.5 / 60);
    console.log(`⏱️  This will take approximately ${estimatedTime} minutes (vs ${Math.ceil(stats.needsUpdate * 2.5 / 60)} minutes sequential)\n`);
    
    // Use the scraper's concurrent processing function
    const results = await scraper.processConcurrently(
      idolsNeedingUpdate,
      async (idol: any, index: number) => {
        console.log(`👤 [${index + 1}/${stats.needsUpdate}] Processing: ${idol.name}`);
        console.log(`   Current status: VA=${idol.voiceActor ? '✓' : '✗'}, Age=${idol.age ? '✓' : '✗'}, Type=${idol.cardType ? '✓' : '✗'}`);
        
        try {
          // Scrape detailed information
          const detailedInfo = await scraper.scrapeIdolFromUrl(idol.name);
          
          if (detailedInfo && hasNewInformation(idol, detailedInfo)) {
            // Update database with new information
            await dbService.createOrUpdateIdol(detailedInfo);
            
            // Show what was updated
            const updates = [];
            if (!idol.originalName && detailedInfo.originalName) updates.push(`Original: ${detailedInfo.originalName}`);
            if (!idol.voiceActor && detailedInfo.voiceActor) updates.push(`VA: ${detailedInfo.voiceActor}`);
            if (!idol.age && detailedInfo.age) updates.push(`Age: ${detailedInfo.age}`);
            if (!idol.cardType && detailedInfo.cardType) updates.push(`Type: ${detailedInfo.cardType}`);
            if (!idol.hometown && detailedInfo.hometown) updates.push(`From: ${detailedInfo.hometown}`);
            if (!idol.hobbies && detailedInfo.hobbies) updates.push(`Hobbies: ${detailedInfo.hobbies}`);
            
            if (updates.length > 0) {
              console.log(`   ✅ ${idol.name}: ${updates.join(', ')}`);
            } else {
              console.log(`   ℹ️  ${idol.name}: No new information found, but record refreshed`);
            }
            
            return { status: 'success', idol, updates };
            
          } else {
            console.log(`   ⚠️  ${idol.name}: No new information available`);
            return { status: 'skipped', idol };
          }
          
        } catch (error) {
          console.error(`   ❌ ${idol.name}: Failed to update - ${error}`);
          return { status: 'failed', idol, error };
        }
      },
      concurrency,
      1000 // 1 second delay between batches
    );
    
    // Process results and update stats
    results.forEach(result => {
      if (result) {
        switch (result.status) {
          case 'success':
            stats.successful++;
            break;
          case 'skipped':
            stats.skipped++;
            break;
          case 'failed':
            stats.failed++;
            break;
        }
      }
    });
    
    // Final statistics
    console.log(`\n📊 Update Summary:`);
    console.log(`   Total idols: ${stats.total}`);
    console.log(`   Already complete: ${stats.alreadyComplete}`);
    console.log(`   Attempted updates: ${stats.needsUpdate}`);
    console.log(`   ✅ Successful: ${stats.successful}`);
    console.log(`   ⚠️  Skipped (no new info): ${stats.skipped}`);
    console.log(`   ❌ Failed: ${stats.failed}`);
    
    const successRate = Math.round((stats.successful / stats.needsUpdate) * 100);
    console.log(`   📈 Success rate: ${successRate}%`);
    
    if (stats.successful > 0) {
      console.log(`\n🎉 Successfully enhanced ${stats.successful} idol profiles with ${concurrency}x concurrency!`);
    }
    
    // Show final database stats
    console.log('\n📈 Final Database Status:');
    const finalIdols = await prisma.idol.findMany({
      select: {
        originalName: true,
        voiceActor: true,
        age: true,
        cardType: true,
        hometown: true,
        hobbies: true
      }
    });
    
    const withOriginalName = finalIdols.filter(i => i.originalName).length;
    const withVA = finalIdols.filter(i => i.voiceActor).length;
    const withAge = finalIdols.filter(i => i.age).length;
    const withType = finalIdols.filter(i => i.cardType).length;
    const withHometown = finalIdols.filter(i => i.hometown).length;
    const withHobbies = finalIdols.filter(i => i.hobbies).length;
    
    console.log(`   Original Names: ${withOriginalName}/${stats.total} (${Math.round(withOriginalName/stats.total*100)}%)`);
    console.log(`   Voice Actors: ${withVA}/${stats.total} (${Math.round(withVA/stats.total*100)}%)`);
    console.log(`   Ages: ${withAge}/${stats.total} (${Math.round(withAge/stats.total*100)}%)`);
    console.log(`   Card Types: ${withType}/${stats.total} (${Math.round(withType/stats.total*100)}%)`);
    console.log(`   Hometowns: ${withHometown}/${stats.total} (${Math.round(withHometown/stats.total*100)}%)`);
    console.log(`   Hobbies: ${withHobbies}/${stats.total} (${Math.round(withHobbies/stats.total*100)}%)`);
    
  } catch (error) {
    console.error('❌ Script failed:', error);
  } finally {
    await prisma.$disconnect();
    console.log('\n👋 Database connection closed. Update complete!');
  }
}

// Helper function to check if scraped info contains new data
function hasNewInformation(existingIdol: any, scrapedIdol: ScrapedIdol): boolean {
  // Check if any important field would be newly populated
  const newOriginalName = !existingIdol.originalName && !!scrapedIdol.originalName;
  const newVA = !existingIdol.voiceActor && !!scrapedIdol.voiceActor;
  const newAge = !existingIdol.age && !!scrapedIdol.age;
  const newType = !existingIdol.cardType && !!scrapedIdol.cardType;
  const newHometown = !existingIdol.hometown && !!scrapedIdol.hometown;
  const newHobbies = !existingIdol.hobbies && !!scrapedIdol.hobbies;
  const newHeight = !existingIdol.height && !!scrapedIdol.height;
  const newBirthday = !existingIdol.birthday && !!scrapedIdol.birthday;
  
  return newOriginalName || newVA || newAge || newType || newHometown || newHobbies || newHeight || newBirthday;
}

// Allow running directly or importing
// Check if this file is being run directly
const isMain = process.argv[1]?.includes('update-idol-details');
if (isMain) {
  updateIdolDetails();
}

export { updateIdolDetails }; 
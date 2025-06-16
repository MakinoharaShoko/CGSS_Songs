import { CGSSScraper } from './src/scraper.js';

async function testConcurrentFeatures() {
  const scraper = new CGSSScraper();

  try {
    console.log('🧪 Testing concurrent processing features...');

    // Test 1: Small batch of idols with different concurrency levels
    console.log('\n📊 Test 1: Comparing sequential vs concurrent performance');
    
    const testIdols = ['Riina Tada', 'Miku Maekawa', 'Anzu Futaba'];
    
    console.log('\n⏰ Sequential processing (concurrency = 1):');
    const startSeq = Date.now();
    const sequentialResults = await scraper.processConcurrently(
      testIdols,
      async (idolName: string, index: number) => {
        console.log(`  Processing ${idolName}...`);
        const result = await scraper.scrapeIdolFromUrl(idolName);
        return result;
      },
      1, // Sequential
      500 // 500ms delay
    );
    const seqTime = Date.now() - startSeq;
    
    console.log(`\n⚡ Concurrent processing (concurrency = 3):`);
    const startConc = Date.now();
    const concurrentResults = await scraper.processConcurrently(
      testIdols,
      async (idolName: string, index: number) => {
        console.log(`  Processing ${idolName}...`);
        const result = await scraper.scrapeIdolFromUrl(idolName);
        return result;
      },
      3, // All at once
      500 // 500ms delay
    );
    const concTime = Date.now() - startConc;
    
    console.log('\n📈 Performance Comparison:');
    console.log(`  Sequential time: ${seqTime}ms`);
    console.log(`  Concurrent time: ${concTime}ms`);
    console.log(`  Speed improvement: ${(seqTime / concTime).toFixed(2)}x faster`);
    console.log(`  Sequential results: ${sequentialResults.filter(r => r).length}/${testIdols.length} successful`);
    console.log(`  Concurrent results: ${concurrentResults.filter(r => r).length}/${testIdols.length} successful`);
    
    // Test 2: Demonstrate batch processing
    console.log('\n📦 Test 2: Batch processing demonstration');
    const manyItems = Array.from({ length: 12 }, (_, i) => `Item ${i + 1}`);
    
    console.log(`Processing ${manyItems.length} items with concurrency = 3`);
    await scraper.processConcurrently(
      manyItems,
      async (item: string, index: number) => {
        console.log(`  ⚡ Processing ${item} (${index + 1}/${manyItems.length})`);
        await new Promise(resolve => setTimeout(resolve, 200)); // Simulate work
        return item;
      },
      3,
      300
    );
    
    console.log('\n✅ Concurrent processing tests completed!');
    
    // Test 3: Concurrent error handling
    console.log('\n🔥 Test 3: Error handling in concurrent processing');
    const mixedItems = ['Success1', 'Error', 'Success2', 'Error2', 'Success3'];
    
    const errorResults = await scraper.processConcurrently(
      mixedItems,
      async (item: string, index: number) => {
        if (item.includes('Error')) {
          throw new Error(`Simulated error for ${item}`);
        }
        return `Processed ${item}`;
      },
      2,
      200
    );
    
    const successCount = errorResults.filter(r => r).length;
    console.log(`📊 Error handling test: ${successCount}/${mixedItems.length} successful (errors handled gracefully)`);
    
    console.log('\n🎉 All concurrent tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testConcurrentFeatures(); 
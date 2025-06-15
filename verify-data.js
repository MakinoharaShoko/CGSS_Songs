const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  // 查找包含多个偶像的歌曲
  const songsWithMultipleIdols = await prisma.song.findMany({
    where: {
      songIdols: {
        some: {}
      }
    },
    include: {
      songIdols: {
        include: {
          idol: true
        }
      }
    },
    orderBy: {
      songIdols: {
        _count: 'desc'
      }
    },
    take: 15
  });

  console.log('=== Songs with multiple idols (checking "and" split functionality) ===');
  songsWithMultipleIdols.forEach(song => {
    if (song.songIdols.length > 1) {
      console.log(`Song: ${song.name}`);
      console.log(`Original Idols: ${song.originalIdols}`);
      console.log(`Parsed Idols (${song.songIdols.length}): ${song.songIdols.map(si => si.idol.name).join(', ')}`);
      console.log('---');
    }
  });

  // 查找原始字符串中包含"and"的歌曲
  const songsWithAnd = await prisma.song.findMany({
    where: {
      originalIdols: {
        contains: ' and '
      }
    },
    include: {
      songIdols: {
        include: {
          idol: true
        }
      }
    },
    take: 10
  });

  console.log('\n=== Songs with "and" in original idols field ===');
  songsWithAnd.forEach(song => {
    console.log(`Song: ${song.name}`);
    console.log(`Original Idols: ${song.originalIdols}`);
    console.log(`Parsed Idols (${song.songIdols.length}): ${song.songIdols.map(si => si.idol.name).join(', ')}`);
    console.log('---');
  });

  await prisma.$disconnect();
}

checkData().catch(console.error); 
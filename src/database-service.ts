import { PrismaClient } from '@prisma/client';
import { ScrapedSong, ScrapedIdol } from './scraper.js';

const prisma = new PrismaClient();

export class DatabaseService {
  async createOrUpdateSong(songData: ScrapedSong): Promise<void> {
    try {
      // Create or update the song
      const song = await prisma.song.upsert({
        where: { name: songData.name },
        update: {
          attributeType: songData.attributeType,
          originalIdols: songData.originalIdols,
          howToObtain: songData.howToObtain,
        },
        create: {
          name: songData.name,
          attributeType: songData.attributeType,
          originalIdols: songData.originalIdols,
          howToObtain: songData.howToObtain,
        },
      });

      // Handle idols
      for (const idolName of songData.idols) {
        await this.addSongIdol(song.id, idolName);
      }

      console.log(`✅ Processed song: ${song.name} (${songData.idols.length} idols)`);
    } catch (error) {
      console.error(`❌ Failed to process song ${songData.name}:`, error);
      throw error;
    }
  }

  async addSongIdol(songId: number, idolName: string): Promise<void> {
    // Find or create the idol
    let idol = await prisma.idol.findUnique({
      where: { name: idolName }
    });

    if (!idol) {
      idol = await prisma.idol.create({
        data: { name: idolName },
      });
    }

    // Check if relationship already exists
    const existingRelation = await prisma.songIdol.findFirst({
      where: {
        songId: songId,
        idolId: idol.id,
      }
    });

    if (!existingRelation) {
      await prisma.songIdol.create({
        data: {
          songId: songId,
          idolId: idol.id,
        },
      });
    }
  }

  async createOrUpdateIdol(idolData: ScrapedIdol): Promise<void> {
    try {
      await prisma.idol.upsert({
        where: { name: idolData.name },
        update: {},
        create: {
          name: idolData.name,
        },
      });

      console.log(`✅ Processed idol: ${idolData.name}`);
    } catch (error) {
      console.error(`❌ Failed to process idol ${idolData.name}:`, error);
      throw error;
    }
  }

  async getSongStats(): Promise<{
    totalSongs: number;
    totalIdols: number;
    songsByAttribute: Record<string, number>;
    popularIdols: Array<{ name: string; songCount: number }>;
  }> {
    const [totalSongs, totalIdols, songs, idolSongCounts] = await Promise.all([
      prisma.song.count(),
      prisma.idol.count(),
      prisma.song.findMany({
        select: { attributeType: true }
      }),
      prisma.idol.findMany({
        select: {
          name: true,
          _count: {
            select: { songIdols: true }
          }
        },
        orderBy: {
          songIdols: {
            _count: 'desc'
          }
        },
        take: 10
      })
    ]);

    const songsByAttribute: Record<string, number> = {};
    songs.forEach(song => {
      songsByAttribute[song.attributeType] = (songsByAttribute[song.attributeType] || 0) + 1;
    });

    const popularIdols = idolSongCounts.map(idol => ({
      name: idol.name,
      songCount: idol._count.songIdols
    }));

    return {
      totalSongs,
      totalIdols,
      songsByAttribute,
      popularIdols,
    };
  }

  async close(): Promise<void> {
    await prisma.$disconnect();
  }
}

export default DatabaseService; 
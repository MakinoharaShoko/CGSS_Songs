import { PrismaClient } from '@prisma/client';
import { ScrapedSong, ScrapedIdol, ScrapedUnit } from './scraper.js';

const prisma = new PrismaClient();

export class DatabaseService {
  async createOrUpdateSong(songData: ScrapedSong): Promise<void> {
    try {
      let unitId: number | null = null;
      
      // Handle unit if present
      if (songData.unitName && songData.unitUrl) {
        unitId = await this.ensureUnit(songData.unitName, songData.unitUrl);
      }
      
      // Create or update the song
      const song = await prisma.song.upsert({
        where: { name: songData.name },
        update: {
          attributeType: songData.attributeType,
          originalIdols: songData.originalIdols,
          howToObtain: songData.howToObtain,
          unitId: unitId,
          
          // Extended fields from song detail pages
          songUrl: songData.songUrl,
          originalTitle: songData.originalTitle,
          romanizedTitle: songData.romanizedTitle,
          translatedTitle: songData.translatedTitle,
          composer: songData.composer,
          lyricist: songData.lyricist,
          arranger: songData.arranger,
          remix: songData.remix,
          bpm: songData.bpm,
          starlightStageType: songData.starlightStageType,
        },
        create: {
          name: songData.name,
          attributeType: songData.attributeType,
          originalIdols: songData.originalIdols,
          howToObtain: songData.howToObtain,
          unitId: unitId,
          
          // Extended fields from song detail pages
          songUrl: songData.songUrl,
          originalTitle: songData.originalTitle,
          romanizedTitle: songData.romanizedTitle,
          translatedTitle: songData.translatedTitle,
          composer: songData.composer,
          lyricist: songData.lyricist,
          arranger: songData.arranger,
          remix: songData.remix,
          bpm: songData.bpm,
          starlightStageType: songData.starlightStageType,
        },
      });

      // Handle individual idols (for non-unit songs)
      if (!songData.unitName) {
        for (const idolName of songData.idols) {
          await this.addSongIdol(song.id, idolName);
        }
      }

      // Log detailed information about what was saved
      const detailsLogged = [];
      if (songData.originalTitle) detailsLogged.push(`Original: "${songData.originalTitle}"`);
      if (songData.romanizedTitle) detailsLogged.push(`Romanized: "${songData.romanizedTitle}"`);
      if (songData.translatedTitle) detailsLogged.push(`Translated: "${songData.translatedTitle}"`);
      if (songData.composer) detailsLogged.push(`Composer: "${songData.composer}"`);
      if (songData.lyricist) detailsLogged.push(`Lyricist: "${songData.lyricist}"`);
      if (songData.arranger) detailsLogged.push(`Arranger: "${songData.arranger}"`);
      if (songData.bpm) detailsLogged.push(`BPM: ${songData.bpm}`);
      if (songData.starlightStageType) detailsLogged.push(`Type: "${songData.starlightStageType}"`);
      if (songData.remix) detailsLogged.push(`Remix: "${songData.remix}"`);

      const baseInfo = `${song.name} (${songData.attributeType}) - ${songData.unitName ? `Unit: ${songData.unitName}` : `${songData.idols.length} idols`}`;
      
      if (detailsLogged.length > 0) {
        console.log(`✅ Saved with details: ${baseInfo}`);
        console.log(`   📝 Details: ${detailsLogged.join(', ')}`);
      } else {
        console.log(`✅ Saved basic info: ${baseInfo}`);
      }
    } catch (error) {
      console.error(`❌ Failed to process song ${songData.name}:`, error);
      throw error;
    }
  }

  async ensureUnit(unitName: string, unitUrl: string): Promise<number> {
    // Check if unit already exists
    let unit = await prisma.unit.findUnique({
      where: { name: unitName }
    });

    if (!unit) {
      // Create new unit
      unit = await prisma.unit.create({
        data: {
          name: unitName,
          url: unitUrl,
        },
      });
      console.log(`🎭 Created new unit: ${unitName}`);
    }

    return unit.id;
  }

  async createOrUpdateUnit(unitData: ScrapedUnit): Promise<void> {
    try {
      // Create or update the unit
      const unit = await prisma.unit.upsert({
        where: { name: unitData.name },
        update: {
          url: unitData.url,
        },
        create: {
          name: unitData.name,
          url: unitData.url,
        },
      });

      // Clear existing members first
      await prisma.unitMember.deleteMany({
        where: { unitId: unit.id }
      });

      // Add current members
      for (const memberName of unitData.members) {
        await this.addUnitMember(unit.id, memberName);
      }

      console.log(`✅ Processed unit: ${unit.name} (${unitData.members.length} members)`);
    } catch (error) {
      console.error(`❌ Failed to process unit ${unitData.name}:`, error);
      throw error;
    }
  }

  async addUnitMember(unitId: number, idolName: string): Promise<void> {
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
    const existingRelation = await prisma.unitMember.findFirst({
      where: {
        unitId: unitId,
        idolId: idol.id,
      }
    });

    if (!existingRelation) {
      await prisma.unitMember.create({
        data: {
          unitId: unitId,
          idolId: idol.id,
        },
      });
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
      const idol = await prisma.idol.upsert({
        where: { name: idolData.name },
        update: {
          originalName: idolData.originalName,
          voiceActor: idolData.voiceActor,
          age: idolData.age,
          height: idolData.height,
          weight: idolData.weight,
          birthday: idolData.birthday,
          bloodType: idolData.bloodType,
          threeSizes: idolData.threeSizes,
          handedness: idolData.handedness,
          hobbies: idolData.hobbies,
          horoscope: idolData.horoscope,
          hometown: idolData.hometown,
          cardType: idolData.cardType,
          imageColor: idolData.imageColor,
          idolUrl: idolData.idolUrl,
        },
        create: {
          name: idolData.name,
          originalName: idolData.originalName,
          voiceActor: idolData.voiceActor,
          age: idolData.age,
          height: idolData.height,
          weight: idolData.weight,
          birthday: idolData.birthday,
          bloodType: idolData.bloodType,
          threeSizes: idolData.threeSizes,
          handedness: idolData.handedness,
          hobbies: idolData.hobbies,
          horoscope: idolData.horoscope,
          hometown: idolData.hometown,
          cardType: idolData.cardType,
          imageColor: idolData.imageColor,
          idolUrl: idolData.idolUrl,
        },
      });

      // Log detailed information about what was saved
      const detailsLogged = [];
      if (idolData.originalName) detailsLogged.push(`Original: ${idolData.originalName}`);
      if (idolData.voiceActor) detailsLogged.push(`VA: ${idolData.voiceActor}`);
      if (idolData.age) detailsLogged.push(`Age: ${idolData.age}`);
      if (idolData.cardType) detailsLogged.push(`Type: ${idolData.cardType}`);
      if (idolData.hometown) detailsLogged.push(`From: ${idolData.hometown}`);
      if (idolData.hobbies) detailsLogged.push(`Hobbies: ${idolData.hobbies}`);

      if (detailsLogged.length > 0) {
        console.log(`✅ Saved idol with details: ${idolData.name}`);
        console.log(`   📝 Details: ${detailsLogged.join(', ')}`);
      } else {
        console.log(`✅ Saved basic idol: ${idolData.name}`);
      }
    } catch (error) {
      console.error(`❌ Failed to process idol ${idolData.name}:`, error);
      throw error;
    }
  }

  async getUnitByName(name: string): Promise<{ id: number; url: string } | null> {
    const unit = await prisma.unit.findUnique({
      where: { name },
      select: { id: true, url: true }
    });
    
    if (!unit || !unit.url) {
      return null;
    }
    
    return {
      id: unit.id,
      url: unit.url
    };
  }

  async isUnitScraped(name: string): Promise<boolean> {
    const unit = await prisma.unit.findUnique({
      where: { name },
      include: {
        unitMembers: true
      }
    });
    
    return unit !== null && unit.unitMembers.length > 0;
  }

  async getSongStats(): Promise<{
    totalSongs: number;
    totalIdols: number;
    totalUnits: number;
    songsByAttribute: Record<string, number>;
    popularIdols: Array<{ name: string; songCount: number }>;
    popularUnits: Array<{ name: string; songCount: number; memberCount: number }>;
  }> {
    const [totalSongs, totalIdols, totalUnits, songs, idolSongCounts, unitSongCounts] = await Promise.all([
      prisma.song.count(),
      prisma.idol.count(),
      prisma.unit.count(),
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
      }),
      prisma.unit.findMany({
        select: {
          name: true,
          _count: {
            select: { 
              songs: true,
              unitMembers: true
            }
          }
        },
        orderBy: {
          songs: {
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

    const popularUnits = unitSongCounts.map(unit => ({
      name: unit.name,
      songCount: unit._count.songs,
      memberCount: unit._count.unitMembers
    }));

    return {
      totalSongs,
      totalIdols,
      totalUnits,
      songsByAttribute,
      popularIdols,
      popularUnits,
    };
  }

  async close(): Promise<void> {
    await prisma.$disconnect();
  }
}

export default DatabaseService; 
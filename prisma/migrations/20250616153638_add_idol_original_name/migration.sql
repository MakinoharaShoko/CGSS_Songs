-- AlterTable
ALTER TABLE "idols" ADD COLUMN "age" INTEGER;
ALTER TABLE "idols" ADD COLUMN "birthday" TEXT;
ALTER TABLE "idols" ADD COLUMN "bloodType" TEXT;
ALTER TABLE "idols" ADD COLUMN "cardType" TEXT;
ALTER TABLE "idols" ADD COLUMN "handedness" TEXT;
ALTER TABLE "idols" ADD COLUMN "height" TEXT;
ALTER TABLE "idols" ADD COLUMN "hobbies" TEXT;
ALTER TABLE "idols" ADD COLUMN "hometown" TEXT;
ALTER TABLE "idols" ADD COLUMN "horoscope" TEXT;
ALTER TABLE "idols" ADD COLUMN "idolUrl" TEXT;
ALTER TABLE "idols" ADD COLUMN "imageColor" TEXT;
ALTER TABLE "idols" ADD COLUMN "originalName" TEXT;
ALTER TABLE "idols" ADD COLUMN "threeSizes" TEXT;
ALTER TABLE "idols" ADD COLUMN "voiceActor" TEXT;
ALTER TABLE "idols" ADD COLUMN "weight" TEXT;

-- AlterTable
ALTER TABLE "songs" ADD COLUMN "arranger" TEXT;
ALTER TABLE "songs" ADD COLUMN "bpm" INTEGER;
ALTER TABLE "songs" ADD COLUMN "composer" TEXT;
ALTER TABLE "songs" ADD COLUMN "lyricist" TEXT;
ALTER TABLE "songs" ADD COLUMN "originalTitle" TEXT;
ALTER TABLE "songs" ADD COLUMN "remix" TEXT;
ALTER TABLE "songs" ADD COLUMN "romanizedTitle" TEXT;
ALTER TABLE "songs" ADD COLUMN "songUrl" TEXT;
ALTER TABLE "songs" ADD COLUMN "starlightStageType" TEXT;
ALTER TABLE "songs" ADD COLUMN "translatedTitle" TEXT;

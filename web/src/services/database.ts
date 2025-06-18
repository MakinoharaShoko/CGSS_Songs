import { createDbWorker } from 'sql.js-httpvfs'

const workerUrl = '/sqlite.worker.js'
const wasmUrl = '/sql-wasm.wasm'

const dbConfig = {
  from: 'inline' as const,
  config: {
    serverMode: 'full' as const,
    url: '/prisma/dev.db',
    requestChunkSize: 4096,
  },
}

let worker: any = null

export const initDatabase = async () => {
  if (!worker) {
    worker = await createDbWorker(
      [dbConfig],
      workerUrl.toString(),
      wasmUrl.toString()
    )
  }
  return worker
}

export const getAllIdols = async () => {
  const db = await initDatabase()
  const result = await db.db.query(`
    SELECT id, name, originalName
    FROM idols
    WHERE name IS NOT NULL 
      AND name != ''
      AND name NOT LIKE '%DJ%'
      AND name NOT LIKE '%IDOLM@STER%'
      AND name NOT LIKE '%Mixed by%'
    ORDER BY name
  `)
  console.log(result)
  return result.map((row: any) => ({
    id: row.id,
    name: row.name,
    originalName: row.originalName,
  }))
}

export const getSongPredictions = async (idolNames: string[], excludeTanaka: boolean = false) => {
  const db = await initDatabase()
  
  // Convert idol names array to SQL string
  const idolNamesStr = idolNames.map(name => `'${name}'`).join(', ')
  
  // Add Tanaka exclusion if needed
  const tanakaFilter = excludeTanaka ? `
    -- 排除作曲中包含 "Hidekazu Tanaka" 的歌曲
    AND COALESCE(s.composer, '') NOT LIKE '%Hidekazu Tanaka%'
    -- 排除作词中包含 "Hidekazu Tanaka" 的歌曲
    AND COALESCE(s.lyricist, '') NOT LIKE '%Hidekazu Tanaka%'
  ` : ""
  
  const query = `
-- 最终版查询：用于分析歌曲可演唱性，已完美处理组合关系
WITH InputIdols AS (
    -- 步骤 1: 定义我们关心的偶像列表
    SELECT id
    FROM idols
    WHERE name IN (${idolNamesStr})
),
     AllSongPerformers AS (
         -- 步骤 2: 构建权威的演唱者列表 (已正确区分组合曲与非组合曲)
         -- 来源 1: 组合曲
         SELECT
             s.id AS songId, um.idolId, i.originalName
         FROM songs AS s
                  JOIN unit_members AS um ON s.unitId = um.unitId
                  JOIN idols AS i ON um.idolId = i.id
         WHERE s.unitId IS NOT NULL
         UNION ALL
         -- 来源 2: 非组合曲
         SELECT
             si.songId, si.idolId, i.originalName
         FROM song_idols AS si
                  JOIN songs AS s ON si.songId = s.id
                  JOIN idols AS i ON si.idolId = i.id
         WHERE s.unitId IS NULL
     ),
     SongStats AS (
         -- 步骤 3: 计算统计数据
         SELECT
             p.songId,
             COUNT(p.idolId) AS total_idol_count,
             COUNT(ii.id) AS present_idol_count
         FROM AllSongPerformers AS p
                  LEFT JOIN InputIdols AS ii ON p.idolId = ii.id
         GROUP BY p.songId
     ),
     PerformerOriginalNames AS (
         -- 步骤 4: 拼接日文名
         SELECT
             songId,
             GROUP_CONCAT(originalName, ', ') AS all_performers_original_names
         FROM AllSongPerformers
         GROUP BY songId
     )
-- 步骤 5: 组合最终结果
SELECT
    s.originalTitle AS "歌曲日文名",
    pon.all_performers_original_names AS "原唱偶像列表",
    CASE
        WHEN ss.total_idol_count = 0 THEN 0.0
        ELSE (ss.present_idol_count * 1.0) / ss.total_idol_count
        END AS "出场率",
    ss.present_idol_count AS "出演人数",
    ss.total_idol_count AS "原配人数",
    (ss.total_idol_count - ss.present_idol_count) AS "缺席人数"
FROM SongStats AS ss
         JOIN songs AS s ON ss.songId = s.id
         JOIN PerformerOriginalNames AS pon ON ss.songId = pon.songId
WHERE
    ss.present_idol_count > 0
    ${tanakaFilter}
ORDER BY
    "出场率" DESC,
    "原配人数" DESC;
  `
  
  const result = await db.db.query(query)
  console.log(result)
  return result.map((row: any) => ({
    songName: row["歌曲日文名"],
    performers: row["原唱偶像列表"],
    matchRate: Math.round((row["出场率"] || 0) * 100), // Convert to percentage
    presentCount: row["出演人数"],
    totalCount: row["原配人数"],
    missingCount: row["缺席人数"],
  }))
} 
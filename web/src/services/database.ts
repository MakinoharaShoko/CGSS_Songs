// Use SQL.js from CDN to avoid bundling issues
let db: any = null
let sqlJs: any = null

declare global {
  interface Window {
    initSqlJs: any
  }
}

const loadSqlJs = async () => {
  if (typeof window.initSqlJs === 'undefined') {
    // Load SQL.js from local files
    const script = document.createElement('script')
    script.src = `${window.location.origin}/sql-wasm.js`
    script.async = true
    
    return new Promise((resolve, reject) => {
      script.onload = () => resolve(window.initSqlJs)
      script.onerror = reject
      document.head.appendChild(script)
    })
  }
  return window.initSqlJs
}

export const initDatabase = async () => {
  if (!db) {
    try {
      console.log('Loading SQL.js from CDN...')
      
      // Load SQL.js dynamically
      const initSqlJs = await loadSqlJs()
      
      if (!sqlJs) {
        sqlJs = await initSqlJs({
          // Load WASM from local files
          locateFile: (file: string) => `${window.location.origin}/${file}`
        })
        console.log('SQL.js initialized successfully')
      }

      // Fetch database file
      console.log('Fetching database file...')
      const dbUrl = `${window.location.origin}/prisma/dev.db`
      const response = await fetch(dbUrl)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch database: ${response.status} ${response.statusText}`)
      }
      
      const dbArrayBuffer = await response.arrayBuffer()
      const dbUint8Array = new Uint8Array(dbArrayBuffer)
      
      console.log(`Database loaded: ${dbUint8Array.length} bytes`)
      
      // Create database instance
      db = new sqlJs.Database(dbUint8Array)
      console.log('Database initialized successfully')
    } catch (error) {
      console.error('Failed to initialize database:', error)
      throw new Error(`Database initialization failed: ${error}`)
    }
  }
  return db
}

export const getAllIdols = async (retries = 3) => {
  try {
    const database = await initDatabase()
    const stmt = database.prepare(`
      SELECT id, name, originalName
      FROM idols
      WHERE name IS NOT NULL 
        AND name != ''
        AND name NOT LIKE '%DJ%'
        AND name NOT LIKE '%IDOLM@STER%'
        AND name NOT LIKE '%Mixed by%'
      ORDER BY name
    `)
    
    const result: Array<{id: number, name: string, originalName: string}> = []
    while (stmt.step()) {
      const row = stmt.getAsObject()
      result.push({
        id: row.id as number,
        name: row.name as string,
        originalName: row.originalName as string,
      })
    }
    stmt.free()
    
    console.log('Idols loaded:', result.length)
    return result
  } catch (error) {
    console.error('Error loading idols:', error)
    if (retries > 0) {
      console.log(`Retrying... (${retries} attempts left)`)
      await new Promise(resolve => setTimeout(resolve, 1000))
      return getAllIdols(retries - 1)
    }
    throw new Error(`Failed to load idols after multiple attempts: ${error}`)
  }
}

export const getSongPredictions = async (idolNames: string[], excludeTanaka: boolean = false) => {
  const database = await initDatabase()
  
  // Convert idol names array to SQL string
  const idolNamesStr = idolNames.map(name => `'${name.replace(/'/g, "''")}'`).join(', ')
  
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
  
  const stmt = database.prepare(query)
  const result: Array<{
    songName: string,
    performers: string,
    matchRate: number,
    presentCount: number,
    totalCount: number,
    missingCount: number
  }> = []
  
  while (stmt.step()) {
    const row = stmt.getAsObject()
    result.push({
      songName: row["歌曲日文名"] as string,
      performers: row["原唱偶像列表"] as string,
      matchRate: Math.round(((row["出场率"] as number) || 0) * 100), // Convert to percentage
      presentCount: row["出演人数"] as number,
      totalCount: row["原配人数"] as number,
      missingCount: row["缺席人数"] as number,
    })
  }
  stmt.free()
  
  console.log('Song predictions loaded:', result.length)
  return result
} 
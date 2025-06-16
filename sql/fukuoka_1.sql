WITH InputIdols AS (
  -- 步骤 1: 定义我们关心的偶像列表，获取他们的 ID (无变化)。
  SELECT id
  FROM idols
  WHERE name IN (
    'Chitose Kurosaki', 'Chiyo Shirayuki', 'Miho Kohinata', 'Yuuki Otokura',
    'Rin Shibuya', 'Koume Shirasaka', 'Tamami Wakiyama', 'Hajime Fujiwara',
    'Ryo Matsunaga', 'Mizuki Kawashima', 'Hayate Hisakawa', 'Miyu Mifune',
    'Akane Hino', 'Hikaru Nanjo', 'Yuko Hori', 'Yoshino Yoda',
    'Nagi Hisakawa', 'Emi Namba', 'Reina Koseki', 'Syoko Hoshi'
  )
),
AllSongPerformers AS (
  -- 步骤 2: 构建权威的演唱者列表，包含 idolId 和 originalName (无变化)。
  SELECT
    s.id AS songId, um.idolId, i.originalName
  FROM songs AS s
  JOIN unit_members AS um ON s.unitId = um.unitId
  JOIN idols AS i ON um.idolId = i.id
  WHERE s.unitId IS NOT NULL
  UNION ALL
  SELECT
    si.songId, si.idolId, i.originalName
  FROM song_idols AS si
  JOIN songs AS s ON si.songId = s.id
  JOIN idols AS i ON si.idolId = i.id
  WHERE s.unitId IS NULL
),
SongStats AS (
  -- 步骤 3: 计算出演人数和总人数 (无变化)。
  SELECT
    p.songId,
    COUNT(p.idolId) AS total_idol_count,
    COUNT(ii.id) AS present_idol_count
  FROM AllSongPerformers AS p
  LEFT JOIN InputIdols AS ii ON p.idolId = ii.id
  GROUP BY p.songId
),
PerformerOriginalNames AS (
  -- 步骤 4: 拼接所有演唱者的日文名字符串 (无变化)。
  SELECT
    songId,
    GROUP_CONCAT(originalName, ', ') AS all_performers_original_names
  FROM AllSongPerformers
  GROUP BY songId
)
-- 步骤 5: [最终修改] 组合所有结果，使用中文列名，计算出场率，并按新规则排序。
SELECT
  s.originalTitle AS "歌曲日文名",
  pon.all_performers_original_names AS "原唱偶像列表",
  
  -- 计算出场率，乘以 1.0 来确保进行浮点数除法，避免整数除法导致结果为0
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
WHERE ss.present_idol_count > 0 -- 依然只显示至少有一人出演的歌曲
ORDER BY
  -- 新的排序规则
  "出场率" DESC,   -- 第一顺位: 出场率降序
  "原配人数" DESC;   -- 第二顺位: 原配人数降序
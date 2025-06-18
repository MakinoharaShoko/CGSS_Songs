WITH InputIdols AS (
    -- 步骤 1: 定义我们关心的偶像列表 (无变化)
    SELECT id
    FROM idols
    WHERE name IN (
                   'Chitose Kurosaki', 'Chiyo Shirayuki', 'Miho Kohinata', 'Yuuki Otokura',
                   'Rin Shibuya', 'Koume Shirasaka', 'Tamami Wakiyama', 'Hajime Fujiwara',
                   'Ryo Matsunaga', 'Mizuki Kawashima', 'Hayate Hisakawa', 'Miyu Mifune',
                   'Hino Akane', 'Nanjo Hikaru', 'Hori Yuko', 'Yoshino Yorita',
                   'Nagi Hisakawa', 'Emi Namba', 'Reina Koseki', 'Syoko Hoshi'
        )
),
     AllSongPerformers AS (
         -- 步骤 2: 构建权威的演唱者列表 (无变化)
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
         -- 步骤 3: 计算统计数据 (无变化)
         SELECT
             p.songId,
             COUNT(p.idolId) AS total_idol_count,
             COUNT(ii.id) AS present_idol_count
         FROM AllSongPerformers AS p
                  LEFT JOIN InputIdols AS ii ON p.idolId = ii.id
         GROUP BY p.songId
     ),
     PerformerOriginalNames AS (
         -- 步骤 4: 拼接日文名 (无变化)
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

-- [修改部分] 在 WHERE 子句中增加排除条件
WHERE
    ss.present_idol_count > 0
  -- 排除作曲中包含 "Hidekazu Tanaka" 的歌曲
  AND COALESCE(s.composer, '') NOT LIKE '%Hidekazu Tanaka%'
  -- 排除作词中包含 "Hidekazu Tanaka" 的歌曲
  AND COALESCE(s.lyricist, '') NOT LIKE '%Hidekazu Tanaka%'

-- 排序逻辑保持不变
ORDER BY
    "出场率" DESC,
    "原配人数" DESC;

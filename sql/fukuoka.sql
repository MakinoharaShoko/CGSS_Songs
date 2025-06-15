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
         -- 步骤 2: [逻辑修正] 构建权威的演唱者列表。
         -- Step 2: [LOGIC FIXED] Build the authoritative list of performers.

         -- 来源 1: 对于所有有关联组合的歌曲，其演唱者仅由组合成员定义。
         -- Source 1: For all songs that HAVE a unitId, performers are defined ONLY by the unit members.
         SELECT
             s.id AS songId,
             um.idolId
         FROM songs AS s
                  JOIN unit_members AS um ON s.unitId = um.unitId
         WHERE s.unitId IS NOT NULL

         UNION ALL -- 使用 UNION ALL，因为下面的集合与此集合中的歌曲ID是互斥的。

         -- 来源 2: 仅对于没有关联组合的歌曲，我们才从 song_idols 表中获取演唱者。
         -- Source 2: For songs that DO NOT have a unitId, we get performers from song_idols.
         SELECT
             si.songId,
             si.idolId
         FROM song_idols AS si
                  JOIN songs AS s ON si.songId = s.id
         WHERE s.unitId IS NULL
     ),
     SongStats AS (
         -- 步骤 3: 统计逻辑无变化，但现在基于更准确的数据源。
         SELECT
             p.songId,
             COUNT(p.idolId) AS total_idol_count,
             COUNT(ii.id) AS present_idol_count
         FROM AllSongPerformers AS p
                  LEFT JOIN InputIdols AS ii ON p.idolId = ii.id
         GROUP BY p.songId
     )
-- 步骤 4: 最终 SELECT 无变化。
SELECT
    s.name AS song_name,
    s.originalIdols AS original_idol_string,
    (ss.total_idol_count - ss.present_idol_count) AS missing_idol_count,
    ss.present_idol_count,
    ss.total_idol_count
FROM SongStats AS ss
         JOIN songs AS s ON ss.songId = s.id
WHERE ss.present_idol_count > 0
ORDER BY
    missing_idol_count ASC,
    song_name ASC;

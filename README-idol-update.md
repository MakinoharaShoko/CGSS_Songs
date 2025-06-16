# 偶像信息更新脚本 (支持并发处理)

## 功能描述

`src/update-idol-details.ts` 是一个专门用于补充数据库中现有偶像详细信息的脚本，支持高效的并发处理。

## 使用场景

- 数据库中已有偶像基础信息（姓名）
- 需要为这些偶像补充详细信息（声优、年龄、身高等）
- 批量更新偶像信息

## 运行方式

### 方式一：使用 npm 脚本
```bash
npm run update-idols
```

### 方式二：直接运行
```bash
npx tsx src/update-idol-details.ts
```

## 功能特性

### 🔍 智能分析
- 自动检测需要更新的偶像（缺少关键信息的偶像）
- 跳过已有完整信息的偶像
- 显示详细的更新前分析

### 📊 进度追踪
- 实时显示处理进度
- 详细的成功/失败统计
- 每个偶像的更新状态

### 🛡️ 安全机制
- 智能并发控制（默认5个并发）
- 批次间延迟避免服务器压力
- 错误处理不中断整个流程
- 数据库连接自动关闭

### 🚀 性能优化
- 并发处理提高效率（约5倍速度提升）
- Promise.allSettled 确保单个失败不影响整体
- 分批处理避免内存压力
- 实时进度反馈

### 📈 详细报告
- 更新前后对比
- 成功率统计
- 最终数据库状态
- 性能对比（并发 vs 串行）

## 输出示例

```
🔍 Fetching all idols from database...
📊 Found 150 idols in database

📈 Analysis:
   Already have details: 45
   Need updates: 105

🚀 Starting concurrent detail updates for 105 idols (5 concurrent)...
⏱️  This will take approximately 2 minutes (vs 5 minutes sequential)

👤 [1/105] Processing: Riina Tada
   Current status: VA=✗, Age=✗, Type=✗
   ✅ Updated: VA: 青木瑠璃子, Age: 17, Type: Cool
   📊 Progress: 1% (1/105)
   ⏳ Waiting 2 seconds...

...

📊 Update Summary:
   Total idols: 150
   Already complete: 45
   Attempted updates: 105
   ✅ Successful: 87
   ⚠️  Skipped (no new info): 12
   ❌ Failed: 6
   📈 Success rate: 83%

🎉 Successfully enhanced 87 idol profiles with 5x concurrency!

📈 Final Database Status:
   Voice Actors: 132/150 (88%)
   Ages: 125/150 (83%)
   Card Types: 140/150 (93%)
   Hometowns: 98/150 (65%)
   Hobbies: 76/150 (51%)
```

## 更新的字段

脚本会尝试获取以下偶像信息：
- **声优 (voiceActor)**: 配音演员
- **年龄 (age)**: 偶像年龄
- **身高 (height)**: 如 "152 cm"
- **体重 (weight)**: 如 "41 kg"
- **生日 (birthday)**: 如 "June 30th"
- **血型 (bloodType)**: 如 "A"
- **三围 (threeSizes)**: 如 "80-55-81 cm"
- **惯用手 (handedness)**: 如 "Right"
- **爱好 (hobbies)**: 如 "Listening to music"
- **星座 (horoscope)**: 如 "Cancer"
- **家乡 (hometown)**: 如 "Tokyo"
- **卡片类型 (cardType)**: Cool/Cute/Passion
- **形象色 (imageColor)**: 颜色代码
- **偶像页面URL (idolUrl)**: 详情页链接

## 注意事项

1. **运行时间**: 并发处理大大减少时间（每批次约1-2秒，默认5个并发）
2. **网络依赖**: 需要稳定的网络连接
3. **数据库**: 确保数据库中已有偶像基础信息
4. **服务器友好**: 智能并发控制和批次延迟，避免对目标服务器造成压力
5. **并发配置**: 可调整并发数量，建议3-8个并发

## 错误处理

- 单个偶像更新失败不会中断整个流程
- 网络错误会自动重试（通过多种URL格式）
- 详细的错误日志便于问题排查

## 技术实现

- 使用 Prisma ORM 进行数据库操作
- 基于 cheerio 的网页解析
- TypeScript 类型安全
- 异步处理提高效率 
const entries: { emoji: string; words: string }[] = [
  { emoji: '😀', words: '笑 开心 高兴' },
  { emoji: '😁', words: '笑 嘻嘻' },
  { emoji: '😂', words: '笑 哭 哈哈' },
  { emoji: '😊', words: '微笑 开心' },
  { emoji: '😉', words: '眨眼' },
  { emoji: '😍', words: '喜欢 爱心 花痴' },
  { emoji: '🤔', words: '想 思考 疑问' },
  { emoji: '😴', words: '睡 困' },
  { emoji: '😎', words: '酷 墨镜' },
  { emoji: '😭', words: '哭 难过' },
  { emoji: '😡', words: '生气 怒' },
  { emoji: '👍', words: '赞 好 可以' },
  { emoji: '👎', words: '踩 不好' },
  { emoji: '👏', words: '鼓掌 拍手' },
  { emoji: '🙏', words: '谢谢 拜托 合十' },
  { emoji: '💪', words: '加油 力量' },
  { emoji: '❤️', words: '心 爱' },
  { emoji: '✨', words: '闪 星星 亮' },
  { emoji: '🔥', words: '火 热' },
  { emoji: '⭐', words: '星 收藏' },
  { emoji: '✅', words: '完成 对 勾' },
  { emoji: '❌', words: '错 取消' },
  { emoji: '⚠️', words: '警告 注意' },
  { emoji: '📌', words: '图钉 固定' },
  { emoji: '📝', words: '笔记 写' },
  { emoji: '📚', words: '书 阅读' },
  { emoji: '💡', words: '想法 灯泡' },
  { emoji: '🎉', words: '庆祝 派对' },
  { emoji: '🚀', words: '火箭 出发' },
  { emoji: '🌟', words: '闪亮' },
  { emoji: '☀️', words: '太阳 晴' },
  { emoji: '🌙', words: '月亮 夜晚' },
  { emoji: '☕', words: '咖啡 茶歇' },
  { emoji: '🍀', words: '幸运 草' }
]

export function searchEmoji(query: string): string[] {
  const needle = query.trim().toLocaleLowerCase()
  const matched = needle ? entries.filter((entry) => entry.words.toLocaleLowerCase().includes(needle) || entry.emoji.includes(needle)) : entries
  return matched.slice(0, 40).map((entry) => entry.emoji)
}

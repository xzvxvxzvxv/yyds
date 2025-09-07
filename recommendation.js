// 推荐算法模块
const RecommendationSystem = {
  // 配置参数
  config: {
    // 各类别的权重配置
    categoryWeights: {
      errorRate: 0.6,       // 错误率权重
      recentMistakes: 0.3,  // 最近错误权重
      timeInterval: 0.1     // 时间间隔权重
    },
    // 推荐策略
    strategies: {
      prioritizeErrors: true,     // 优先推荐错误单词
      balanceCategories: true,    // 平衡各分类推荐
      spacedRepetition: true      // 使用间隔复习策略
    }
  },

  // 初始化推荐系统
  init() {
    console.log('推荐系统已初始化');
  },

  // 核心推荐函数
  getRecommendedWords(count = 20) {
    // 获取所有单词
    const allWords = window.vocabularyList || [];
    // 获取错误单词记录
    const errorWords = this.getErrorWords();
    // 获取学习历史
    const learningHistory = this.getLearningHistory();
    
    // 对每个单词计算推荐分数
    const scoredWords = allWords.map(word => {
      const score = this.calculateRecommendationScore(word, errorWords, learningHistory);
      return {
        ...word,
        recommendationScore: score
      };
    });
    
    // 按推荐分数降序排序
    const sortedWords = scoredWords.sort((a, b) => b.recommendationScore - a.recommendationScore);
    
    // 如果配置了优先推荐错误单词，则先选择错误单词
    if (this.config.strategies.prioritizeErrors && Object.keys(errorWords).length > 0) {
      const errorWordIds = Object.keys(errorWords);
      const errorWordObjects = sortedWords.filter(word => 
        errorWordIds.includes(word.english.toLowerCase())
      );
      const nonErrorWords = sortedWords.filter(word => 
        !errorWordIds.includes(word.english.toLowerCase())
      );
      
      // 40% 来自错误单词，60% 来自普通单词
      const errorWordCount = Math.min(Math.floor(count * 0.4), errorWordObjects.length);
      const nonErrorWordCount = count - errorWordCount;
      
      return [
        ...errorWordObjects.slice(0, errorWordCount),
        ...nonErrorWords.slice(0, nonErrorWordCount)
      ].sort(() => 0.5 - Math.random()); // 最后打乱顺序
    }
    
    // 返回前count个推荐单词并打乱顺序
    return sortedWords.slice(0, count).sort(() => 0.5 - Math.random());
  },

  // 计算单词的推荐分数
  calculateRecommendationScore(word, errorWords, learningHistory) {
    const wordId = word.english.toLowerCase();
    let score = 0;
    
    // 错误率评分 (占60%)
    if (errorWords[wordId]) {
      // 错误次数越多，得分越高
      const errorCountScore = errorWords[wordId].errorCount * 5;
      score += errorCountScore * this.config.categoryWeights.errorRate;
    }
    
    // 最近错误评分 (占30%)
    if (errorWords[wordId] && errorWords[wordId].lastErrorTime) {
      const lastErrorTime = new Date(errorWords[wordId].lastErrorTime);
      const now = new Date();
      const hoursSinceLastError = (now - lastErrorTime) / (1000 * 60 * 60);
      
      // 最近24小时内的错误权重更高
      if (hoursSinceLastError < 24) {
        score += 10 * this.config.categoryWeights.recentMistakes;
      } else if (hoursSinceLastError < 72) {
        score += 5 * this.config.categoryWeights.recentMistakes;
      }
    }
    
    // 时间间隔评分 (占10%) - 基于间隔复习原理
    if (this.config.strategies.spacedRepetition && learningHistory[wordId]) {
      const lastLearnTime = new Date(learningHistory[wordId].lastLearnTime);
      const now = new Date();
      const daysSinceLastLearn = (now - lastLearnTime) / (1000 * 60 * 60 * 24);
      
      // 根据时间间隔调整分数
      if (daysSinceLastLearn > 7) {
        score += 10 * this.config.categoryWeights.timeInterval;
      } else if (daysSinceLastLearn > 3) {
        score += 5 * this.config.categoryWeights.timeInterval;
      }
    }
    
    return score;
  },

  // 获取错误单词记录
  getErrorWords() {
    try {
      const saved = localStorage.getItem('errorWords');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.error('获取错误单词记录失败:', e);
      return {};
    }
  },

  // 获取学习历史
  getLearningHistory() {
    try {
      const saved = localStorage.getItem('learningHistory');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.error('获取学习历史失败:', e);
      return {};
    }
  },

  // 更新学习记录
  updateLearningHistory(word, isCorrect) {
    try {
      const learningHistory = this.getLearningHistory();
      const wordId = word.english.toLowerCase();
      
      if (!learningHistory[wordId]) {
        learningHistory[wordId] = {
          word: word,
          totalAttempts: 0,
          correctAttempts: 0,
          lastLearnTime: new Date().toISOString()
        };
      }
      
      learningHistory[wordId].totalAttempts++;
      if (isCorrect) {
        learningHistory[wordId].correctAttempts++;
      }
      learningHistory[wordId].lastLearnTime = new Date().toISOString();
      
      localStorage.setItem('learningHistory', JSON.stringify(learningHistory));
    } catch (e) {
      console.error('更新学习记录失败:', e);
    }
  },

  // 获取单词掌握度统计
  getMasteryStats() {
    const allWords = window.vocabularyList || [];
    const errorWords = this.getErrorWords();
    const learningHistory = this.getLearningHistory();
    
    // 按类别统计
    const categoryStats = {};
    allWords.forEach(word => {
      const category = word.category;
      if (!categoryStats[category]) {
        categoryStats[category] = {
          totalWords: 0,
          masteredWords: 0,
          errorWords: 0
        };
      }
      
      categoryStats[category].totalWords++;
      
      const wordId = word.english.toLowerCase();
      if (errorWords[wordId]) {
        categoryStats[category].errorWords++;
      } else if (learningHistory[wordId] && 
                 learningHistory[wordId].totalAttempts >= 3 && 
                 learningHistory[wordId].correctAttempts / learningHistory[wordId].totalAttempts >= 0.8) {
        categoryStats[category].masteredWords++;
      }
    });
    
    return {
      categoryStats,
      totalWords: allWords.length,
      errorWordCount: Object.keys(errorWords).length
    };
  },

  // 清空所有推荐相关数据
  clearAllData() {
    try {
      localStorage.removeItem('learningHistory');
      localStorage.removeItem('errorWords');
      console.log('推荐系统数据已清空');
    } catch (e) {
      console.error('清空推荐系统数据失败:', e);
    }
  }
};

// 为浏览器环境提供全局访问
if (typeof window !== 'undefined') {
  window.RecommendationSystem = RecommendationSystem;
}
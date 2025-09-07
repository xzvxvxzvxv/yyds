// 直接使用全局变量 window.vocabularyList
// 确保在HTML中先加载vocabulary.js，再加载app.js

// 全局变量
let currentWords = [];
const numCards = 10;
const recommendedNumCards = 20; // 每日推荐学习的单词数量
// 存储错误单词的对象，格式: {wordId: {word: {...}, errorCount: number}}
let errorWords = {};
// 存储每日推荐学习的单词
let dailyWords = [];
// 存储当前组索引
let currentGroupIndex = 0;

// 透明占位符 (1x1 像素透明图片的 base64 编码)
const TRANSPARENT_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxkZWZzPjxwYXR0ZXJuIGlkPSJwYXR0ZXJuIiB3aWR0aD0iMSIgaGVpZ2h0PSIxIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48bGluZSB4MT0iMCIgeTE9IjAiIHgyPSIxIiB5Mj0iMSIgc3Ryb2tlPSIjZmZmZmZmMCIgc3Ryb2tlLXdpZHRoPSIxIi8+PGxpbmUgeDE9IjAiIHkxPSIxIiB4Mj0iMSIgeTI9IjAiIHN0cm9rZT0iI2ZmZmZmZjAiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjEiIGhlaWdodD0iMSIgZmlsbD0idXJsKCNwYXR0ZXJuKSIvPjwvc3ZnPg==';

// 模糊占位符 (低质量模糊版本的占位符)
const BLURRY_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iLjc1IiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWx0ZXI9InVybCgjYSkiIG9wYWNpdHk9Ii4yIi8+PC9zdmc+';

// 全局图片缓存机制
const imageCache = new Map();
// 缓存统计信息
const cacheStats = {
  hits: 0,
  misses: 0,
  totalSize: 0
};

// 图片尺寸限制（字节），超过此大小的图片会被优先清理
const MAX_IMAGE_SIZE = 500 * 1024; // 500KB
// 缓存最大容量（字节）
const MAX_CACHE_SIZE = 5 * 1024 * 1024; // 5MB

// 检查图片是否在缓存中
function checkImageInCache(imagePath) {
  return imageCache.has(imagePath);
}

// 将图片添加到缓存
function addImageToCache(imagePath, imageData) {
  // 检查是否已存在
  if (imageCache.has(imagePath)) {
    return;
  }
  
  // 计算图片大小（这里使用简单估算，实际应用中可以从响应头获取）
  const imageSize = estimateImageSize(imagePath);
  
  // 确保缓存大小不会超过限制
  ensureCacheSize(imageSize);
  
  // 添加到缓存
  imageCache.set(imagePath, {
    data: imageData,
    timestamp: Date.now(),
    size: imageSize
  });
  
  // 更新缓存统计
  cacheStats.totalSize += imageSize;
}

// 估算图片大小（基于URL扩展名和字符长度）
function estimateImageSize(imagePath) {
  // 简单估算：基于扩展名和URL长度
  const extension = imagePath.split('.').pop().toLowerCase();
  const urlLength = imagePath.length;
  
  // 不同格式的平均大小估算（字节）
  const formatMultipliers = {
    'png': 2, // PNG图片通常较大
    'jpg': 1.5, // JPG中等
    'jpeg': 1.5,
    'gif': 1.8,
    'svg': 0.5 // SVG通常较小
  };
  
  const multiplier = formatMultipliers[extension] || 1;
  return urlLength * 1024 * multiplier; // 简单估算
}

// 确保缓存大小不会超过限制
function ensureCacheSize(requiredSize) {
  // 如果添加新图片后会超出缓存限制，则清理旧的或大的图片
  while (cacheStats.totalSize + requiredSize > MAX_CACHE_SIZE && imageCache.size > 0) {
    // 找出最旧的或大于最大尺寸的图片
    let oldestPath = null;
    let oldestTime = Infinity;
    let largestPath = null;
    let largestSize = 0;
    
    for (const [path, data] of imageCache.entries()) {
      // 记录最旧的图片
      if (data.timestamp < oldestTime) {
        oldestTime = data.timestamp;
        oldestPath = path;
      }
      
      // 记录最大的图片
      if (data.size > largestSize) {
        largestSize = data.size;
        largestPath = path;
      }
    }
    
    // 优先清理大于最大尺寸的图片，否则清理最旧的图片
    const pathToRemove = largestSize > MAX_IMAGE_SIZE ? largestPath : oldestPath;
    
    if (pathToRemove) {
      const removedData = imageCache.get(pathToRemove);
      cacheStats.totalSize -= removedData.size;
      imageCache.delete(pathToRemove);
      console.log(`从缓存中移除图片: ${pathToRemove}, 大小: ${Math.round(removedData.size / 1024)}KB`);
    }
  }
}

// 获取缓存统计信息
function getCacheStats() {
  return {
    ...cacheStats,
    entries: imageCache.size,
    sizeMB: Math.round(cacheStats.totalSize / (1024 * 1024) * 100) / 100
  };
}

// 初始化所有服务
function initAllServices() {
  // 初始化推荐系统
  if (window.RecommendationSystem && typeof window.RecommendationSystem.init === 'function') {
    try {
      window.RecommendationSystem.init();
      console.log('推荐系统已初始化');
    } catch (error) {
      console.error('初始化推荐系统失败:', error);
    }
  }
  
  // 初始化云存储服务
  initCloudStorage();
  
  // 初始化WebSocket服务
  if (window.WebSocketService && typeof window.WebSocketService.init === 'function') {
    try {
      window.WebSocketService.init();
      setupWebSocketListeners();
      console.log('WebSocket服务已初始化');
    } catch (error) {
      console.error('初始化WebSocket服务失败:', error);
    }
  }
}

// 设置WebSocket监听器
function setupWebSocketListeners() {
  if (!window.WebSocketService) {
    return;
  }
  
  // 监听学习反馈
  window.WebSocketService.on('feedback', (data) => {
    showRealtimeFeedback(data.message, data.encouragement);
  });
  
  // 监听其他用户活动
  window.WebSocketService.on('peerActivity', (data) => {
    showPeerActivity(data);
  });
  
  // 监听排行榜更新
  window.WebSocketService.on('rankingUpdate', (data) => {
    updateRankingDisplay(data.rankings);
  });
  
  // 监听系统消息
  window.WebSocketService.on('systemMessage', (data) => {
    showSystemMessage(data.message);
  });
}

// 显示实时学习反馈
function showRealtimeFeedback(message, encouragement) {
  const feedbackContainer = document.createElement('div');
  feedbackContainer.className = 'realtime-feedback';
  feedbackContainer.innerHTML = `
    <div class="feedback-message">${message}</div>
    <div class="feedback-encouragement">${encouragement}</div>
  `;
  
  // 添加到页面
  document.body.appendChild(feedbackContainer);
  
  // 3秒后自动消失
  setTimeout(() => {
    feedbackContainer.classList.add('fade-out');
    setTimeout(() => {
      if (document.body.contains(feedbackContainer)) {
        document.body.removeChild(feedbackContainer);
      }
    }, 500);
  }, 3000);
}

// 显示其他用户活动
function showPeerActivity(data) {
  const activityContainer = document.createElement('div');
  activityContainer.className = 'peer-activity';
  
  let activityText = '';
  switch (data.action) {
    case 'completed':
      activityText = `${data.userName} 完成了 ${data.content}！`;
      break;
    case 'mastered':
      activityText = `${data.userName} 掌握了 ${data.content}！`;
      break;
    case 'joined':
      activityText = `${data.userName} 加入了 ${data.content}！`;
      break;
    case 'scored':
      activityText = `${data.userName} 获得了 ${data.content}！`;
      break;
    default:
      activityText = `${data.userName} ${data.action} ${data.content}！`;
  }
  
  activityContainer.textContent = activityText;
  
  // 添加到活动流
  const activityStream = document.getElementById('activity-stream');
  if (activityStream) {
    activityStream.prepend(activityContainer);
    
    // 限制活动流消息数量
    while (activityStream.children.length > 10) {
      activityStream.removeChild(activityStream.lastChild);
    }
  }
}

// 更新排行榜显示
function updateRankingDisplay(rankings) {
  const rankingContainer = document.getElementById('ranking-container');
  if (!rankingContainer) {
    return;
  }
  
  // 清空现有内容
  rankingContainer.innerHTML = '';
  
  // 创建排行榜标题
  const title = document.createElement('h3');
  title.textContent = '学习排行榜';
  rankingContainer.appendChild(title);
  
  // 创建排行榜列表
  const rankingList = document.createElement('ul');
  rankingList.className = 'ranking-list';
  
  // 添加排名项
  rankings.forEach((user, index) => {
    const listItem = document.createElement('li');
    listItem.className = user.isCurrentUser ? 'current-user' : '';
    
    // 前三名添加特殊标记
    let rankText = (index + 1).toString();
    if (index === 0) rankText = '🥇';
    else if (index === 1) rankText = '🥈';
    else if (index === 2) rankText = '🥉';
    
    listItem.innerHTML = `
      <span class="rank">${rankText}</span>
      <span class="username">${user.name}</span>
      <span class="score">${user.score}</span>
    `;
    
    rankingList.appendChild(listItem);
  });
  
  rankingContainer.appendChild(rankingList);
}

// 显示系统消息
function showSystemMessage(message) {
  const systemMessage = document.createElement('div');
  systemMessage.className = 'system-message';
  systemMessage.textContent = message;
  
  document.body.appendChild(systemMessage);
  
  // 5秒后自动消失
  setTimeout(() => {
    systemMessage.classList.add('fade-out');
    setTimeout(() => {
      if (document.body.contains(systemMessage)) {
        document.body.removeChild(systemMessage);
      }
    }, 500);
  }, 5000);
}

// 从localStorage加载错误单词
function loadErrorWords() {
  const saved = localStorage.getItem('errorWords');
  if (saved) {
    try {
      errorWords = JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load error words:', e);
      errorWords = {};
    }
  }
}

// 从localStorage加载每日学习单词
function loadDailyWords() {
  const saved = localStorage.getItem('dailyWords');
  const savedDate = localStorage.getItem('dailyWordsDate');
  const today = new Date().toDateString();
  
  // 如果存储的日期不是今天，生成新的每日单词
  if (!saved || savedDate !== today) {
    return false;
  }
  
  try {
    dailyWords = JSON.parse(saved);
    return true;
  } catch (e) {
    console.error('Failed to load daily words:', e);
    dailyWords = [];
    return false;
  }
}

// 保存每日学习单词到localStorage
function saveDailyWords() {
  try {
    localStorage.setItem('dailyWords', JSON.stringify(dailyWords));
    localStorage.setItem('dailyWordsDate', new Date().toDateString());
  } catch (e) {
    console.error('Failed to save daily words:', e);
  }
}

// 获取每日推荐学习的单词
function getDailyRecommendedWords() {
  // 如果已加载今日单词，直接返回
  if (loadDailyWords()) {
    return dailyWords;
  }
  
  // 否则生成新的每日单词
  // 尝试使用推荐系统生成单词
  if (window.RecommendationSystem && typeof window.RecommendationSystem.getRecommendedWords === 'function') {
    try {
      // 初始化推荐系统（如果尚未初始化）
      if (!window.RecommendationSystem.initialized) {
        window.RecommendationSystem.init();
        window.RecommendationSystem.initialized = true;
      }
      
      // 使用推荐系统生成单词
      // 增加总单词量以支持多组学习
      const totalWords = recommendedNumCards * 3; // 生成3组单词量
      dailyWords = window.RecommendationSystem.getRecommendedWords(totalWords);
      
      // 如果推荐系统返回的单词不足，使用传统方法补充
      if (dailyWords.length < totalWords) {
        // 获取所有单词，但排除已在推荐列表中的单词
        const remainingWords = window.vocabularyList.filter(word => 
          !dailyWords.some(recommendedWord => 
            recommendedWord.english.toLowerCase() === word.english.toLowerCase() && 
            recommendedWord.category === word.category
          )
        );
        
        // 随机选择需要的剩余单词
        const neededCount = totalWords - dailyWords.length;
        const additionalWords = [...remainingWords]
          .sort(() => 0.5 - Math.random())
          .slice(0, neededCount);
        
        // 合并并打乱顺序
        dailyWords = [...dailyWords, ...additionalWords].sort(() => 0.5 - Math.random());
      }
    } catch (e) {
      console.error('推荐系统出错，使用传统方法生成单词:', e);
      // 回退到传统方法
      dailyWords = generateDailyWordsFallback();
    }
  } else {
    // 如果推荐系统不可用，使用传统方法
    console.log('推荐系统不可用，使用传统方法生成单词');
    dailyWords = generateDailyWordsFallback();
  }
  
  // 保存到localStorage
  saveDailyWords();
  
  return dailyWords;
}

// 传统的每日单词生成方法（作为推荐系统的回退）
function generateDailyWordsFallback() {
  // 首先从错误单词中选择部分单词
  const errorWordsList = Object.values(errorWords).map(item => item.word);
  // 然后从所有单词中随机选择剩余的单词，但排除已选择的错误单词
  const allWords = window.vocabularyList.filter(word => {
    const wordId = word.english.toLowerCase() + '-' + word.category;
    return !errorWords[wordId];
  });
  
  // 打乱顺序
  const shuffledAllWords = [...allWords].sort(() => 0.5 - Math.random());
  
  // 计算需要从错误单词和所有单词中各选择多少
  // 增加总单词量以支持多组学习
  const totalWords = recommendedNumCards * 3; // 生成3组单词量
  const maxErrorWords = Math.min(errorWordsList.length, totalWords * 0.4); // 40%来自错误单词
  const remainingWords = totalWords - maxErrorWords;
  
  // 随机选择错误单词
  const selectedErrorWords = [...errorWordsList].sort(() => 0.5 - Math.random()).slice(0, maxErrorWords);
  // 随机选择其他单词
  const selectedOtherWords = shuffledAllWords.slice(0, remainingWords);
  
  // 合并并打乱顺序
  return [...selectedErrorWords, ...selectedOtherWords].sort(() => 0.5 - Math.random());
}

// 获取当前组的单词
function getCurrentGroupWords() {
  const startIndex = currentGroupIndex * recommendedNumCards;
  const endIndex = startIndex + recommendedNumCards;
  // 获取当前组的单词并打乱顺序
  const currentGroup = dailyWords.slice(startIndex, endIndex);
  return [...currentGroup].sort(() => 0.5 - Math.random());
}

// 检查是否还有下一组
function hasNextGroup() {
  return (currentGroupIndex + 1) * recommendedNumCards < dailyWords.length;
}

// 保存错误单词到localStorage
function saveErrorWords() {
  try {
    localStorage.setItem('errorWords', JSON.stringify(errorWords));
  } catch (e) {
    console.error('Failed to save error words:', e);
  }
}

// 设置图片懒加载
let lazyLoadObserver = null;
// 限制同时加载的图片数量，避免资源竞争
const MAX_CONCURRENT_LOADS = 3;
let currentLoadingCount = 0;
const loadingQueue = [];

function setupLazyLoading() {
  // 检查浏览器是否支持 IntersectionObserver
  if ('IntersectionObserver' in window) {
    // 创建一个观察器实例
    if (!lazyLoadObserver) {
      lazyLoadObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          // 如果元素进入视口
          if (entry.isIntersecting) {
            const img = entry.target;
            // 检查是否已经处理过
            if (img.classList.contains('observed')) return;
            
            // 获取真实的图片路径
            const src = img.dataset.src;
            
            if (src) {
              // 标记为已观察
              img.classList.add('observed');
              
              // 将图片添加到加载队列
              loadingQueue.push({
                img: img,
                src: src,
                observer: observer
              });
              
              // 处理加载队列
              processImageLoadingQueue();
            }
          }
        });
      }, {
        // 优化配置：增加rootMargin以提前加载更多内容
        rootMargin: '0px 0px 400px 0px', // 提前400px开始加载
        threshold: 0.05, // 只要元素5%可见就开始加载
        // 使用低优先级以减少对主要内容的影响
        root: null,
        trackVisibility: true,
        delay: 100 // 延迟检查以减少不必要的回调
      });
    }
    
    // 观察所有带有data-src属性的图片
    document.querySelectorAll('img[data-src]').forEach(img => {
      // 避免重复观察
      if (!img.classList.contains('observed')) {
        lazyLoadObserver.observe(img);
        // 不要在这里添加'observed'类，只有在元素进入视口并实际加载图片时才添加
      }
    });
  } else {
    // 对于不支持IntersectionObserver的浏览器，使用传统的懒加载方式
    const lazyLoadImages = () => {
      const images = document.querySelectorAll('img[data-src]');
      
      images.forEach(img => {
        // 检查图片是否在视口中
        if (isInViewport(img)) {
          const src = img.dataset.src;
          if (src) {
            // 添加到加载队列
            loadingQueue.push({
              img: img,
              src: src
            });
            
            // 处理加载队列
            processImageLoadingQueue();
          }
        }
      });
    };
    
    // 检查元素是否在视口中的辅助函数
    function isInViewport(el) {
      const rect = el.getBoundingClientRect();
      return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
      );
    }
    
    // 在滚动和调整窗口大小时检查图片
    window.addEventListener('scroll', lazyLoadImages);
    window.addEventListener('resize', lazyLoadImages);
    
    // 初始加载
    lazyLoadImages();
  }
}

// 处理图片加载队列，限制并发加载数量
function processImageLoadingQueue() {
  // 如果当前加载数量小于最大并发数，且队列不为空，则继续加载
  while (currentLoadingCount < MAX_CONCURRENT_LOADS && loadingQueue.length > 0) {
    const item = loadingQueue.shift();
    loadImageWithPlaceholder(item);
  }
}

// 使用模糊占位符渐进式加载图片
function loadImageWithPlaceholder(item) {
  const { img, src, observer } = item;
  
  // 增加当前加载计数
  currentLoadingCount++;
  
  // 先设置模糊占位符
  img.src = BLURRY_PLACEHOLDER;
  
  // 检查图片是否在缓存中
  if (checkImageInCache(src)) {
    console.log(`从缓存加载图片: ${src}`);
    cacheStats.hits++;
    
    // 直接使用缓存的图片数据
    const cachedImageData = imageCache.get(src).data;
    
    // 设置图片源
    img.src = cachedImageData || src;
    
    // 加载完成后的处理
    img.onload = function() {
      this.classList.add('loaded');
      if (this.classList.contains('loading')) {
        this.classList.remove('loading');
      }
      
      // 如果有观察器，停止观察
      if (observer) {
        observer.unobserve(img);
      }
      
      // 减少当前加载计数并处理下一个图片
      currentLoadingCount--;
      processImageLoadingQueue();
    };
    
    // 图片加载失败的处理
    img.onerror = function() {
      handleImageError(this);
      
      // 减少当前加载计数并处理下一个图片
      currentLoadingCount--;
      processImageLoadingQueue();
    };
  } else {
    // 图片不在缓存中，进行正常加载
    cacheStats.misses++;
    
    // 创建一个临时图像对象用于预加载
    const tempImg = new Image();
    
    // 监听图像加载完成事件
    tempImg.onload = function() {
      // 将图片添加到缓存
      addImageToCache(src, src); // 在实际应用中，这里可以存储data URL或其他格式
      
      // 图片加载完成后，替换为实际图片
      img.src = src;
      
      // 加载完成后的处理
      img.onload = function() {
        this.classList.add('loaded');
        if (this.classList.contains('loading')) {
          this.classList.remove('loading');
        }
        
        // 如果有观察器，停止观察
        if (observer) {
          observer.unobserve(img);
        }
        
        // 减少当前加载计数并处理下一个图片
        currentLoadingCount--;
        processImageLoadingQueue();
      };
      
      // 图片加载失败的处理
      img.onerror = function() {
        handleImageError(this);
        
        // 减少当前加载计数并处理下一个图片
        currentLoadingCount--;
        processImageLoadingQueue();
      };
    };
    
    // 监听图像加载失败事件
    tempImg.onerror = function() {
      handleImageError(img);
      
      // 减少当前加载计数并处理下一个图片
      currentLoadingCount--;
      processImageLoadingQueue();
    };
    
    // 开始加载实际图片
    tempImg.src = src;
  }
  
  // 定期打印缓存统计信息（每加载10张图片）
  if ((cacheStats.hits + cacheStats.misses) % 10 === 0) {
    const stats = getCacheStats();
    console.log(`图片缓存统计: 命中率 ${Math.round(stats.hits / (stats.hits + stats.misses) * 100)}%, 缓存项 ${stats.entries}, 缓存大小 ${stats.sizeMB}MB`);
  }
}

// 预加载关键图片 - 优化版（支持缓存）
function preloadCriticalImages() {
  if (!currentWords || currentWords.length === 0) {
    console.log('没有需要预加载的单词图片');
    return;
  }
  
  try {
    // 增加预加载数量到10个，以覆盖更多可见区域内容
    const preloadCount = Math.min(10, currentWords.length);
    const criticalImages = currentWords.slice(0, preloadCount);
    
    // 创建预加载队列
    const preloadPromises = [];
    
    // 遍历关键图片并添加到预加载队列
    criticalImages.forEach((word, index) => {
      // 为预加载添加延时，避免同时请求过多资源
      const delay = index * 100; // 每100ms加载一个图片
      
      const preloadPromise = new Promise((resolve) => {
        setTimeout(() => {
          try {
            // 如果word本身就是一个单词对象
            let chinese = word.chinese;
            let category = word.category;
            
            // 检查word的结构，可能需要根据不同模式调整
            if (word.word) {
              // 复习模式下，word是一个包含word属性的对象
              chinese = word.word.chinese;
              category = word.word.category;
            }
            
            if (chinese && category) {
              const imagePath = getWordImagePath(chinese, category);
              
              // 首先检查图片是否已经在缓存中
              if (checkImageInCache(imagePath)) {
                console.log(`图片已在缓存中，跳过预加载: ${imagePath}`);
                cacheStats.hits++;
                resolve(true);
                return;
              }
              
              // 图片不在缓存中，进行预加载
              cacheStats.misses++;
              
              // 创建一个新的Image对象进行预加载
              const img = new Image();
              
              // 使用Image.decode()方法异步解码图片，避免阻塞主线程
              if (img.decode) {
                img.src = imagePath;
                
                // 先加载低质量图片作为占位符
                const lowQualityImg = new Image();
                lowQualityImg.src = imagePath;
                
                // 优先加载低质量图片
                lowQualityImg.onload = function() {
                  // 使用decode方法异步解码高质量图片
                  img.decode().then(() => {
                    // 将图片添加到缓存
                    addImageToCache(imagePath, imagePath);
                    console.log(`预加载图片成功: ${imagePath}`);
                    resolve(true);
                  }).catch(error => {
                    console.warn(`预加载图片解码失败: ${imagePath}`, error);
                    // 解码失败时使用普通加载
                    loadFallbackImage(imagePath, resolve);
                  });
                };
                
                lowQualityImg.onerror = function() {
                  console.warn(`预加载低质量图片失败: ${imagePath}`);
                  // 低质量加载失败时使用普通加载
                  loadFallbackImage(imagePath, resolve);
                };
              } else {
                // 对于不支持decode的浏览器，使用传统方式
                loadFallbackImage(imagePath, resolve);
              }
            } else {
              resolve(false);
            }
          } catch (error) {
            console.error(`预加载单词图片时出错: ${error.message}`);
            resolve(false);
          }
        }, delay);
      });
      
      preloadPromises.push(preloadPromise);
    });
    
    // 等待所有预加载完成
    Promise.all(preloadPromises).then(results => {
      const successCount = results.filter(Boolean).length;
      console.log(`成功预加载 ${successCount}/${preloadCount} 个关键图片`);
      
      // 打印缓存统计信息
      const stats = getCacheStats();
      console.log(`图片缓存统计: 命中率 ${Math.round(stats.hits / (stats.hits + stats.misses) * 100)}%, 缓存项 ${stats.entries}, 缓存大小 ${stats.sizeMB}MB`);
    });
  } catch (error) {
    console.error(`预加载关键图片时出错: ${error.message}`);
  }
}

// 备用图片加载函数，用于不支持decode的浏览器
function loadFallbackImage(imagePath, resolve) {
  // 检查图片是否在缓存中
  if (checkImageInCache(imagePath)) {
    console.log(`从缓存加载图片(备用方式): ${imagePath}`);
    cacheStats.hits++;
    resolve(true);
    return;
  }
  
  const img = new Image();
  
  // 预加载完成的回调
  img.onload = function() {
    // 将图片添加到缓存
    addImageToCache(imagePath, imagePath);
    cacheStats.misses++;
    
    console.log(`备用方式预加载图片成功: ${imagePath}`);
    resolve(true);
  };
  
  // 预加载失败的回调
  img.onerror = function() {
    console.warn(`备用方式预加载图片失败: ${imagePath}`);
    resolve(false);
  };
  
  // 设置图片源
  img.src = imagePath;
}

// 检查是否需要显示每日新单词提示
function checkDailyNewWordsPrompt() {
  // 只在每日推荐模式中显示提示
  const currentMode = document.getElementById('mode-selector').value;
  if (currentMode !== 'recommended') {
    return;
  }
  
  const now = new Date();
  const beijingTime = new Date(now.getTime() + (8 * 60 * 60 * 1000)); // 转换为北京时间
  
  // 显示对话框（临时移除localStorage检查以便测试）
  if (beijingTime.getHours() >= 0 && beijingTime.getHours() < 24) {
    // 显示自定义对话框
    const customDialog = document.getElementById('custom-dialog');
    const dialogYes = document.getElementById('dialog-yes');
    const dialogNo = document.getElementById('dialog-no');
    
    // 显示对话框并禁止背景滚动
    customDialog.style.display = 'flex';
    document.body.classList.add('no-scroll');
    
    // 确定按钮点击事件
    const handleYes = function() {
      // 移除事件监听器
      dialogYes.removeEventListener('click', handleYes);
      dialogNo.removeEventListener('click', handleNo);
      
      // 隐藏对话框并恢复背景滚动
      customDialog.style.display = 'none';
      document.body.classList.remove('no-scroll');
      
      // 用户点击确定，切换到每日推荐模式并生成新单词
      document.getElementById('mode-selector').value = 'recommended';
      initializeGame();
    };
    
    // 取消按钮点击事件
    const handleNo = function() {
      // 移除事件监听器
      dialogYes.removeEventListener('click', handleYes);
      dialogNo.removeEventListener('click', handleNo);
      
      // 隐藏对话框并恢复背景滚动
      customDialog.style.display = 'none';
      document.body.classList.remove('no-scroll');
      
      // 用户点击取消，添加"学习新单词"按钮
      addNewWordsButton();
    };
  
    // 添加事件监听器
    dialogYes.addEventListener('click', handleYes);
    dialogNo.addEventListener('click', handleNo);
  }
}

// 清除localStorage数据（用于测试）
function clearLocalStorageData() {
  try {
    localStorage.removeItem('dailyWords');
    localStorage.removeItem('dailyWordsDate');
    // 重置全局变量
    dailyWords = [];
    currentGroupIndex = 0;
    console.log('LocalStorage数据已清除，将重新生成每日单词');
  } catch (e) {
    console.error('清除localStorage数据时出错:', e);
  }
}

// 添加"学习新单词"按钮
function addNewWordsButton() {
  // 检查按钮是否已经存在
  if (document.getElementById('new-words-btn')) {
    return;
  }
  
  // 只在每日推荐模式中显示按钮
  const currentMode = document.getElementById('mode-selector').value;
  if (currentMode !== 'recommended') {
    return;
  }
  
  const controls = document.querySelector('.controls');
  const newWordsButton = document.createElement('button');
  newWordsButton.id = 'new-words-btn';
  newWordsButton.textContent = '学习新单词';
  newWordsButton.className = 'new-words-btn';
  
  // 添加点击事件
  newWordsButton.addEventListener('click', function() {
    document.getElementById('mode-selector').value = 'recommended';
    initializeGame();
    // 移除按钮
    this.remove();
  });
  
  // 添加到控制区域
  controls.appendChild(newWordsButton);
}

document.addEventListener('DOMContentLoaded', () => {
  loadErrorWords();
  // 初始化所有服务（推荐系统、云存储、WebSocket）
  initAllServices();
  initializeGame();
  setupEvents();
  // 设置懒加载
  setupLazyLoading();
  // 设置图片错误事件监听器
  setupImageErrorListeners();
  
  // 检查页面加载时是否为每日推荐模式，如果是，显示提示
  if (document.getElementById('mode-selector').value === 'recommended') {
    checkDailyNewWordsPrompt();
  }
});

function initializeGame() {
  const mode = document.getElementById('mode-selector').value;
  const categorySelector = document.getElementById('category-selector');
  
  // 确保阅读模式下类别选择器是启用的
  if (mode === 'reading') {
    categorySelector.disabled = false;
  }
  
  // 根据模式获取单词
  if (mode === 'reading') {
    // 阅读模式下，我们直接调用getRandomWords来获取文章数据
    currentWords = getRandomWords(0); // 0表示不限制数量
  } else {
    const count = mode === 'recommended' ? recommendedNumCards : numCards;
    currentWords = getRandomWords(count);
  }
  
  renderCards(currentWords);
  document.getElementById('result-container').innerHTML = '';
  
  // 预加载核心图片
  preloadCriticalImages();

  // 如果是复习模式且没有错误单词，显示提示
  if (mode === 'review' && currentWords.length === 0) {
    const cardsContainer = document.getElementById('cards-container');
    cardsContainer.innerHTML = `
      <div class="no-error-words">
        <h3>恭喜！没有需要复习的单词</h3>
        <p>你已经掌握了所有单词，继续保持！</p>
        <p>可以尝试其他模式进行练习。</p>
      </div>
    `;
  }
}

function setupEvents() {
    // 添加清除localStorage数据按钮
    const controls = document.querySelector('.controls');
    const clearDataButton = document.createElement('button');
    clearDataButton.id = 'clear-data-btn';
    clearDataButton.textContent = '重置每日单词';
    clearDataButton.className = 'btn clear-data-btn';
    clearDataButton.style.marginLeft = '10px';
    clearDataButton.style.backgroundColor = '#ff6b6b';
    
    // 添加点击事件
    clearDataButton.addEventListener('click', function() {
      clearLocalStorageData();
      initializeGame();
      alert('已重置每日单词数据，将生成新的单词组');
    });
    
    // 添加到控制区域
    controls.appendChild(clearDataButton);
    
    // 初始设置 - 只在每日推荐模式下显示
    const initialMode = document.getElementById('mode-selector').value;
    const isInitiallyRecommendedMode = initialMode === 'recommended';
    clearDataButton.style.display = isInitiallyRecommendedMode ? 'inline-block' : 'none';
    
    document.getElementById('mode-selector').addEventListener('change', function() {
      const categorySelector = document.getElementById('category-selector');
      if (this.value === 'category' || this.value === 'dictation' || this.value === 'review' || this.value === 'listening' || this.value === 'wordlist' || this.value === 'word-to-chinese' || this.value === 'reading') {
        categorySelector.disabled = false;
      } else {
        categorySelector.disabled = true;
      }
      
      // 控制按钮显示和隐藏
      const isReadingMode = this.value === 'reading';
      const isRecommendedMode = this.value === 'recommended';
      document.getElementById('new-game-btn').style.display = isReadingMode ? 'none' : 'inline-block';
      document.getElementById('show-all-btn').style.display = isReadingMode ? 'none' : 'inline-block';
      document.getElementById('submit-btn').style.display = isReadingMode ? 'none' : 'inline-block';
      document.getElementById('reset-btn').style.display = isReadingMode ? 'none' : 'inline-block';
      document.getElementById('next-group-btn').style.display = isRecommendedMode ? 'inline-block' : 'none';
      
      // 控制学习新单词按钮的显示/隐藏
      const newWordsBtn = document.getElementById('new-words-btn');
      if (newWordsBtn) {
        newWordsBtn.style.display = isRecommendedMode ? 'inline-block' : 'none';
      }
      
      // 控制重置每日单词按钮的显示/隐藏
      clearDataButton.style.display = isRecommendedMode ? 'inline-block' : 'none';
      
      // 重置当前组索引
      if (isRecommendedMode) {
        currentGroupIndex = 0;
        // 检查是否需要显示每日新单词提示
        checkDailyNewWordsPrompt();
      }
      
      initializeGame();
    });
    
    document.getElementById('category-selector').addEventListener('change', initializeGame);
    document.getElementById('new-game-btn').addEventListener('click', initializeGame);
    document.getElementById('show-all-btn').addEventListener('click', () =>
      document.querySelectorAll('.correct-answer').forEach(e => e.style.display = 'block')
    );
  document.getElementById('submit-btn').addEventListener('click', checkAnswers);
  document.getElementById('reset-btn').addEventListener('click', () =>
    document.querySelectorAll('.answer-input').forEach(i => {
      i.value = '';
      i.classList.remove('correct-input', 'wrong-input');
    })
  );
  
  // 添加下一组按钮事件监听
  document.getElementById('next-group-btn').addEventListener('click', () => {
    const mode = document.getElementById('mode-selector').value;
    if (mode === 'recommended' && hasNextGroup()) {
      currentGroupIndex++;
      initializeGame();
    }
  });
  
  // 确保页面加载时按钮状态正确
  const modeSelector = document.getElementById('mode-selector');
  const isReadingMode = modeSelector.value === 'reading';
  const isRecommendedMode = modeSelector.value === 'recommended';
  document.getElementById('new-game-btn').style.display = isReadingMode ? 'none' : 'inline-block';
  document.getElementById('show-all-btn').style.display = isReadingMode ? 'none' : 'inline-block';
  document.getElementById('submit-btn').style.display = isReadingMode ? 'none' : 'inline-block';
  document.getElementById('reset-btn').style.display = isReadingMode ? 'none' : 'inline-block';
  document.getElementById('next-group-btn').style.display = isRecommendedMode ? 'inline-block' : 'none';
  
  // 确保页面加载时学习新单词按钮状态正确
  const newWordsBtn = document.getElementById('new-words-btn');
  if (newWordsBtn) {
    newWordsBtn.style.display = isRecommendedMode ? 'inline-block' : 'none';
  }
}

function getRandomWords(count) {
  const mode = document.getElementById('mode-selector').value;
  let filteredWords = window.vocabularyList;

  if (mode === 'recommended') {
    // 每日推荐学习模式
    // 获取今日推荐单词
    getDailyRecommendedWords();
    // 返回当前组的单词
    return getCurrentGroupWords();
  } else if (mode === 'category') {
    const category = document.getElementById('category-selector').value;
    if (category !== 'all') {
      filteredWords = window.vocabularyList.filter(word => word.category === category);
    }
  } else if (mode === 'listening') {
    // 听音选单词模式下，我们根据类别筛选单词
    const category = document.getElementById('category-selector').value;
    if (category !== 'all') {
      filteredWords = window.vocabularyList.filter(word => word.category === category);
    }
  } else if (mode === 'dictation') {
    // 听写模式下，我们根据类别筛选单词
    const category = document.getElementById('category-selector').value;
    if (category !== 'all') {
      filteredWords = window.vocabularyList.filter(word => word.category === category);
    }
  } else if (mode === 'reading') {
    // 阅读模式下，我们返回文章数据
    const category = document.getElementById('category-selector').value;
    return getReadingArticles(category);
  } else if (mode === 'review') {
    // 复习模式下，我们使用错误单词
    const category = document.getElementById('category-selector').value;
    let errorWordsList = Object.values(errorWords).map(item => item.word);

    // 根据类别筛选错误单词
    if (category !== 'all') {
      errorWordsList = errorWordsList.filter(word => word.category === category);
    }

    if (errorWordsList.length > 0) {
      filteredWords = errorWordsList;
    } else {
      // 如果没有错误单词，显示提示
      filteredWords = [];
    }
  } else if (mode === 'wordlist') {
    // 单词表模式下，我们根据类别筛选单词但不随机选择
    const category = document.getElementById('category-selector').value;
    if (category !== 'all') {
      filteredWords = window.vocabularyList.filter(word => word.category === category);
    }
    // 按字母顺序排序
    filteredWords = filteredWords.sort((a, b) => a.english.localeCompare(b.english));
    return filteredWords;
  } else if (mode === 'word-to-chinese') {
    // 看单词选中文模式下，我们根据类别筛选单词
    const category = document.getElementById('category-selector').value;
    if (category !== 'all') {
      filteredWords = window.vocabularyList.filter(word => word.category === category);
    }
  }

  // 如果筛选后的单词数量不足，并且用户没有明确选择类别，才使用所有单词（复习模式和单词表模式除外）
  const category = document.getElementById('category-selector').value;
  if (filteredWords.length < count && mode !== 'review' && mode !== 'wordlist' && category === 'all') {
    filteredWords = window.vocabularyList;
  }

  // 对于复习模式，如果没有错误单词，返回空数组
  if (mode === 'review' && filteredWords.length === 0) {
    return [];
  }

  // 对于单词表模式，返回所有筛选后的单词
  if (mode === 'wordlist') {
    return filteredWords;
  }

  return [...filteredWords].sort(() => 0.5 - Math.random()).slice(0, count);
}

// 获取单词图片路径的函数 - 支持云存储
function getWordImagePath(chinese, category) {
  // 图片路径格式：/图库/类别名称/中文名称.png
  const categoryMap = {
    'animal': '动物类',
    'food': '食物类',
    'daily': '日常用品类',
    'color': '颜色类',
    'number': '数字类',
    'fruit': '水果类',
    'transport': '交通工具类',
    'body': '身体部位类',
    'family': '亲属类',
    'weather': '天气类',
    'action': '动作类',
    'emotion': '情感类'
  };
  
  const categoryName = categoryMap[category] || category;
  // 构造本地图片路径
  const localImagePath = `图库/${categoryName}/${chinese}.png`;
  
  // 检查是否存在全局云存储服务对象且为Promise
  if (window.cloudImageCache && window.cloudImageCache[localImagePath]) {
    return window.cloudImageCache[localImagePath];
  }
  
  // 如果没有云存储服务，返回本地路径
  return localImagePath;
}

// 初始化云存储服务
function initCloudStorage() {
  // 创建本地缓存对象
  if (!window.cloudImageCache) {
    window.cloudImageCache = {};
  }
  
  console.log('使用本地图片路径，跳过云存储初始化');
}

// 异步预加载图片到全局缓存
async function preloadImagesForWords(words) {
  if (!words || !Array.isArray(words)) {
    console.warn('preloadImagesForWords: words参数无效');
    return;
  }
  
  try {
    // 过滤出有效的单词对象
    const validWords = words.filter(word => word && word.chinese && word.category);
    
    if (validWords.length === 0) {
      console.log('没有有效的单词对象用于预加载图片');
      return;
    }
    
    // 创建预加载队列，每5张图片为一组进行加载，避免一次性请求过多资源
    const BATCH_SIZE = 5;
    let loadedCount = 0;
    
    for (let i = 0; i < validWords.length; i += BATCH_SIZE) {
      const batch = validWords.slice(i, i + BATCH_SIZE);
      
      const batchPromises = batch.map(word => {
        return new Promise(resolve => {
          const localImagePath = getWordImagePath(word.chinese, word.category);
          
          // 检查图片是否已经在缓存中
          if (checkImageInCache(localImagePath)) {
            console.log(`图片已在缓存中，跳过预加载: ${localImagePath}`);
            cacheStats.hits++;
            loadedCount++;
            resolve(true);
            return;
          }
          
          // 图片不在缓存中，进行预加载
          const img = new Image();
          
          img.onload = function() {
            // 将图片添加到缓存
            addImageToCache(localImagePath, localImagePath);
            cacheStats.misses++;
            loadedCount++;
            console.log(`成功预加载单词图片: ${word.chinese}`);
            resolve(true);
          };
          
          img.onerror = function() {
            console.warn(`预加载单词图片失败: ${localImagePath}`);
            resolve(false);
          };
          
          // 设置图片源
          img.src = localImagePath;
        });
      });
      
      // 等待当前批次加载完成
      await Promise.allSettled(batchPromises);
      
      // 批次之间添加短暂延迟，避免连续请求
      if (i + BATCH_SIZE < validWords.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    console.log(`成功预加载 ${loadedCount}/${validWords.length} 个单词的图片资源`);
    
    // 打印缓存统计信息
    const stats = getCacheStats();
    console.log(`图片缓存统计: 命中率 ${Math.round(stats.hits / (stats.hits + stats.misses) * 100)}%, 缓存项 ${stats.entries}, 缓存大小 ${stats.sizeMB}MB`);
  } catch (error) {
    console.error('批量预加载图片失败:', error);
  }
}

// 图片加载失败处理函数
function handleImageError(event) {
  try {
    const img = event.target || this;
    if (!img) {
      console.warn('Image element is undefined in handleImageError');
      return;
    }
    
    // 确保获取到wordName的健壮性
    let wordName = '未知单词';
    try {
      wordName = img.alt || img.dataset?.word || img.title || img.getAttribute?.('data-title') || '未知单词';
      // 如果wordName为空字符串，设置为'未知单词'
      if (!wordName || wordName.trim() === '') {
        wordName = '未知单词';
      }
    } catch (e) {
      wordName = '未知单词';
    }
    
    // 确保获取到imgSrc的健壮性
    const imgSrc = img.src || '';
    
    // 确定图片类别
    let category = 'other';
    try {
      if (img.classList?.contains('category-animal') || imgSrc.includes('动物类')) {
        category = 'animal';
      } else if (imgSrc.includes('食物类') || img.classList?.contains('category-food')) {
        category = 'food';
      } else if (imgSrc.includes('水果类') || img.classList?.contains('category-fruit')) {
        category = 'fruit';
      } else if (imgSrc.includes('日常用品类') || img.classList?.contains('category-daily')) {
        category = 'daily';
      } else if (imgSrc.includes('颜色类') || img.classList?.contains('category-color')) {
        category = 'color';
      } else if (imgSrc.includes('数字类') || img.classList?.contains('category-number')) {
        category = 'number';
      } else if (imgSrc.includes('交通工具类') || img.classList?.contains('category-transport')) {
        category = 'transport';
      } else if (imgSrc.includes('身体部位类') || img.classList?.contains('category-body')) {
        category = 'body';
      } else if (imgSrc.includes('亲属类') || img.classList?.contains('category-family')) {
        category = 'family';
      } else if (imgSrc.includes('天气类') || img.classList?.contains('category-weather')) {
        category = 'weather';
      } else if (imgSrc.includes('动作类') || img.classList?.contains('category-action')) {
        category = 'action';
      } else if (imgSrc.includes('情感类') || img.classList?.contains('category-emotion')) {
        category = 'emotion';
      }
    } catch (e) {
      category = 'other';
    }
    
    // 所有类别的emoji映射表
    const categoryEmojis = {
      'animal': {
        '企鹅': '🐧', '猴子': '🐵', '大象': '🐘', '狮子': '🦁', '老虎': '🐯', 
        '熊猫': '🐼', '熊': '🐻', '长颈鹿': '🦒', '斑马': '🦓', '河马': '🦛',
        '犀牛': '🦏', '鳄鱼': '🐊', '蛇': '🐍', '蜥蜴': '🦎', '青蛙': '🐸',
        '海龟': '🐢', '鸟': '🐦', '鸽子': '🕊️', '猫头鹰': '🦉', '鹦鹉': '🦜',
        '孔雀': '🦚', '鸭子': '🦆', '鹅': '🦢', '鸡': '🐔', '火烈鸟': '🦩',
        '企鹅': '🐧', '鱼': '🐟', '海豚': '🐬', '鲸鱼': '🐳', '鲨鱼': '🦈',
        '螃蟹': '🦀', '龙虾': '🦞', '章鱼': '🐙', '贝壳': '🐚', '蝴蝶': '🦋', // 蝴蝶
        '蜜蜂': '🐝', '蚂蚁': '🐜', '蜘蛛': '🕷️', '苍蝇': '🪰', '蚊子': '🦟',
        '蟑螂': '🪳', '小鸟': '🐦', '猫': '🐱', '狗': '🐶', '兔子': '🐰',
        '老鼠': '🐭', '仓鼠': '🐹', '猪': '🐷', '牛': '🐮', '羊': '🐏',
        '马': '🐴', '鹿': '🦌'
      },
      'food': {
        '米饭': '🍚', '面条': '🍜', '面包': '🍞', '蛋糕': '🎂', '饼干': '🍪',
        '糖果': '🍬', '巧克力': '🍫', '冰淇淋': '🍦', '奶酪': '🧀', '鸡蛋': '🥚',
        '牛奶': '🥛', '咖啡': '☕', '茶': '🍵', '果汁': '🍹', '可乐': '🥤',
        '水': '💧', '汤': '🍲', '沙拉': '🥗', '三明治': '🥪', '汉堡': '🍔',
        '披萨': '🍕', '热狗': '🌭', '炸鸡': '🍗', '牛排': '🥩', '鱼肉': '🐟',
        '蔬菜': '🥬', '水果': '🍎', '坚果': '🌰', '番茄酱': '🍅', '酱油': '🧂',
        '盐': '🧂', '糖': '🍬', '油': '🫙'
      },
      'fruit': {
        '苹果': '🍎', '香蕉': '🍌', '橙子': '🍊', '梨': '🍐', '葡萄': '🍇',
        '草莓': '🍓', '蓝莓': '🫐', '桃子': '🍑', '樱桃': '🍒', '西瓜': '🍉',
        '哈密瓜': '🍈', '芒果': '🥭', '菠萝': '🍍', '猕猴桃': '🥝', '柠檬': '🍋',
        '椰子': '🥥', '石榴': '🍅', '荔枝': '🍓', '龙眼': '🍓', '柿子': '🍅'
      },
      'daily': {
        '书包': '🎒', '铅笔': '✏️', '钢笔': '🖊️', '书': '📚', '笔记本': '📓',
        '纸': '📄', '橡皮': '🧽', '尺子': '📏', '圆规': '📐', '剪刀': '✂️',
        '胶水': '🩹', '胶带': '🧻', '杯子': '🥤', '盘子': '🍽️', '碗': '🥣',
        '勺子': '🥄', '叉子': '🍴', '刀': '🔪', '筷子': '🥢', '锅': '🍳',
        '盘子': '🍽️', '杯子': '🥤', '牙刷': '🪥', '牙膏': '🧴', '毛巾': '🧼',
        '肥皂': '🧼', '洗发水': '🧴', '沐浴露': '🧴', '衣服': '👕', '裤子': '👖',
        '鞋子': '👟', '帽子': '🧢', '袜子': '🧦', '手套': '🧤', '围巾': '🧣',
        '雨伞': '☂️', '钟表': '⏰', '眼镜': '👓', '手机': '📱', '电脑': '💻',
        '电视': '📺', '冰箱': '🧊', '洗衣机': '🧺', '吹风机': '💨', '镜子': '🪞'
      },
      'color': {"red":"🔴", "blue":"🔵", "green":"🟢", "yellow":"🟡", "purple":"🟣",
        '红色': '🔴', '蓝色': '🔵', '绿色': '🟢', '黄色': '🟡', '紫色': '🟣',
        '橙色': '🟠', '黑色': '⚫', '白色': '⚪', '灰色': '🔘', '粉色': '💖',
        '棕色': '🟤', '金色': '🟡', '银色': '⚪'
      },
      'number': {"one":"1️⃣", "two":"2️⃣", "three":"3️⃣", "four":"4️⃣", "five":"5️⃣",
        '一': '1️⃣', '二': '2️⃣', '三': '3️⃣', '四': '4️⃣', '五': '5️⃣',
        '六': '6️⃣', '七': '7️⃣', '八': '8️⃣', '九': '9️⃣', '十': '🔟',
        '十一': '1️⃣1️⃣', '十二': '1️⃣2️⃣', '十三': '1️⃣3️⃣', '十四': '1️⃣4️⃣', '十五': '1️⃣5️⃣',
        '十六': '1️⃣6️⃣', '十七': '1️⃣7️⃣', '十八': '1️⃣8️⃣', '十九': '1️⃣9️⃣'
      },
      'transport': {"car":"🚗", "bus":"🚌", "taxi":"🚕", "train":"🚂", "plane":"✈️",
        '汽车': '🚗', '公交车': '🚌', '出租车': '🚕', '火车': '🚂', '飞机': '✈️',
        '轮船': '🚢', '自行车': '🚲', '摩托车': '🏍️', '地铁': '🚇', '高铁': '🚄',
        '卡车': '🚚', '救护车': '🚑', '消防车': '🚒', '警车': '🚓', '直升机': '🚁'
      },
      'body': {"head":"👨", "eye":"👁️", "nose":"👃", "mouth":"👄", "ear":"👂",
        '头': '👨', '眼睛': '👁️', '鼻子': '👃', '嘴巴': '👄', '耳朵': '👂',
        '脸': '😊', '头发': '👩', '脖子': '🧍', '肩膀': '💪', '手臂': '💪',
        '手': '🖐️', '手指': '🖕', '腿': '🦵', '脚': '🦶', '脚趾': '🦶',
        '心脏': '❤️', '胃': '🫀', '肝脏': '🫀', '肺': '🫁', '脑': '🧠'
      },
      'family': {"father":"👨", "mother":"👩", "brother":"👦", "sister":"👧", "grandfather":"👴",
        '爸爸': '👨', '妈妈': '👩', '哥哥': '👦', '姐姐': '👧', '弟弟': '👦',
        '妹妹': '👧', '爷爷': '👴', '奶奶': '👵', '叔叔': '👨', '阿姨': '👩',
        '堂兄弟': '👦', '堂姐妹': '👧', '表兄弟': '👦', '表姐妹': '👧', '儿子': '👶',
        '女儿': '👶', '丈夫': '👨', '妻子': '👩', '朋友': '👫'
      },
      'weather': {"sun":"☀️", "moon":"🌙", "star":"⭐", "cloud":"☁️", "rain":"🌧️",
        '太阳': '☀️', '月亮': '🌙', '星星': '⭐', '云': '☁️', '雨': '🌧️',
        '雪': '❄️', '风': '💨', '雷': '⚡', '彩虹': '🌈', '雾': '🌫️',
        '晴天': '☀️', '多云': '⛅', '阴天': '☁️', '雨天': '🌧️', '雪天': '❄️'
      },
      'action': {"run":"🏃", "walk":"🚶", "jump":"💃", "climb":"🧗", "swim":"🏊",
        '跑': '🏃', '走': '🚶', '跳': '💃', '爬': '🧗', '游泳': '🏊',
        '飞': '✈️', '吃': '🍽️', '喝': '🥤', '睡': '😴', '哭': '😭',
        '笑': '😄', '唱': '🎤', '跳': '💃', '写': '✍️', '读': '📚',
        '听': '👂', '看': '👀', '说': '💬', '想': '🤔', '做': '👷'
      },
      'emotion': {"happy":"😄", "sad":"😢", "angry":"😠", "scared":"😨", "surprised":"😲",
        '开心': '😄', '难过': '😢', '生气': '😠', '害怕': '😨', '惊讶': '😲',
        '兴奋': '🤩', '伤心': '😢', '无聊': '😴', '疲惫': '🥱', '害羞': '😊',
        '爱': '❤️', '恨': '😡', '喜欢': '😍', '讨厌': '😒', '平静': '😌'
      },
      'other': {
        '默认': '📷',
        '未知单词': '📷',
        '': '📷' // 空字符串的默认表情
      }
    };
    
    // 获取对应的emoji，增强错误处理
    let emoji = '📷';
    try {
      const emojis = categoryEmojis[category] || categoryEmojis['other'] || {};
      emoji = emojis[wordName] || emojis['默认'] || '📷';
    } catch (e) {
      emoji = '📷';
    }
    
    // 创建一个包含emoji和名称的占位div
    const placeholder = document.createElement('div');
    placeholder.className = `image-placeholder category-${category}`;
    placeholder.innerHTML = `
      <div class="emoji-display">${emoji}</div>
      <div class="word-name">${wordName}</div>
    `;
    
    // 替换图片元素
    if (img && img.parentNode) {
      img.parentNode.insertBefore(placeholder, img);
      img.style.display = 'none';
    }
  } catch (error) {
    console.error('图片错误处理过程中发生错误:', error);
    // 创建一个简单的占位div作为最后的备选方案
    try {
      const img = event.target || this;
      if (img && img.parentNode) {
        const fallbackPlaceholder = document.createElement('div');
        fallbackPlaceholder.className = 'image-placeholder category-other';
        fallbackPlaceholder.innerHTML = `
          <div class="emoji-display">📷</div>
          <div class="word-name">图片无法显示</div>
        `;
        img.parentNode.insertBefore(fallbackPlaceholder, img);
        img.style.display = 'none';
      }
    } catch (fallbackError) {
      console.error('备用错误处理也失败:', fallbackError);
    }
  }
}

// 添加图片错误事件监听器
function setupImageErrorListeners() {
  // 为已存在的图片添加事件监听器
  document.querySelectorAll('img').forEach(img => {
    // 移除内联onerror属性
    if (img.hasAttribute('onerror')) {
      img.removeAttribute('onerror');
    }
    // 添加事件监听器
    img.addEventListener('error', handleImageError);
  });
  
  // 使用MutationObserver监听新添加的图片元素
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === 1) { // 元素节点
          // 检查当前节点是否为图片
          if (node.tagName === 'IMG') {
            // 移除内联onerror属性
            if (node.hasAttribute('onerror')) {
              node.removeAttribute('onerror');
            }
            // 添加事件监听器
            node.addEventListener('error', handleImageError);
          }
          // 检查子节点中是否有图片
          node.querySelectorAll('img').forEach(img => {
            // 移除内联onerror属性
            if (img.hasAttribute('onerror')) {
              img.removeAttribute('onerror');
            }
            // 添加事件监听器
            img.addEventListener('error', handleImageError);
          });
        }
      });
    });
  });
  
  // 开始观察文档变化
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

function addCategoryImageStyles() {
  const style = document.createElement('style');
  style.textContent = `
    /* 通用图片占位符样式 */
    .image-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 100px;
      height: 100px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      background-color: #f9f9f9;
      position: relative;
      overflow: hidden;
      transition: all 0.3s ease;
    }
    
    /* 不同类别的特殊样式 */
    .image-placeholder.category-animal {
      background-color: #e8f5e9;
      border-color: #4caf50;
    }
    
    .image-placeholder.category-food {
      background-color: #fff3e0;
      border-color: #ff9800;
    }
    
    .image-placeholder.category-fruit {
      background-color: #e3f2fd;
      border-color: #2196f3;
    }
    
    .image-placeholder.category-daily {
      background-color: #f3e5f5;
      border-color: #9c27b0;
    }
    
    .image-placeholder.category-color {
      background-color: #fafafa;
      border-color: #607d8b;
    }
    
    .image-placeholder.category-number {
      background-color: #e0f7fa;
      border-color: #00bcd4;
    }
    
    .image-placeholder.category-transport {
      background-color: #f1f8e9;
      border-color: #8bc34a;
    }
    
    .image-placeholder.category-body {
      background-color: #fff8e1;
      border-color: #ffeb3b;
    }
    
    .image-placeholder.category-family {
      background-color: #fce4ec;
      border-color: #e91e63;
    }
    
    .image-placeholder.category-weather {
      background-color: #e1f5fe;
      border-color: #03a9f4;
    }
    
    .image-placeholder.category-action {
      background-color: #ede7f6;
      border-color: #673ab7;
    }
    
    .image-placeholder.category-emotion {
      background-color: #f3e5f5;
      border-color: #9575cd;
    }
    
    /* Emoji显示样式 */
    .emoji-display {
      font-size: 32px;
      margin-bottom: 4px;
    }
    
    /* 单词名称样式 */
    .word-name {
      font-size: 12px;
      color: #333;
      text-align: center;
      max-width: 90%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    
    /* 图片加载状态样式 */
    .word-image {
      transition: all 0.3s ease;
    }
    
    .word-image.loading {
      opacity: 0.5;
      filter: blur(2px);
    }
    
    /* 图片悬停效果 */
    .word-image:hover {
      transform: scale(1.05);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }
    
    /* 占位符悬停效果 */
    .image-placeholder:hover {
      transform: scale(1.05);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }
  `;
  document.head.appendChild(style);
}

function speakWord(word) {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    speechSynthesis.speak(utterance);
  }
}

// 语音识别功能 - 将语音转换为文本
function startVoiceRecognition(inputElement, buttonElement = null) {
  // 检查浏览器是否支持语音识别
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    alert('抱歉，您的浏览器不支持语音识别功能');
    return;
  }

  // 先请求麦克风权限，避免直接启动识别时的权限错误
  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(function(stream) {
      // 释放麦克风资源，因为我们只是用它来请求权限
      stream.getTracks().forEach(track => track.stop());

      // 创建语音识别实例
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      // 设置识别参数
      recognition.lang = 'en-US'; // 使用英语识别
      recognition.interimResults = false; // 不返回中间结果
      recognition.maxAlternatives = 1; // 只返回一个最佳结果
      
      // 开始识别前的UI反馈
      inputElement.placeholder = "正在聆听...请说出单词...";
      inputElement.classList.add('listening');
      if (buttonElement) {
        buttonElement.classList.add('listening');
      }
      
      // 识别成功时的处理
      recognition.onresult = function(event) {
        // 获取识别结果
        const transcript = event.results[0][0].transcript;
        // 填充到输入框
        inputElement.value = transcript;
        // 恢复UI
        inputElement.placeholder = "输入英文单词";
        inputElement.classList.remove('listening');
        if (buttonElement) {
          buttonElement.classList.remove('listening');
        }
      };
      
      // 识别错误时的处理
      recognition.onerror = function(event) {
        console.error('语音识别错误:', event.error);
        
        // 根据错误类型提供更具体的提示
        let errorMessage = "识别失败，请重试或手动输入";
        if (event.error === 'not-allowed') {
          errorMessage = "请先授予麦克风访问权限";
          // 提示用户如何启用麦克风权限
          setTimeout(() => {
            alert('请在浏览器地址栏旁边的锁图标处启用麦克风权限，然后重试语音输入功能。');
          }, 100);
        } else if (event.error === 'no-speech') {
          errorMessage = "未检测到语音，请再说一遍";
        } else if (event.error === 'audio-capture') {
          errorMessage = "未检测到麦克风设备";
        }
        
        inputElement.placeholder = errorMessage;
        inputElement.classList.remove('listening');
        if (buttonElement) {
          buttonElement.classList.remove('listening');
        }
      };
      
      // 识别结束时的处理（无论成功或失败）
      recognition.onend = function() {
        if (inputElement.classList.contains('listening')) {
          inputElement.placeholder = "输入英文单词";
          inputElement.classList.remove('listening');
          if (buttonElement) {
            buttonElement.classList.remove('listening');
          }
        }
      };
      
      // 开始语音识别
      recognition.start();
    })
    .catch(function(err) {
      console.error('获取麦克风权限失败:', err);
      
      let errorMessage = "请先授予麦克风访问权限";
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage = "请在浏览器地址栏旁边的锁图标处启用麦克风权限";
      } else if (err.name === 'NotFoundError') {
        errorMessage = "未检测到麦克风设备";
      }
      
      inputElement.placeholder = errorMessage;
      
      // 显示详细的权限说明
      setTimeout(() => {
        alert('语音识别需要麦克风权限，请在浏览器设置中允许此网站访问您的麦克风。\n\n提示：您可以点击浏览器地址栏旁边的锁图标来管理权限设置。');
      }, 100);
    });
}

// 阅读文章时的朗读功能，包含关键词高亮
function readAloudArticle(content) {
  if (!('speechSynthesis' in window)) {
    return;
  }

  // 停止任何正在进行的语音合成
  speechSynthesis.cancel();

  // 创建语音实例
  const utterance = new SpeechSynthesisUtterance(content);
  utterance.lang = 'en-US';
  utterance.rate = 0.9; // 调整语速

  // 当前朗读的段落索引
  let currentParagraphIndex = 0;
  let paragraphs = content.split('\n');
  
  // 移除空段落
  paragraphs = paragraphs.filter(p => p.trim().length > 0);

  // 当语音开始时
  utterance.onstart = function() {
    // 高亮当前段落
    highlightCurrentParagraph(currentParagraphIndex);
  };

  // 当语音暂停时
  utterance.onpause = function() {
    unhighlightAllParagraphs();
  };

  // 当语音恢复时
  utterance.onresume = function() {
    highlightCurrentParagraph(currentParagraphIndex);
  };

  // 当语音结束时
  utterance.onend = function() {
    unhighlightAllParagraphs();
  };

  // 开始朗读
  speechSynthesis.speak(utterance);
}

// 高亮当前朗读的段落
function highlightCurrentParagraph(index) {
  const paragraphs = document.querySelectorAll('.reading-content p');
  if (index >= 0 && index < paragraphs.length) {
    paragraphs[index].classList.add('highlight');
  }
}

// 移除所有段落的高亮
function unhighlightAllParagraphs() {
  document.querySelectorAll('.reading-content p').forEach(p => {
    p.classList.remove('highlight');
  });
}

function getRandomOptions(correctAnswer, count) {
  // 获取不包含正确答案的随机单词
  const mode = document.getElementById('mode-selector').value;
  let filteredWords = window.vocabularyList;

  // 如果是听音选单词模式且选择了类别，只从该类别中获取干扰选项
  if (mode === 'listening') {
    const category = document.getElementById('category-selector').value;
    if (category !== 'all') {
      filteredWords = window.vocabularyList.filter(word => word.category === category);
    }
  }

  const otherWords = filteredWords
    .filter(word => word.english.toLowerCase() !== correctAnswer.toLowerCase())
    .map(word => word.english);

  // 随机选择指定数量的单词
  const randomWords = [...otherWords].sort(() => 0.5 - Math.random()).slice(0, count);

  // 将正确答案添加到选项中并打乱顺序
  const allOptions = [correctAnswer, ...randomWords].sort(() => 0.5 - Math.random());

  return allOptions;
}

function getRandomChineseOptions(correctAnswer, count) {
  // 获取不包含正确答案的随机中文
  const mode = document.getElementById('mode-selector').value;
  let filteredWords = window.vocabularyList;

  // 如果是看单词选中文模式且选择了类别，只从该类别中获取干扰选项
  if (mode === 'word-to-chinese') {
    const category = document.getElementById('category-selector').value;
    if (category !== 'all') {
      filteredWords = window.vocabularyList.filter(word => word.category === category);
    }
  }

  const otherWords = filteredWords
    .filter(word => word.chinese !== correctAnswer)
    .map(word => word.chinese);

  // 随机选择指定数量的中文
  const randomWords = [...otherWords].sort(() => 0.5 - Math.random()).slice(0, count);

  // 将正确答案添加到选项中并打乱顺序
  const allOptions = [correctAnswer, ...randomWords].sort(() => 0.5 - Math.random());

  return allOptions;
}

function getCategoryName(categoryCode) {
  const categories = {
    'animal': '动物',
    'food': '食物',
    'daily': '日常用品',
    'color': '颜色',
    'number': '数字',
    'fruit': '水果',
    'transport': '交通工具',
    'body': '身体部位',
    'family': '亲属',
    'weather': '天气',
    'action': '动作',
    'emotion': '情感'
  };
  return categories[categoryCode] || categoryCode;
}

function checkAnswers() {
  let correctCount = 0;
  const totalCount = currentWords.length;
  const mode = document.getElementById('mode-selector').value;
  
  document.querySelectorAll('.answer-input').forEach(input => {
    const index = parseInt(input.dataset.index);
    const userAnswer = input.value.trim().toLowerCase();
    const correctAnswer = currentWords[index].english.toLowerCase();
    const wordId = currentWords[index].english.toLowerCase() + '-' + currentWords[index].category;
    
    if (userAnswer === correctAnswer) {
      input.classList.add('correct-input');
      input.classList.remove('wrong-input');
      correctCount++;
      // 如果答案正确，从错误单词列表中移除
      if (errorWords[wordId]) {
        delete errorWords[wordId];
      }
      
      // 更新推荐系统的学习历史（答对）
      if (window.RecommendationSystem && typeof window.RecommendationSystem.updateLearningHistory === 'function') {
        try {
          window.RecommendationSystem.updateLearningHistory(currentWords[index], true);
        } catch (e) {
          console.error('更新推荐系统学习历史失败:', e);
        }
      }
    } else {
      input.classList.add('wrong-input');
      input.classList.remove('correct-input');
      // 如果答案错误，添加或更新错误单词记录
      errorWords[wordId] = errorWords[wordId] || { word: { ...currentWords[index] }, errorCount: 0 };
      errorWords[wordId].errorCount++;
      // 记录最后错误时间，用于推荐算法
      errorWords[wordId].lastErrorTime = new Date().toISOString();
      
      // 更新推荐系统的学习历史（答错）
      if (window.RecommendationSystem && typeof window.RecommendationSystem.updateLearningHistory === 'function') {
        try {
          window.RecommendationSystem.updateLearningHistory(currentWords[index], false);
        } catch (e) {
          console.error('更新推荐系统学习历史失败:', e);
        }
      }
    }
  });
  
  // 保存错误单词
  saveErrorWords();
  
  // 计算正确率和进度
  const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
  
  // 发送学习进度到WebSocket服务
  if (window.WebSocketService && typeof window.WebSocketService.sendLearningProgress === 'function') {
    try {
      window.WebSocketService.sendLearningProgress(accuracy);
    } catch (e) {
      console.error('发送学习进度失败:', e);
    }
  }
  
  // 发送分数更新到WebSocket服务
  if (window.WebSocketService && typeof window.WebSocketService.sendScoreUpdate === 'function') {
    try {
      window.WebSocketService.sendScoreUpdate(correctCount, totalCount);
    } catch (e) {
      console.error('发送分数更新失败:', e);
    }
  }
  
  // 显示结果
  const resultContainer = document.getElementById('result-container');
  
  if (mode === 'recommended') {
    // 每日推荐学习模式的特殊结果显示
    const hasMoreGroups = hasNextGroup();
    resultContainer.innerHTML = `
      <div class="result-summary">
        <h3>答题结果</h3>
        <p>答对 ${correctCount} 题，答错 ${totalCount - correctCount} 题</p>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${(correctCount / totalCount) * 100}%"></div>
        </div>
        ${hasMoreGroups ? '<p class="next-group-hint">点击下方"下一组"按钮继续学习</p>' : '<p class="complete-hint">恭喜您完成了今日全部学习任务！</p>'}
      </div>
    `;
    
    // 确保下一组按钮正确显示
    document.getElementById('next-group-btn').style.display = hasMoreGroups ? 'inline-block' : 'none';
  } else {
    // 其他模式的常规结果显示
    resultContainer.innerHTML = `
      <div class="result-summary">
        <h3>答题结果</h3>
        <p>答对 ${correctCount} 题，答错 ${totalCount - correctCount} 题</p>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${(correctCount / totalCount) * 100}%"></div>
        </div>
      </div>
    `;
  }
}

function showListeningResults() {
  const resultContainer = document.getElementById('result-container');
  const correct = window.listeningAnswers.correct;
  const total = window.listeningAnswers.total;
  
  resultContainer.innerHTML = `
    <div class="result-summary">
      <h3>答题结果</h3>
      <p>答对 ${correct} 题，答错 ${total - correct} 题</p>
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${(correct / total) * 100}%"></div>
      </div>
    </div>
  `;
}

function renderCards(words) {
  const container = document.getElementById('cards-container');
  container.innerHTML = '';
  const mode = document.getElementById('mode-selector').value;

  // 非阅读模式 - 恢复卡片容器的原始网格布局样式
  if (mode !== 'reading') {
    container.style.display = 'grid';
    container.style.gridTemplateColumns = 'repeat(auto-fill, minmax(280px, 1fr))';
    container.style.gap = '25px';
  }

  // 初始化答题状态跟踪
  if (mode === 'listening' || mode === 'word-to-chinese') {
    window.listeningAnswers = { total: words.length, correct: 0, completed: 0 };
  }

  if (mode === 'reading') {
    // 阅读模式 - 调整容器样式以避免卡片重叠
    container.style.display = 'block';
    container.style.gridTemplateColumns = 'none';
    container.style.gap = '0';
      
    if (words.length === 0) {
      container.innerHTML = `
        <div class="no-words-message">
          <h3>请自选阅读类别</h3>
          <p>请从上方选择您想阅读的类别。</p>
        </div>
      `;
      return;
    }

    // 渲染阅读文章
    words.forEach(article => {
      const card = document.createElement('div');
      card.className = 'reading-card';
      
      // 将文章内容按换行符分割并处理关键词
      const paragraphs = article.content.split('\n').map(paragraph => {
        if (!paragraph.trim()) return '';
        
        // 处理关键词高亮
        let processedParagraph = paragraph;
        article.keyWords.forEach(keyword => {
          // 改进的正则表达式，支持：
          // 1. 普通单词：被空格包围的关键词
          // 2. 被方括号包裹的关键词：如[Yellow]、[Blue]
          // 3. 句子开头或结尾的关键词
          // 4. 被标点符号包围的关键词
          const regex = new RegExp(`(^|\\s|\\[)(${keyword})(\\s|\\]|,|\\.|!|\\?)`, 'gi');
          processedParagraph = processedParagraph.replace(regex, '$1<span class="keyword" data-keyword="$2">$2</span>$3');
        });
        
        return `<p>${processedParagraph}</p>`;
      }).join('');
      
      card.innerHTML = `
        <div class="reading-header">
          <h2>${article.title}</h2>
          <h3>${article.titleChinese}</h3>
          <div class="reading-category">${getCategoryName(article.category)}</div>
        </div>
        <div class="reading-content">
          ${paragraphs}
        </div>
        <div class="reading-actions">
          <button class="read-aloud-btn">🔊 朗读全文</button>
          <button class="show-vocab-btn">📚 查看词汇</button>
        </div>
        <div class="vocab-list" style="display: none;">
          <h4>重点词汇</h4>
          <div class="vocab-items">
            ${article.keyWords.map(keyword => {
              // 查找对应的中文翻译
              const wordEntry = window.vocabularyList.find(word => 
                word.english.toLowerCase() === keyword.toLowerCase() || 
                word.english.toLowerCase() === keyword.toLowerCase().replace(/\s/g, '')
              );
              
              // 如果找到对应的词汇条目，获取图片路径
              let imageHtml = '';
              let dataTitle = '';
              if (wordEntry) {
                const imagePath = getWordImagePath(wordEntry.chinese, wordEntry.category);
                const categoryClass = `category-${wordEntry.category}`;
                // 统一使用懒加载机制，与其他模式保持一致
                imageHtml = `<img data-src="${imagePath}" src="${TRANSPARENT_PLACEHOLDER}" alt="${wordEntry.chinese}" class="vocab-image word-image ${categoryClass} loading" onerror="handleImageError(this)" title="${wordEntry.chinese}" data-title="${wordEntry.chinese}" data-word="${wordEntry.chinese}">`;
                dataTitle = wordEntry.chinese;
              }
              
              return `
                <div class="vocab-item">
                  <span class="vocab-keyword" title="${dataTitle}" data-title="${dataTitle}">${keyword}</span>
                  ${imageHtml}
                  <button class="vocab-speaker" data-word="${keyword}" title="${dataTitle}">🔈</button>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
      
      container.appendChild(card);
      
      // 添加朗读全文按钮事件
      card.querySelector('.read-aloud-btn').addEventListener('click', function() {
        readAloudArticle(article.content);
      });
      
      // 添加查看词汇按钮事件
      card.querySelector('.show-vocab-btn').addEventListener('click', function() {
        const vocabList = card.querySelector('.vocab-list');
        vocabList.style.display = vocabList.style.display === 'none' ? 'block' : 'none';
        this.textContent = vocabList.style.display === 'none' ? '📚 查看词汇' : '📚 隐藏词汇';
      });
      
      // 添加词汇发音按钮事件
      card.querySelectorAll('.vocab-speaker').forEach(btn => {
        btn.addEventListener('click', function() {
          speakWord(this.dataset.word);
        });
      });
      
      // 添加词汇项点击事件，显示中文释义
      card.querySelectorAll('.vocab-item').forEach(item => {
        item.addEventListener('click', function() {
          const keyword = this.querySelector('.vocab-keyword');
          const chineseMeaning = keyword.dataset.title || '';
          
          // 创建或获取答案显示元素
          let answerDisplay = this.querySelector('.chinese-answer');
          if (!answerDisplay) {
            answerDisplay = document.createElement('span');
            answerDisplay.className = 'chinese-answer';
            this.appendChild(answerDisplay);
          }
          
          // 切换答案显示状态
          if (answerDisplay.textContent === chineseMeaning) {
            answerDisplay.textContent = '';
          } else {
            answerDisplay.textContent = chineseMeaning;
          }
        });
      });
      
      // 添加关键词点击发音事件
      card.querySelectorAll('.keyword').forEach(span => {
        span.addEventListener('click', function() {
          speakWord(this.dataset.keyword);
        });
      });
    });
    
    // 重新应用懒加载逻辑，确保新添加的图片也能被观察
    setupLazyLoading();
  } else if (mode === 'wordlist') {
    // 单词表模式
    if (words.length === 0) {
      container.innerHTML = `
        <div class="no-words-message">
          <h3>没有找到单词</h3>
          <p>请选择其他类别查看单词。</p>
        </div>
      `;
      return;
    }

    // 使用两列布局的卡片样式
    words.forEach((w, i) => {
      const card = document.createElement('div');
      card.className = 'word-card two-column-card';
      const imagePath = getWordImagePath(w.chinese, w.category);
      const categoryClass = `category-${w.category}`;
      
      card.innerHTML = `
        <div class="left-column">
          <div class="word-index">${i+1}</div>
          <div class="english-word">${w.english}</div>
          <button class="speaker-btn wordlist-speaker" data-word="${w.english}">🔈</button>
        </div>
        <div class="right-column">
            <div class="chinese-image">
              <img data-src="${imagePath}" src="${TRANSPARENT_PLACEHOLDER}" alt="${w.chinese}" class="word-image ${categoryClass} loading" onerror="handleImageError(this)" data-word="${w.chinese}">
            </div>
            <div class="phonetic">${w.phonetic}</div>
          <div class="category">${getCategoryName(w.category)}</div>
        </div>
      `;
      
      container.appendChild(card);
      card.querySelector('.wordlist-speaker').addEventListener('click', function() {
        speakWord(this.dataset.word);
      });
    });

    // 添加发音按钮事件
    document.querySelectorAll('.wordlist-speaker').forEach(btn => {
      btn.addEventListener('click', function() {
        speakWord(this.dataset.word);
      });
    });
    
    // 重新应用懒加载逻辑，确保新添加的图片也能被观察
    setupLazyLoading();
  } else {
    // 其他模式
    words.forEach((w, i) => {
      const card = document.createElement('div');
      card.className = 'word-card';
      const wordId = w.english.toLowerCase() + '-' + w.category;
      const errorCount = errorWords[wordId] ? errorWords[wordId].errorCount : 0;
      const imagePath = getWordImagePath(w.chinese, w.category);
      const categoryClass = `category-${w.category}`;

      if (mode === 'listening') {
        // 听音选单词模式
        const options = getRandomOptions(w.english, 3);
        card.innerHTML = `
          <div class="card-header"><div class="word-index">${i+1}</div><button class="speaker-btn dictation-btn">🔈</button></div>
          <div class="chinese-image">
            <img data-src="${imagePath}" src="${TRANSPARENT_PLACEHOLDER}" alt="${w.chinese}" class="word-image ${categoryClass} loading" onerror="handleImageError(this)" data-word="${w.chinese}">
          </div>
          <div class="phonetic">${w.phonetic}</div>
          <div class="listening-options">
            ${options.map(option => `
              <button class="option-btn" data-answer="${option}" data-index="${i}">${option}</button>
            `).join('')}
          </div>
          <div class="correct-answer">正确答案: <strong>${w.english}</strong> (${w.chinese})</div>
          <div class="answer-status"></div>`;
      } else if (mode === 'dictation') {
        // 听写模式
        card.innerHTML = `
          <div class="card-header"><div class="word-index">${i+1}</div><button class="speaker-btn dictation-btn">🔈</button></div>
          <div class="dictation-prompt">听发音，写出单词</div>
          <div class="input-container"><input type="text" class="answer-input" data-index="${i}" placeholder="输入英文单词">
          <button class="voice-input-btn" data-index="${i}">🎤</button>
          <button class="show-answer-btn dictation-btn">显示答案</button></div>
          <div class="correct-answer">正确答案: <strong>${w.english}</strong> (${w.chinese} <img data-src="${imagePath}" src="${TRANSPARENT_PLACEHOLDER}" alt="${w.chinese}" class="mini-image word-image ${categoryClass} loading" onerror="handleImageError(this)" data-word="${w.chinese}"> ${w.phonetic})</div>`;
      } else if (mode === 'review') {
        // 复习模式
        card.innerHTML = `
          <div class="card-header"><div class="word-index">${i+1}</div><button class="speaker-btn">🔈</button></div>
          <div class="review-prompt">复习单词 (已错误 ${errorCount} 次)</div>
          <div class="chinese-image">
            <img data-src="${imagePath}" src="${TRANSPARENT_PLACEHOLDER}" alt="${w.chinese}" class="word-image ${categoryClass} loading" onerror="handleImageError(this)" data-word="${w.chinese}">
          </div>
          <div class="phonetic">${w.phonetic}</div>
          <div class="input-container"><input type="text" class="answer-input" data-index="${i}" placeholder="输入英文单词">
          <button class="voice-input-btn" data-index="${i}">🎤</button>
          <button class="show-answer-btn">显示答案</button></div>
          <div class="correct-answer">正确答案: <strong>${w.english}</strong> (${w.chinese})</div>`;
      } else if (mode === 'word-to-chinese') {
        // 看单词选中文模式
        const options = getRandomChineseOptions(w.chinese, 3);
        card.innerHTML = `
          <div class="card-header"><div class="word-index">${i+1}</div><button class="speaker-btn dictation-btn">🔈</button></div>
          <div class="english-word">${w.english}</div>
          <div class="phonetic">${w.phonetic}</div>
          <div class="listening-options">
            ${options.map(option => `
              <button class="option-btn" data-answer="${option}" data-index="${i}">${option}</button>
            `).join('')}
          </div>
          <div class="correct-answer">正确答案: <strong>${w.chinese}</strong> (${w.english})</div>
          <div class="answer-status"></div>`;
      } else {
        // 普通模式和分类学习模式
        card.innerHTML = `
          <div class="card-header"><div class="word-index">${i+1}</div><button class="speaker-btn">🔈</button></div>
          <div class="category-badge">${getCategoryName(w.category)}</div>
          <div class="chinese-image">
            <img data-src="${imagePath}" src="${TRANSPARENT_PLACEHOLDER}" alt="${w.chinese}" class="word-image ${categoryClass} loading" onerror="handleImageError(this)" data-word="${w.chinese}">
          </div>
          <div class="phonetic">${w.phonetic}</div>
          <div class="input-container"><input type="text" class="answer-input" data-index="${i}" placeholder="输入英文单词">
          <button class="voice-input-btn" data-index="${i}">🎤</button>
          <button class="show-answer-btn">显示答案</button></div>
          <div class="correct-answer">正确答案: <strong>${w.english}</strong> (${w.chinese})</div>`;
      }

      container.appendChild(card);
      card.querySelector('.speaker-btn').addEventListener('click', () => speakWord(w.english));

      if (mode === 'listening' || mode === 'word-to-chinese') {
        card.querySelectorAll('.option-btn').forEach(btn => {
          btn.addEventListener('click', function() {
            // 防止重复选择
            const options = card.querySelectorAll('.option-btn');
            options.forEach(opt => opt.disabled = true);
            
            // 确定正确答案和用户选择的答案
            const userAnswer = this.dataset.answer;
            const correctAnswer = mode === 'listening' ? w.english : w.chinese;
            const isCorrect = userAnswer === correctAnswer;
            const answerStatus = card.querySelector('.answer-status');
            
            // 更新按钮样式
            this.classList.add(isCorrect ? 'correct-option' : 'wrong-option');
            
            // 显示正确答案
            if (!isCorrect) {
              // 使用更简单的方式查找正确选项
              const correctBtn = Array.from(options).find(btn => btn.dataset.answer === correctAnswer);
              if (correctBtn) {
                correctBtn.classList.add('correct-option');
              }
            }
            
            // 更新状态信息
            answerStatus.textContent = isCorrect ? '回答正确！' : '回答错误！';
            answerStatus.classList.add(isCorrect ? 'correct-status' : 'wrong-status');
            
            // 提供即时反馈动画
            answerStatus.classList.add('feedback-animation');
            setTimeout(() => {
              answerStatus.classList.remove('feedback-animation');
            }, 1000);
          });
        });
      }
    });
    
    // 重新应用懒加载逻辑，确保新添加的图片也能被观察
    setupLazyLoading();

    // 为所有显示答案按钮添加事件监听
    document.querySelectorAll('.show-answer-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const card = this.closest('.word-card');
        if (card) {
          card.querySelector('.correct-answer').style.display = 'block';
        }
      });
    });

    // 为所有语音输入按钮添加事件监听
    document.querySelectorAll('.voice-input-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        // 获取当前卡片索引
        const index = parseInt(this.dataset.index);
        
        // 获取对应的输入框
        const inputElement = document.querySelector(`.answer-input[data-index="${index}"]`);
        
        // 开始语音识别
        startVoiceRecognition(inputElement, this);
      });
    });
  }
}
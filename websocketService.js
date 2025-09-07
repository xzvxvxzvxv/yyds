// WebSocket服务模块 - 模拟实现
const WebSocketService = {
  // 配置参数
  config: {
    // WebSocket服务器地址（模拟）
    serverUrl: 'wss://api.example.com/ws/learning',
    // 重连配置
    reconnect: {
      enabled: true,
      maxAttempts: 5,
      baseDelay: 1000 // 基础重连延迟（毫秒）
    },
    // 心跳配置
    heartbeat: {
      enabled: true,
      interval: 30000 // 心跳间隔（毫秒）
    },
    // 消息类型
    messageTypes: {
      USER_JOIN: 'user_join',
      USER_LEAVE: 'user_leave',
      LEARNING_PROGRESS: 'learning_progress',
      SCORE_UPDATE: 'score_update',
      PEER_ACTIVITY: 'peer_activity',
      FEEDBACK: 'feedback',
      RANKING_UPDATE: 'ranking_update',
      SYSTEM_MESSAGE: 'system_message'
    }
  },
  
  // WebSocket连接对象
  ws: null,
  
  // 连接状态
  isConnected: false,
  
  // 重连计数
  reconnectAttempts: 0,
  
  // 消息监听器
  listeners: {},
  
  // 心跳定时器
  heartbeatTimer: null,
  
  // 初始化WebSocket服务
  init() {
    console.log('WebSocket服务初始化中...');
    
    // 在实际环境中，这里应该连接真实的WebSocket服务器
    // 但在模拟环境中，我们创建一个假的连接
    this.simulateConnection();
    
    // 注册默认事件监听器
    this.on('connected', this.onConnected.bind(this));
    this.on('disconnected', this.onDisconnected.bind(this));
    this.on('error', this.onError.bind(this));
    
    // 添加到全局对象以便访问
    if (typeof window !== 'undefined') {
      window.WebSocketService = this;
    }
  },
  
  // 模拟WebSocket连接
  simulateConnection() {
    console.log('使用模拟WebSocket连接');
    
    // 模拟连接成功
    setTimeout(() => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.notifyListeners('connected', { timestamp: new Date() });
      
      // 开始心跳（如果启用）
      if (this.config.heartbeat.enabled) {
        this.startHeartbeat();
      }
      
      // 模拟接收一些初始消息
      this.simulateInitialMessages();
    }, 1000);
  },
  
  // 模拟初始消息
  simulateInitialMessages() {
    // 模拟其他用户活动
    setTimeout(() => {
      this.simulatePeerActivity();
    }, 3000);
    
    // 模拟排行榜更新
    setTimeout(() => {
      this.simulateRankingUpdate();
    }, 5000);
  },
  
  // 连接WebSocket服务器
  connect() {
    if (this.isConnected) {
      console.warn('WebSocket已经处于连接状态');
      return;
    }
    
    try {
      // 在实际环境中，这里应该创建真实的WebSocket连接
      // this.ws = new WebSocket(this.config.serverUrl);
      // this.setupWebSocketEvents();
      
      // 模拟环境中，重新连接使用模拟方式
      this.simulateConnection();
    } catch (error) {
      console.error('WebSocket连接失败:', error);
      this.notifyListeners('error', error);
      this.attemptReconnect();
    }
  },
  
  // 设置WebSocket事件
  setupWebSocketEvents() {
    // 实际环境中的WebSocket事件处理
    /*
    this.ws.onopen = () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.notifyListeners('connected', { timestamp: new Date() });
      
      if (this.config.heartbeat.enabled) {
        this.startHeartbeat();
      }
    };
    
    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('解析WebSocket消息失败:', error);
      }
    };
    
    this.ws.onclose = () => {
      this.isConnected = false;
      this.notifyListeners('disconnected', { timestamp: new Date() });
      
      this.stopHeartbeat();
      this.attemptReconnect();
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket错误:', error);
      this.notifyListeners('error', error);
    };
    */
  },
  
  // 处理接收到的消息
  handleMessage(message) {
    const { type, data } = message;
    
    switch (type) {
      case this.config.messageTypes.PEER_ACTIVITY:
        this.notifyListeners('peerActivity', data);
        break;
      case this.config.messageTypes.SCORE_UPDATE:
        this.notifyListeners('scoreUpdate', data);
        break;
      case this.config.messageTypes.RANKING_UPDATE:
        this.notifyListeners('rankingUpdate', data);
        break;
      case this.config.messageTypes.FEEDBACK:
        this.notifyListeners('feedback', data);
        break;
      case this.config.messageTypes.SYSTEM_MESSAGE:
        this.notifyListeners('systemMessage', data);
        break;
      default:
        this.notifyListeners('unknownMessage', message);
    }
  },
  
  // 发送消息
  sendMessage(type, data) {
    const message = {
      type,
      data,
      timestamp: new Date().toISOString(),
      userId: this.getUserId()
    };
    
    try {
      if (this.isConnected) {
        // 在实际环境中，这里应该发送真实的WebSocket消息
        // this.ws.send(JSON.stringify(message));
        
        // 模拟环境中，记录消息并模拟一些回应
        console.log('发送WebSocket消息:', message);
        
        // 根据消息类型模拟不同的回应
        this.simulateResponse(message);
      } else {
        console.warn('WebSocket未连接，无法发送消息');
        // 可以选择将消息缓存，等连接后再发送
      }
    } catch (error) {
      console.error('发送WebSocket消息失败:', error);
      this.notifyListeners('error', error);
    }
  },
  
  // 模拟服务器响应
  simulateResponse(message) {
    const { type, data } = message;
    
    // 模拟根据不同消息类型的响应
    switch (type) {
      case this.config.messageTypes.LEARNING_PROGRESS:
        // 模拟学习进度反馈
        setTimeout(() => {
          const feedbackMessage = {
            type: this.config.messageTypes.FEEDBACK,
            data: {
              userId: this.getUserId(),
              progress: data.progress,
              message: this.generateProgressFeedback(data.progress),
              encouragement: this.getEncouragementMessage()
            }
          };
          this.handleMessage(feedbackMessage);
        }, 1000 + Math.random() * 2000);
        break;
      
      case this.config.messageTypes.SCORE_UPDATE:
        // 模拟分数更新后的排行榜变化
        setTimeout(() => {
          this.simulateRankingUpdate();
        }, 2000);
        break;
    }
  },
  
  // 生成进度反馈消息
  generateProgressFeedback(progress) {
    if (progress >= 90) {
      return '太棒了！你已经掌握了大部分内容！';
    } else if (progress >= 70) {
      return '做得很好！继续保持！';
    } else if (progress >= 50) {
      return '不错的开始！再加把劲！';
    } else if (progress >= 30) {
      return '继续努力，你会越来越好的！';
    } else {
      return '刚开始学习，慢慢来，加油！';
    }
  },
  
  // 获取鼓励消息
  getEncouragementMessage() {
    const messages = [
      '你真聪明！',
      '继续保持！',
      '太棒了！',
      '加油，你能做到的！',
      '好样的！',
      '继续努力！',
      '你正在进步！',
      '不要放弃！'
    ];
    
    return messages[Math.floor(Math.random() * messages.length)];
  },
  
  // 模拟其他用户活动
  simulatePeerActivity() {
    const activities = [
      { action: 'completed', content: '一个单词练习' },
      { action: 'mastered', content: '新单词' },
      { action: 'joined', content: '学习室' },
      { action: 'scored', content: '高分' }
    ];
    
    const peerNames = ['小明', '小红', '小华', '小丽', '小刚'];
    
    const randomActivity = activities[Math.floor(Math.random() * activities.length)];
    const randomPeer = peerNames[Math.floor(Math.random() * peerNames.length)];
    
    const activityMessage = {
      type: this.config.messageTypes.PEER_ACTIVITY,
      data: {
        userName: randomPeer,
        action: randomActivity.action,
        content: randomActivity.content,
        timestamp: new Date().toISOString()
      }
    };
    
    this.handleMessage(activityMessage);
    
    // 继续模拟定期的用户活动
    setTimeout(() => {
      this.simulatePeerActivity();
    }, 10000 + Math.random() * 20000);
  },
  
  // 模拟排行榜更新
  simulateRankingUpdate() {
    const users = [
      { name: '小明', score: Math.floor(Math.random() * 1000) + 500 },
      { name: '小红', score: Math.floor(Math.random() * 1000) + 500 },
      { name: '小华', score: Math.floor(Math.random() * 1000) + 500 },
      { name: '小丽', score: Math.floor(Math.random() * 1000) + 500 },
      { name: '小刚', score: Math.floor(Math.random() * 1000) + 500 }
    ];
    
    // 模拟当前用户的排名
    const currentUserRank = Math.floor(Math.random() * 5) + 1;
    const currentUserName = '我';
    const currentUserScore = Math.floor(Math.random() * 1000) + 500;
    
    // 插入当前用户到排行榜中
    users.splice(currentUserRank - 1, 0, { 
      name: currentUserName, 
      score: currentUserScore,
      isCurrentUser: true 
    });
    
    // 排序并截取前10名
    const rankedUsers = users
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((user, index) => ({
        ...user,
        rank: index + 1
      }));
    
    const rankingMessage = {
      type: this.config.messageTypes.RANKING_UPDATE,
      data: {
        rankings: rankedUsers,
        timestamp: new Date().toISOString()
      }
    };
    
    this.handleMessage(rankingMessage);
  },
  
  // 开始心跳
  startHeartbeat() {
    this.stopHeartbeat();
    
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected) {
        // 在实际环境中，这里应该发送心跳消息
        // this.ws.send(JSON.stringify({ type: 'heartbeat' }));
        console.log('发送心跳消息');
      }
    }, this.config.heartbeat.interval);
  },
  
  // 停止心跳
  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  },
  
  // 尝试重新连接
  attemptReconnect() {
    if (!this.config.reconnect.enabled || this.reconnectAttempts >= this.config.reconnect.maxAttempts) {
      console.error('达到最大重连次数，停止重连');
      return;
    }
    
    this.reconnectAttempts++;
    const delay = this.config.reconnect.baseDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`等待 ${delay}ms 后进行第 ${this.reconnectAttempts} 次重连`);
    
    setTimeout(() => {
      console.log(`进行第 ${this.reconnectAttempts} 次重连`);
      this.connect();
    }, delay);
  },
  
  // 断开连接
  disconnect() {
    this.isConnected = false;
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    console.log('WebSocket已断开连接');
  },
  
  // 发送学习进度
  sendLearningProgress(progress) {
    this.sendMessage(this.config.messageTypes.LEARNING_PROGRESS, {
      progress: progress,
      currentActivity: this.getCurrentActivity(),
      timestamp: new Date().toISOString()
    });
  },
  
  // 发送分数更新
  sendScoreUpdate(score, total) {
    this.sendMessage(this.config.messageTypes.SCORE_UPDATE, {
      score: score,
      total: total,
      accuracy: total > 0 ? Math.round((score / total) * 100) : 0,
      timestamp: new Date().toISOString()
    });
  },
  
  // 获取用户ID（模拟）
  getUserId() {
    // 在实际环境中，这里应该返回真实的用户ID
    return localStorage.getItem('userId') || 'user_' + Math.floor(Math.random() * 1000000);
  },
  
  // 获取当前活动（模拟）
  getCurrentActivity() {
    // 在实际环境中，这里应该返回真实的当前活动
    return document.getElementById('mode-selector')?.value || 'unknown';
  },
  
  // 添加事件监听器
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    
    this.listeners[event].push(callback);
  },
  
  // 移除事件监听器
  off(event, callback) {
    if (!this.listeners[event]) {
      return;
    }
    
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  },
  
  // 通知所有监听器
  notifyListeners(event, data) {
    if (!this.listeners[event]) {
      return;
    }
    
    this.listeners[event].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`调用监听器失败 (${event}):`, error);
      }
    });
  },
  
  // 默认事件处理函数
  onConnected(data) {
    console.log('WebSocket连接成功:', data);
    // 发送用户加入消息
    this.sendMessage(this.config.messageTypes.USER_JOIN, {
      userName: this.getCurrentUserName(),
      timestamp: new Date().toISOString()
    });
  },
  
  onDisconnected(data) {
    console.log('WebSocket连接断开:', data);
  },
  
  onError(error) {
    console.error('WebSocket错误:', error);
  },
  
  // 获取当前用户名（模拟）
  getCurrentUserName() {
    // 在实际环境中，这里应该返回真实的用户名
    return localStorage.getItem('userName') || '用户' + Math.floor(Math.random() * 1000);
  }
};

// 为浏览器环境提供全局访问
if (typeof window !== 'undefined') {
  window.WebSocketService = WebSocketService;
}
// 云存储服务模块
const CloudStorageService = {
  // 配置参数
  config: {
    // 模拟的云存储基础URL
    baseUrl: 'https://api.example.com/storage',
    // 资源类型映射
    resourceTypes: {
      image: 'images',
      audio: 'audios',
      document: 'documents'
    },
    // 本地资源路径映射到云存储路径
    pathMappings: {
      '图库/': 'images/vocabulary/'
    },
    // 资源缓存配置
    cache: {
      enabled: true,
      ttl: 24 * 60 * 60 * 1000 // 24小时缓存
    }
  },
  
  // 缓存对象
  resourceCache: {},
  
  // 初始化云存储服务
  init() {
    console.log('云存储服务已初始化');
    this.loadCache();
  },
  
  // 获取资源的云存储URL
  async getResourceUrl(localPath, resourceType = 'image') {
    // 检查是否已在缓存中
    const cacheKey = `${resourceType}:${localPath}`;
    if (this.config.cache.enabled) {
      const cachedUrl = this.getFromCache(cacheKey);
      if (cachedUrl) {
        console.log(`从缓存获取资源URL: ${localPath}`);
        return cachedUrl;
      }
    }
    
    // 转换本地路径到云存储路径
    const cloudPath = this.convertLocalPathToCloudPath(localPath, resourceType);
    
    try {
      // 检查资源是否已存在于云存储
      const exists = await this.checkResourceExists(cloudPath, resourceType);
      
      if (exists) {
        // 资源已存在，直接返回URL
        const resourceUrl = this.constructResourceUrl(cloudPath, resourceType);
        // 存入缓存
        this.saveToCache(cacheKey, resourceUrl);
        return resourceUrl;
      } else {
        // 资源不存在，尝试上传（模拟环境下使用本地路径作为回退）
        console.log(`云存储中未找到资源: ${localPath}，使用本地路径作为回退`);
        // 在实际环境中，这里应该调用上传API
        // await this.uploadResource(localPath, cloudPath, resourceType);
        // return this.constructResourceUrl(cloudPath, resourceType);
        
        // 模拟环境下，返回本地路径
        return localPath;
      }
    } catch (error) {
      console.error(`获取云存储资源URL失败: ${error.message}`);
      // 出错时返回本地路径作为回退
      return localPath;
    }
  },
  
  // 转换本地路径到云存储路径
  convertLocalPathToCloudPath(localPath, resourceType) {
    let cloudPath = localPath;
    
    // 应用路径映射
    Object.keys(this.config.pathMappings).forEach(prefix => {
      if (localPath.startsWith(prefix)) {
        cloudPath = localPath.replace(prefix, this.config.pathMappings[prefix]);
      }
    });
    
    // 确保路径格式符合云存储要求
    cloudPath = cloudPath.replace(/\\/g, '/'); // 将反斜杠替换为正斜杠
    
    return cloudPath;
  },
  
  // 检查资源是否存在于云存储
  async checkResourceExists(cloudPath, resourceType) {
    try {
      // 在实际环境中，这里应该调用云存储的API检查资源是否存在
      // 模拟环境下，我们简单地返回true表示资源存在
      // 实际项目中需要替换为真实的API调用
      return true;
    } catch (error) {
      console.error(`检查云存储资源是否存在失败: ${error.message}`);
      return false;
    }
  },
  
  // 构造资源的完整URL
  constructResourceUrl(cloudPath, resourceType) {
    const resourceTypePath = this.config.resourceTypes[resourceType] || resourceType;
    return `${this.config.baseUrl}/${resourceTypePath}/${encodeURIComponent(cloudPath)}`;
  },
  
  // 上传资源到云存储（模拟实现）
  async uploadResource(localPath, cloudPath, resourceType) {
    try {
      console.log(`上传资源到云存储: ${localPath} -> ${cloudPath}`);
      
      // 在实际环境中，这里应该实现真实的资源上传逻辑
      // 1. 读取本地文件
      // 2. 上传到云存储
      // 3. 返回上传结果
      
      // 模拟上传延迟
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log(`资源上传成功: ${cloudPath}`);
      return true;
    } catch (error) {
      console.error(`上传资源失败: ${error.message}`);
      throw error;
    }
  },
  
  // 从缓存获取资源URL
  getFromCache(key) {
    if (!this.config.cache.enabled) return null;
    
    const cached = this.resourceCache[key];
    if (!cached) return null;
    
    // 检查缓存是否过期
    const now = Date.now();
    if (now > cached.expiry) {
      delete this.resourceCache[key];
      return null;
    }
    
    return cached.value;
  },
  
  // 保存资源URL到缓存
  saveToCache(key, value) {
    if (!this.config.cache.enabled) return;
    
    const expiry = Date.now() + this.config.cache.ttl;
    this.resourceCache[key] = { value, expiry };
    
    // 保存缓存到localStorage
    this.saveCache();
  },
  
  // 保存缓存到localStorage
  saveCache() {
    try {
      localStorage.setItem('cloudStorageCache', JSON.stringify({
        timestamp: Date.now(),
        data: this.resourceCache
      }));
    } catch (error) {
      console.error('保存云存储缓存失败:', error);
    }
  },
  
  // 从localStorage加载缓存
  loadCache() {
    if (!this.config.cache.enabled) return;
    
    try {
      const saved = localStorage.getItem('cloudStorageCache');
      if (saved) {
        const cacheData = JSON.parse(saved);
        // 检查缓存是否过期
        const now = Date.now();
        if (now - cacheData.timestamp < this.config.cache.ttl) {
          this.resourceCache = cacheData.data || {};
          console.log('云存储缓存加载成功');
        } else {
          console.log('云存储缓存已过期');
        }
      }
    } catch (error) {
      console.error('加载云存储缓存失败:', error);
      this.resourceCache = {};
    }
  },
  
  // 清除缓存
  clearCache() {
    this.resourceCache = {};
    try {
      localStorage.removeItem('cloudStorageCache');
    } catch (error) {
      console.error('清除云存储缓存失败:', error);
    }
    console.log('云存储缓存已清除');
  },
  
  // 获取云存储使用统计信息（模拟实现）
  async getStorageStats() {
    try {
      // 在实际环境中，这里应该调用云存储的API获取统计信息
      return {
        totalStorage: 1024 * 1024 * 1024, // 1GB
        usedStorage: 100 * 1024 * 1024,   // 100MB
        remainingStorage: 924 * 1024 * 1024, // 924MB
        resourceCount: {
          image: 150,
          audio: 50,
          document: 10
        }
      };
    } catch (error) {
      console.error('获取云存储统计信息失败:', error);
      return null;
    }
  }
};

// 为浏览器环境提供全局访问
if (typeof window !== 'undefined') {
  window.CloudStorageService = CloudStorageService;
}
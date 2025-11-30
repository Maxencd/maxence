document.addEventListener('DOMContentLoaded', function() {
    // 获取DOM元素
    const messagesDiv = document.getElementById('messages');
    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    const emojiBtn = document.getElementById('emoji-btn');
    const emojiPanel = document.getElementById('emoji-panel');
    const clearBtn = document.getElementById('clear-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const onlineUsersList = document.getElementById('online-users');
    const userCountSpan = document.getElementById('user-count');
    
    // 获取用户昵称
    const nickname = USER_NICKNAME;
    
    // 创建Socket.IO连接
    const socket = io();
    let isConnected = false;
    
    // 初始化WebSocket连接
    function initSocket() {
        // 连接成功
        socket.on('connect', function() {
            console.log('WebSocket连接已建立');
            isConnected = true;
            
            // 加入聊天室
            socket.emit('join_room', { nickname: nickname });
        });
        
        // 连接断开
        socket.on('disconnect', function() {
            console.log('WebSocket连接已断开');
            isConnected = false;
            addSystemMessage('连接已断开，请刷新页面重试');
        });
        
        // 加入成功
        socket.on('join_success', function(data) {
            addSystemMessage(data.message);
        });
        
        // 加入失败
        socket.on('join_error', function(data) {
            addSystemMessage('加入失败: ' + data.message, true);
            // 跳转回登录页
            setTimeout(() => {
                window.location.href = '/login';
            }, 2000);
        });
        
        // 新消息
    socket.on('new_message', function(message) {
        addMessage(message);
        
        // 如果是AI聊天消息，自动生成回复
        if (message.type === 'ai_chat' && message.nickname === nickname) {
            setTimeout(function() {
                const reply = getAIReply(message.content);
                addMessage({
                    type: 'ai_chat',
                    content: reply,
                    nickname: '川小农',
                    timestamp: new Date().toLocaleString()
                });
            }, 1000); // 延迟1秒模拟思考时间
        }
        
        // 如果是Maxence聊天消息，自动生成回复
        if (message.type === 'maxence_chat' && message.nickname === nickname) {
            setTimeout(function() {
                const reply = getMaxenceReply(message.content);
                addMessage({
                    type: 'maxence_chat',
                    content: reply,
                    nickname: 'maxence',
                    timestamp: new Date().toLocaleString()
                });
            }, 800); // 稍微短一点的延迟，保持温柔细致的风格
        }
    });
        
        // 用户加入
        socket.on('user_joined', function(data) {
            addSystemMessage(`${data.nickname} 加入了聊天室`);
        });
        
        // 用户离开
        socket.on('user_left', function(data) {
            addSystemMessage(`${data.nickname} 离开了聊天室`);
        });
        
        // 更新在线用户列表
        socket.on('update_users', function(data) {
            updateUserList(data.users);
        });
    }
    
    // 添加系统消息
    function addSystemMessage(message, isError = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message system-message' + (isError ? ' error' : '');
        
        const messageContent = document.createElement('p');
        messageContent.textContent = message;
        
        const timestampSpan = document.createElement('span');
        timestampSpan.className = 'timestamp';
        timestampSpan.textContent = getCurrentTime();
        
        messageDiv.appendChild(messageContent);
        messageDiv.appendChild(timestampSpan);
        
        messagesDiv.appendChild(messageDiv);
        scrollToBottom();
    }
    
    // 添加用户消息
    function addMessage(message) {
        const messageDiv = document.createElement('div');
        
        // 根据消息类型设置样式类
        if (message.type === 'movie') {
            messageDiv.className = 'message movie-message';
        } else if (message.type === 'ai_chat') {
            messageDiv.className = 'message ai-message';
        } else if (message.type === 'maxence_chat') {
            messageDiv.className = 'message maxence-message';
        } else if (message.nickname === nickname) {
            messageDiv.className = 'message user-message';
        } else {
            messageDiv.className = 'message other-message';
        }
        
        // 添加发送者名称（除了自己发送的消息）
        if (message.nickname !== nickname && message.type !== 'system') {
            const senderDiv = document.createElement('div');
            senderDiv.className = 'sender';
            senderDiv.textContent = message.nickname;
            messageDiv.appendChild(senderDiv);
        }
        
        // 添加消息内容
        const contentDiv = document.createElement('div');
        contentDiv.className = 'content';
        
        // 根据消息类型处理内容
        if (message.type === 'movie') {
            // 电影消息：显示链接和iframe预览
            const linkSpan = document.createElement('span');
            linkSpan.textContent = `电影链接: ${message.content}`;
            contentDiv.appendChild(linkSpan);
            
            // 添加iframe容器
            const iframeContainer = document.createElement('div');
            iframeContainer.className = 'iframe-container';
            
            // 创建iframe元素
            const iframe = document.createElement('iframe');
            iframe.src = parseMovieUrl(message.content); // 使用解析后的URL
            iframe.width = '400';
            iframe.height = '400';
            iframe.frameBorder = '0';
            iframe.allowFullscreen = true;
            
            iframeContainer.appendChild(iframe);
            contentDiv.appendChild(iframeContainer);
        } else if (message.type === 'ai_chat') {
            // AI聊天消息
            const aiPromptSpan = document.createElement('span');
            aiPromptSpan.textContent = `@川小农: ${message.content}`;
            contentDiv.appendChild(aiPromptSpan);
            
            // 添加AI回复（模拟）
            const aiResponseSpan = document.createElement('p');
            aiResponseSpan.textContent = getAIReply(message.content);
            aiResponseSpan.style.marginTop = '10px';
            aiResponseSpan.style.fontStyle = 'italic';
            contentDiv.appendChild(aiResponseSpan);
        } else if (message.type === 'maxence_chat') {
            // Maxence聊天消息
            const maxencePromptSpan = document.createElement('span');
            maxencePromptSpan.textContent = `@maxence: ${message.content}`;
            contentDiv.appendChild(maxencePromptSpan);
            
            // 添加Maxence回复
            const maxenceResponseSpan = document.createElement('p');
            maxenceResponseSpan.textContent = getMaxenceReply(message.content);
            maxenceResponseSpan.style.marginTop = '10px';
            maxenceResponseSpan.style.fontStyle = 'italic';
            contentDiv.appendChild(maxenceResponseSpan);
        } else {
            // 普通文本消息
            contentDiv.textContent = message.content;
        }
        
        messageDiv.appendChild(contentDiv);
        
        // 添加时间戳
        const timestampSpan = document.createElement('span');
        timestampSpan.className = 'timestamp';
        timestampSpan.textContent = message.timestamp;
        messageDiv.appendChild(timestampSpan);
        
        messagesDiv.appendChild(messageDiv);
        scrollToBottom();
    }
    
    // 更新在线用户列表
    function updateUserList(users) {
        onlineUsersList.innerHTML = '';
        
        // 更新用户数量
        userCountSpan.textContent = `(${users.length})`;
        
        // 添加用户列表项
        users.forEach(user => {
            const li = document.createElement('li');
            
            const statusDot = document.createElement('span');
            statusDot.className = 'user-status';
            
            const userText = document.createElement('span');
            userText.textContent = user;
            
            // 高亮当前用户
            if (user === nickname) {
                userText.style.fontWeight = 'bold';
                userText.style.color = '#667eea';
            }
            
            li.appendChild(statusDot);
            li.appendChild(userText);
            onlineUsersList.appendChild(li);
        });
    }
    
    // 解析电影URL
    function parseMovieUrl(url) {
        // 简单的URL处理，实际应用中可能需要更复杂的解析逻辑
        // 这里假设我们直接使用原始URL，或者可以添加特定的前缀
        return url;
    }
    
    // 检查是否为@命令
    function isAtCommand(message) {
        return message.startsWith('@');
    }
    
    // 处理@命令
    function handleAtCommand(message) {
        // 检查是否为@电影命令
        if (message.startsWith('@电影 ')) {
            const parts = message.split(' ');
            if (parts.length >= 2) {
                const url = parts.slice(1).join(' ');
                return {
                    type: 'movie',
                    content: url
                };
            }
        }
        
        // 检查是否为@川小农命令
        else if (message.startsWith('@川小农')) {
            const prompt = message.substring('@川小农'.length).trim();
            return {
                type: 'ai_chat',
                content: prompt
            };
        }
        
        // 检查是否为@maxence命令
        else if (message.startsWith('@maxence')) {
            const prompt = message.substring('@maxence'.length).trim();
            return {
                type: 'maxence_chat',
                content: prompt
            };
        }
        
        return null;
    }
    
    // 发送消息
    function sendMessage() {
        let message = messageInput.value.trim();
        
        if (!message || !isConnected) {
            return;
        }
        
        // 检查并处理@命令
        let messageData = null;
        if (isAtCommand(message)) {
            messageData = handleAtCommand(message);
            if (messageData) {
                socket.emit('send_message', messageData);
                messageInput.value = '';
                return;
            }
        }
        
        // 普通消息
        socket.emit('send_message', { message: message });
        
        // 清空输入框
        messageInput.value = '';
    }
    
    // 切换emoji面板显示状态
    function toggleEmojiPanel() {
        emojiPanel.classList.toggle('show');
    }
    
    // 选择emoji
    function selectEmoji(emoji) {
        messageInput.value += emoji;
        messageInput.focus();
        emojiPanel.classList.remove('show');
    }
    
    // 清空聊天记录
    function clearMessages() {
        // 保留系统欢迎消息
        const systemMessages = messagesDiv.querySelectorAll('.system-message');
        messagesDiv.innerHTML = '';
        
        // 重新添加系统消息
        systemMessages.forEach(msg => {
            messagesDiv.appendChild(msg.cloneNode(true));
        });
    }
    
    // 退出登录
    function logout() {
        // 发送离开房间事件
        if (isConnected) {
            socket.emit('leave_room');
        }
        
        // 断开连接
        socket.disconnect();
        
        // 跳转到登录页
        window.location.href = '/login';
    }
    
    // 滚动到底部
    function scrollToBottom() {
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
    
    // 获取当前时间
    function getCurrentTime() {
        const now = new Date();
        return now.toLocaleTimeString();
    }
    
    // 检查是否为有效的视频URL
    function isValidVideoUrl(url) {
        const videoExtensions = ['.mp4', '.webm', '.ogg'];
        return videoExtensions.some(ext => url.toLowerCase().includes(ext));
    }
    
    // 获取AI回复（模拟）
    function getAIReply(prompt) {
        // 简单的模拟AI回复
        const replies = [
            '你好！我是川小农，很高兴为你服务。',
            '这个问题很有趣，让我思考一下...',
            '感谢你的提问，我会尽力帮助你。',
            '我理解你的需求了，让我来为你解答。',
            '这个问题我还在学习中，不过我可以尝试回答。'
        ];
        
        // 根据输入生成一个简单的回复
        if (!prompt) {
            return '你好！有什么可以帮助你的吗？';
        }
        
        // 模拟一些特定问题的回复
        if (prompt.includes('你好') || prompt.includes('嗨')) {
            return '你好！很高兴认识你！';
        } else if (prompt.includes('天气')) {
            return '今天天气不错，适合出门走走！';
        } else if (prompt.includes('帮助') || prompt.includes('怎么用')) {
            return '你可以使用@电影 URL来分享电影，或者直接和我聊天！';
        }
        
        // 随机返回一个回复
        return replies[Math.floor(Math.random() * replies.length)];
    }
    
    // 获取Maxence回复
    function getMaxenceReply(prompt) {
        // 基本信息和回复模式
        const maxenceInfo = {
            name: 'maxence',
            gender: '男',
           特点: '地表最帅男人',
            movies: ['伏地魔', '法国skam'],
            style: '温柔细致'
        };
        
        // 当被@后如果没有具体问题，回答"我在你说"
        if (!prompt || prompt.trim() === '') {
            return '我在你说~';
        }
        
        // 检查是否是生活问题相关
        const dailyKeywords = ['穿搭', '穿衣', '时尚', '服装', '搭配', 
                              '饮食', '吃', '餐厅', '食物', '菜谱',
                              '生活习惯', '习惯', '作息', '日常', '生活'];
        
        // 检查是否询问电影相关
        const movieKeywords = ['电影', '演过', '作品', '角色', '伏地魔', 'skam'];
        
        // 检查是否询问个人信息
        const infoKeywords = ['是谁', '介绍', '你好', '嗨', '个人信息', '特点', '性别'];
        
        // 检查是否是打招呼
        if (prompt.includes('你好') || prompt.includes('嗨') || prompt.includes('哈喽')) {
            return `你好呀~ 我是${maxenceInfo.name}，很高兴认识你！`;
        }
        
        // 检查生活问题
        if (dailyKeywords.some(keyword => prompt.includes(keyword))) {
            // 根据具体关键词提供相应的生活建议
            if (prompt.includes('穿搭') || prompt.includes('穿衣') || prompt.includes('搭配')) {
                return '关于日常穿搭，我通常喜欢简约又有质感的风格。一件合身的白衬衫搭配牛仔裤永远不会出错，再加上一双经典的小白鞋，既舒适又时尚。天气凉的时候，我会选择一件轻薄的针织衫作为外搭，既保暖又不会显得厚重。';
            } else if (prompt.includes('饮食') || prompt.includes('吃') || prompt.includes('食物')) {
                return '我的日常饮食比较注重营养均衡呢。早餐通常是全麦面包配牛油果和水煮蛋，再加上一杯鲜榨果汁。午餐我会选择蛋白质丰富的食物，比如鸡胸肉或者鱼类，搭配大量的蔬菜。晚餐会相对清淡一些，可能是一碗蔬菜沙拉或者是一碗温热的汤。当然啦，偶尔也会享受一下美食的快乐，毕竟生活需要一些小确幸~';
            } else if (prompt.includes('生活习惯') || prompt.includes('习惯') || prompt.includes('作息')) {
                return '我保持着比较规律的作息习惯。每天早上7点左右起床，然后进行20分钟的冥想，让自己的身心都保持在一个平静的状态。晚上我会尽量在11点前上床睡觉，睡前会看一会儿书来放松自己。每周我会运动3-4次，比如跑步、游泳或者去健身房锻炼，保持身体的活力和健康。';
            }
            // 通用生活建议
            return '生活是一场美丽的旅程，我们要学会享受其中的每一刻。保持积极的心态，善待自己，也善待他人，这样的生活才会充满阳光和温暖。';
        }
        
        // 检查电影相关问题
        if (movieKeywords.some(keyword => prompt.includes(keyword))) {
            return `我曾有幸参与了《${maxenceInfo.movies[0]}》和《${maxenceInfo.movies[1]}》等作品的拍摄。每一部作品对我来说都是一次宝贵的经历，让我能够在不同的角色中体验不同的人生。如果你对这些作品感兴趣，我很乐意和你分享更多关于拍摄过程中的有趣故事~`;
        }
        
        // 检查个人信息相关问题
        if (infoKeywords.some(keyword => prompt.includes(keyword))) {
            return `你好呀~ 我是${maxenceInfo.name}，性别是${maxenceInfo.gender}。有人说我是${maxenceInfo.特点}，这让我感到很荣幸呢。我演过《${maxenceInfo.movies[0]}》和《${maxenceInfo.movies[1]}》等电影。很高兴能和你聊天，有什么想知道的都可以问我哦~`;
        }
        
        // 其他情况的回复
        const defaultReplies = [
            '嗯...这个问题很有意思呢，让我仔细想想~',
            '谢谢你的问题，我很乐意和你分享我的想法。',
            '这个话题我也很感兴趣呢，我们可以多交流交流。',
            '你的想法很独特，我很喜欢听你说话。',
            '生活中充满了各种可能性，我们要勇敢地去探索。'
        ];
        
        return defaultReplies[Math.floor(Math.random() * defaultReplies.length)];
    }
    
    // 初始化emoji面板
    function initEmojiPanel() {
        const emojiGrid = emojiPanel.querySelector('.emoji-grid');
        const emojis = emojiGrid.textContent.trim().split(/\s+/);
        
        emojiGrid.innerHTML = '';
        
        emojis.forEach(emoji => {
            const emojiSpan = document.createElement('span');
            emojiSpan.textContent = emoji;
            emojiSpan.addEventListener('click', function() {
                selectEmoji(emoji);
            });
            emojiGrid.appendChild(emojiSpan);
        });
    }
    
    // 事件监听器
    sendBtn.addEventListener('click', sendMessage);
    
    messageInput.addEventListener('keypress', function(event) {
        // 按Enter发送消息，Shift+Enter换行
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });
    
    emojiBtn.addEventListener('click', toggleEmojiPanel);
    
    clearBtn.addEventListener('click', clearMessages);
    
    logoutBtn.addEventListener('click', logout);
    
    // 点击页面其他地方关闭emoji面板
    document.addEventListener('click', function(event) {
        if (!emojiBtn.contains(event.target) && !emojiPanel.contains(event.target)) {
            emojiPanel.classList.remove('show');
        }
    });
    
    // 初始化
    initSocket();
    initEmojiPanel();
    
    // 页面关闭前发送离开消息
    window.addEventListener('beforeunload', function() {
        if (isConnected) {
            socket.emit('leave_room');
        }
    });
    
    // 初始滚动到底部
    scrollToBottom();
});
document.addEventListener('DOMContentLoaded', function() {
    const nicknameInput = document.getElementById('nickname');
    const serverSelect = document.getElementById('server');
    const loginBtn = document.getElementById('login-btn');
    const nicknameError = document.getElementById('nickname-error');
    const loginStatus = document.getElementById('login-status');
    
    // 获取服务器列表
    function fetchServers() {
        fetch('/api/servers')
            .then(response => response.json())
            .then(data => {
                serverSelect.innerHTML = '';
                if (data && data.length > 0) {
                    data.forEach(server => {
                        const option = document.createElement('option');
                        option.value = server;
                        option.textContent = server;
                        serverSelect.appendChild(option);
                    });
                } else {
                    // 如果没有服务器，添加默认服务器
                    const option = document.createElement('option');
                    option.value = 'http://localhost:5000';
                    option.textContent = 'http://localhost:5000';
                    serverSelect.appendChild(option);
                }
            })
            .catch(error => {
                console.error('获取服务器列表失败:', error);
                // 添加默认服务器作为备选
                serverSelect.innerHTML = '';
                const option = document.createElement('option');
                option.value = 'http://localhost:5000';
                option.textContent = 'http://localhost:5000';
                serverSelect.appendChild(option);
                showStatus('获取服务器列表失败，已使用默认服务器', 'error');
            });
    }
    
    // 验证昵称
    function validateNickname() {
        const nickname = nicknameInput.value.trim();
        nicknameError.textContent = '';
        
        if (!nickname) {
            nicknameError.textContent = '昵称不能为空';
            return false;
        }
        
        if (nickname.length > 20) {
            nicknameError.textContent = '昵称长度不能超过20个字符';
            return false;
        }
        
        // 检查昵称格式（只允许中文、英文、数字和下划线）
        const nicknameRegex = /^[\u4e00-\u9fa5a-zA-Z0-9_]+$/;
        if (!nicknameRegex.test(nickname)) {
            nicknameError.textContent = '昵称只能包含中文、英文、数字和下划线';
            return false;
        }
        
        return true;
    }
    
    // 检查昵称是否已被使用
    function checkNicknameAvailability(nickname) {
        return fetch('/api/validate_nickname', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ nickname: nickname })
        })
        .then(response => response.json())
        .then(data => {
            if (!data.valid) {
                nicknameError.textContent = data.message || '昵称已被使用';
                return false;
            }
            return true;
        })
        .catch(error => {
            console.error('验证昵称失败:', error);
            nicknameError.textContent = '验证失败，请稍后重试';
            return false;
        });
    }
    
    // 显示登录状态消息
    function showStatus(message, type) {
        loginStatus.textContent = message;
        loginStatus.className = 'status-message ' + type;
    }
    
    // 隐藏登录状态消息
    function hideStatus() {
        loginStatus.className = 'status-message';
    }
    
    // 登录处理
    async function handleLogin() {
        // 先进行基本验证
        if (!validateNickname()) {
            return;
        }
        
        const nickname = nicknameInput.value.trim();
        const server = serverSelect.value;
        
        if (!server) {
            showStatus('请选择服务器地址', 'error');
            return;
        }
        
        // 禁用按钮防止重复点击
        loginBtn.disabled = true;
        loginBtn.textContent = '登录中...';
        hideStatus();
        
        try {
            // 检查昵称可用性
            const isAvailable = await checkNicknameAvailability(nickname);
            if (!isAvailable) {
                return;
            }
            
            // 登录成功，跳转到聊天室页面
            showStatus('登录成功，正在进入聊天室...', 'success');
            setTimeout(() => {
                window.location.href = `/chat?nickname=${encodeURIComponent(nickname)}`;
            }, 1000);
        } catch (error) {
            console.error('登录失败:', error);
            showStatus('登录失败，请稍后重试', 'error');
        } finally {
            // 恢复按钮状态
            loginBtn.disabled = false;
            loginBtn.textContent = '登录';
        }
    }
    
    // 事件监听器
    nicknameInput.addEventListener('input', function() {
        // 实时验证基本格式
        validateNickname();
        hideStatus();
    });
    
    nicknameInput.addEventListener('blur', function() {
        const nickname = nicknameInput.value.trim();
        if (nickname && validateNickname()) {
            // 当输入框失去焦点时，检查昵称可用性
            checkNicknameAvailability(nickname);
        }
    });
    
    loginBtn.addEventListener('click', handleLogin);
    
    // 按Enter键也可以登录
    document.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            handleLogin();
        }
    });
    
    // 初始化：获取服务器列表
    fetchServers();
});
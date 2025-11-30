from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit, join_room, leave_room
import json
import os
from datetime import datetime

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app, cors_allowed_origins="*")

# 存储在线用户信息
online_users = {}
room_name = 'chat_room'

# 配置文件路径
CONFIG_FILE = 'config.json'

# 读取配置文件
def read_config():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return {'servers': ['http://localhost:5000']}
    else:
        # 创建默认配置
        default_config = {'servers': ['http://localhost:5000']}
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(default_config, f, ensure_ascii=False, indent=2)
        return default_config

# 检查昵称是否已存在
def is_nickname_used(nickname):
    for user in online_users.values():
        if user['nickname'] == nickname:
            return True
    return False

# 首页路由，重定向到登录页面
@app.route('/')
def index():
    return redirect('/login')

# 登录页面路由
@app.route('/login')
def login():
    return render_template('login.html')

# 聊天室页面路由
@app.route('/chat')
def chat():
    nickname = request.args.get('nickname')
    if not nickname or is_nickname_used(nickname):
        return redirect('/login')
    return render_template('chat.html', nickname=nickname)

# 获取服务器列表API
@app.route('/api/servers')
def get_servers():
    config = read_config()
    return jsonify(config['servers'])

# 验证昵称API
@app.route('/api/validate_nickname', methods=['POST'])
def validate_nickname():
    data = request.get_json()
    nickname = data.get('nickname')
    if not nickname or len(nickname.strip()) == 0:
        return jsonify({'valid': False, 'message': '昵称不能为空'})
    if is_nickname_used(nickname):
        return jsonify({'valid': False, 'message': '昵称已被使用'})
    return jsonify({'valid': True})

# WebSocket事件处理

@socketio.on('connect')
def handle_connect():
    print('客户端已连接')

@socketio.on('disconnect')
def handle_disconnect():
    sid = request.sid
    if sid in online_users:
        nickname = online_users[sid]['nickname']
        del online_users[sid]
        # 广播用户离开消息
        emit('user_left', {'nickname': nickname, 'timestamp': get_current_time()}, room=room_name, broadcast=True)
        # 更新在线用户列表
        update_online_users()
        print(f'用户 {nickname} 已离开')

@socketio.on('join_room')
def handle_join_room(data):
    sid = request.sid
    nickname = data.get('nickname')
    
    # 检查昵称是否已被使用
    if is_nickname_used(nickname):
        emit('join_error', {'message': '昵称已被使用'})
        return
    
    # 存储用户信息
    online_users[sid] = {
        'nickname': nickname,
        'joined_at': get_current_time()
    }
    
    # 加入聊天室
    join_room(room_name)
    
    # 发送成功加入消息给当前用户
    emit('join_success', {'message': f'成功加入聊天室，{nickname}！'})
    
    # 广播新用户加入消息
    emit('user_joined', {
        'nickname': nickname,
        'timestamp': get_current_time()
    }, room=room_name, broadcast=True)
    
    # 更新在线用户列表
    update_online_users()
    
    print(f'用户 {nickname} 已加入聊天室')

@socketio.on('send_message')
def handle_send_message(data):
    sid = request.sid
    if sid not in online_users:
        return
    
    nickname = online_users[sid]['nickname']
    message_type = data.get('type', 'text')  # 从客户端获取消息类型
    message_text = ''
    
    # 根据消息类型获取内容
    if message_type in ['movie', 'ai_chat', 'maxence_chat']:
        # 客户端已经处理了@命令，直接使用content字段
        message_text = data.get('content', '')
    else:
        # 普通文本消息
        message_text = data.get('message', '')
        
        # 如果是普通消息但以@开头，在服务器端也进行处理（兼容性）
        if message_text.startswith('@'):
            parts = message_text.split(' ', 1)
            if len(parts) >= 1:
                command = parts[0].lower()
                if command == '@电影' and len(parts) == 2:
                    message_type = 'movie'
                    message_text = parts[1].strip()
                elif command == '@川小农':
                    message_type = 'ai_chat'
                    # 提取@川小农后面的内容作为AI查询
                    if len(parts) > 1:
                        message_text = parts[1].strip()
                    else:
                        message_text = ''
                elif command == '@maxence':
                    message_type = 'maxence_chat'
                    # 提取@maxence后面的内容作为查询
                    if len(parts) > 1:
                        message_text = parts[1].strip()
                    else:
                        message_text = ''
    
    # 构建消息对象
    message = {
        'nickname': nickname,
        'content': message_text,
        'type': message_type,
        'timestamp': get_current_time()
    }
    
    # 广播消息给所有用户
    emit('new_message', message, room=room_name, broadcast=True)
    print(f'消息来自 {nickname}: {message_text}')

@socketio.on('leave_room')
def handle_leave_room():
    sid = request.sid
    if sid in online_users:
        nickname = online_users[sid]['nickname']
        leave_room(room_name)
        del online_users[sid]
        
        # 广播用户离开消息
        emit('user_left', {
            'nickname': nickname,
            'timestamp': get_current_time()
        }, room=room_name, broadcast=True)
        
        # 更新在线用户列表
        update_online_users()
        print(f'用户 {nickname} 已离开聊天室')

# 更新在线用户列表
def update_online_users():
    users = [user['nickname'] for user in online_users.values()]
    emit('update_users', {'users': users}, room=room_name, broadcast=True)

# 获取当前时间
def get_current_time():
    return datetime.now().strftime('%Y-%m-%d %H:%M:%S')

# 修复缺少的redirect导入
from flask import redirect

if __name__ == '__main__':
    # 启动服务器前确保配置文件存在
    read_config()
    print('服务器已启动，监听端口5000...')
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)

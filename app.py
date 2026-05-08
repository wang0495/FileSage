"""
FileSage - 智能文件管家
Flask 后端主文件
"""

import os
import sqlite3
import mimetypes
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory, render_template
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100MB 上传限制
app.config['DATABASE'] = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'filesage.db')

# 确保上传目录存在
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# 文件类型分类映射
CATEGORY_MAP = {
    'image': {'ext': {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.ico', '.tiff', '.tif'}, 'label': '图片', 'icon': 'fa-image', 'color': '#a855f7'},
    'document': {'ext': {'.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.rtf', '.odt', '.csv'}, 'label': '文档', 'icon': 'fa-file-alt', 'color': '#3b82f6'},
    'video': {'ext': {'.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.webm', '.m4v'}, 'label': '视频', 'icon': 'fa-video', 'color': '#ef4444'},
    'audio': {'ext': {'.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma', '.m4a'}, 'label': '音频', 'icon': 'fa-music', 'color': '#f59e0b'},
    'code': {'ext': {'.py', '.js', '.html', '.css', '.java', '.cpp', '.c', '.h', '.go', '.rs', '.ts', '.json', '.xml', '.yaml', '.yml', '.md', '.sh', '.sql', '.php', '.rb', '.swift', '.kt'}, 'label': '代码', 'icon': 'fa-code', 'color': '#10b981'},
    'archive': {'ext': {'.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz', '.iso'}, 'label': '压缩包', 'icon': 'fa-file-archive', 'color': '#f97316'},
    'other': {'ext': set(), 'label': '其他', 'icon': 'fa-file', 'color': '#6b7280'},
}


def get_db():
    """获取数据库连接"""
    db = sqlite3.connect(app.config['DATABASE'])
    db.row_factory = sqlite3.Row
    return db


def init_db():
    """初始化数据库"""
    db = get_db()
    db.execute('''
        CREATE TABLE IF NOT EXISTS files (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            original_name TEXT NOT NULL,
            size INTEGER NOT NULL,
            mime_type TEXT,
            category TEXT NOT NULL,
            upload_time TEXT NOT NULL,
            description TEXT DEFAULT ''
        )
    ''')
    db.commit()
    db.close()


def get_file_category(filename):
    """根据文件扩展名获取分类"""
    _, ext = os.path.splitext(filename)
    ext = ext.lower()
    for category, info in CATEGORY_MAP.items():
        if category == 'other':
            continue
        if ext in info['ext']:
            return category
    return 'other'


def format_size(size_bytes):
    """格式化文件大小"""
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size_bytes < 1024.0:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024.0
    return f"{size_bytes:.1f} TB"


# ========== 路由 ==========

@app.route('/')
def index():
    """渲染主页面"""
    return render_template('index.html')


@app.route('/api/files', methods=['GET'])
def get_files():
    """获取文件列表，支持分类筛选和搜索"""
    category = request.args.get('category', '')
    search = request.args.get('search', '')
    sort = request.args.get('sort', 'time')
    order = request.args.get('order', 'desc')

    db = get_db()
    query = 'SELECT * FROM files'
    conditions = []
    params = []

    if category:
        conditions.append('category = ?')
        params.append(category)

    if search:
        conditions.append('(original_name LIKE ? OR description LIKE ?)')
        params.extend([f'%{search}%', f'%{search}%'])

    if conditions:
        query += ' WHERE ' + ' AND '.join(conditions)

    # 排序
    sort_map = {
        'name': 'original_name',
        'size': 'size',
        'time': 'upload_time',
        'type': 'category'
    }
    sort_col = sort_map.get(sort, 'upload_time')
    order_dir = 'DESC' if order == 'desc' else 'ASC'
    query += f' ORDER BY {sort_col} {order_dir}'

    rows = db.execute(query, params).fetchall()
    db.close()

    files = []
    for row in rows:
        cat_info = CATEGORY_MAP.get(row['category'], CATEGORY_MAP['other'])
        files.append({
            'id': row['id'],
            'filename': row['filename'],
            'original_name': row['original_name'],
            'size': row['size'],
            'size_formatted': format_size(row['size']),
            'mime_type': row['mime_type'],
            'category': row['category'],
            'category_label': cat_info['label'],
            'category_icon': cat_info['icon'],
            'category_color': cat_info['color'],
            'upload_time': row['upload_time'],
            'description': row['description'],
        })

    return jsonify({'files': files, 'total': len(files)})


@app.route('/api/upload', methods=['POST'])
def upload_file():
    """上传文件"""
    if 'file' not in request.files:
        return jsonify({'error': '没有选择文件'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': '文件名为空'}), 400

    filename = secure_filename(file.filename)
    if not filename:
        # 如果 secure_filename 清空了文件名，使用时间戳
        ext = os.path.splitext(file.filename)[1] if file.filename else ''
        filename = datetime.now().strftime('%Y%m%d%H%M%S') + ext

    # 处理重名文件
    base, ext = os.path.splitext(filename)
    counter = 1
    final_name = filename
    while os.path.exists(os.path.join(app.config['UPLOAD_FOLDER'], final_name)):
        final_name = f"{base}_{counter}{ext}"
        counter += 1

    save_path = os.path.join(app.config['UPLOAD_FOLDER'], final_name)
    file.save(save_path)

    # 获取文件信息
    file_size = os.path.getsize(save_path)
    mime_type = mimetypes.guess_type(final_name)[0] or 'application/octet-stream'
    category = get_file_category(final_name)
    upload_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    # 存入数据库
    db = get_db()
    db.execute(
        'INSERT INTO files (filename, original_name, size, mime_type, category, upload_time) VALUES (?, ?, ?, ?, ?, ?)',
        (final_name, file.filename, file_size, mime_type, category, upload_time)
    )
    db.commit()
    file_id = db.execute('SELECT last_insert_rowid()').fetchone()[0]
    db.close()

    cat_info = CATEGORY_MAP.get(category, CATEGORY_MAP['other'])
    return jsonify({
        'message': '文件上传成功',
        'file': {
            'id': file_id,
            'filename': final_name,
            'original_name': file.filename,
            'size': file_size,
            'size_formatted': format_size(file_size),
            'mime_type': mime_type,
            'category': category,
            'category_label': cat_info['label'],
            'category_icon': cat_info['icon'],
            'category_color': cat_info['color'],
            'upload_time': upload_time,
        }
    }), 201


@app.route('/api/files/<filename>', methods=['DELETE'])
def delete_file(filename):
    """删除文件"""
    db = get_db()
    row = db.execute('SELECT * FROM files WHERE filename = ?', (filename,)).fetchone()

    if not row:
        db.close()
        return jsonify({'error': '文件不存在'}), 404

    # 删除物理文件
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    if os.path.exists(file_path):
        os.remove(file_path)

    # 从数据库删除
    db.execute('DELETE FROM files WHERE filename = ?', (filename,))
    db.commit()
    db.close()

    return jsonify({'message': '文件删除成功'})


@app.route('/api/stats', methods=['GET'])
def get_stats():
    """获取文件统计信息"""
    db = get_db()

    # 总文件数和总大小
    total_row = db.execute('SELECT COUNT(*) as count, COALESCE(SUM(size), 0) as total_size FROM files').fetchone()
    total_files = total_row['count']
    total_size = total_row['total_size']

    # 各分类统计
    category_stats = {}
    for cat_key, cat_info in CATEGORY_MAP.items():
        row = db.execute('SELECT COUNT(*) as count, COALESCE(SUM(size), 0) as total_size FROM files WHERE category = ?', (cat_key,)).fetchone()
        if row['count'] > 0:
            category_stats[cat_key] = {
                'count': row['count'],
                'size': row['total_size'],
                'size_formatted': format_size(row['total_size']),
                'label': cat_info['label'],
                'icon': cat_info['icon'],
                'color': cat_info['color'],
                'percentage': round(row['count'] / total_files * 100, 1) if total_files > 0 else 0
            }

    # 最近上传的文件
    recent_files = db.execute('SELECT * FROM files ORDER BY upload_time DESC LIMIT 5').fetchall()
    recent = []
    for row in recent_files:
        cat_info = CATEGORY_MAP.get(row['category'], CATEGORY_MAP['other'])
        recent.append({
            'filename': row['filename'],
            'original_name': row['original_name'],
            'size_formatted': format_size(row['size']),
            'category': row['category'],
            'category_label': cat_info['label'],
            'category_icon': cat_info['icon'],
            'category_color': cat_info['color'],
            'upload_time': row['upload_time'],
        })

    db.close()

    return jsonify({
        'total_files': total_files,
        'total_size': total_size,
        'total_size_formatted': format_size(total_size),
        'categories': category_stats,
        'recent_files': recent,
    })


@app.route('/api/files/<filename>/preview', methods=['GET'])
def preview_file(filename):
    """预览文件"""
    db = get_db()
    row = db.execute('SELECT * FROM files WHERE filename = ?', (filename,)).fetchone()
    db.close()

    if not row:
        return jsonify({'error': '文件不存在'}), 404

    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    if not os.path.exists(file_path):
        return jsonify({'error': '文件已被删除'}), 404

    category = row['category']
    mime_type = row['mime_type']

    # 图片类型直接返回文件
    if category == 'image':
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

    # 文本/代码类型返回内容
    if category in ('code', 'document') and mime_type and (
        mime_type.startswith('text/') or
        mime_type in ('application/json', 'application/xml', 'application/javascript') or
        filename.endswith(('.py', '.js', '.html', '.css', '.java', '.cpp', '.c', '.h', '.go', '.rs', '.ts', '.json', '.xml', '.yaml', '.yml', '.md', '.sh', '.sql', '.txt', '.csv', '.log'))
    ):
        try:
            # 尝试多种编码
            content = None
            for encoding in ['utf-8', 'gbk', 'gb2312', 'latin-1']:
                try:
                    with open(file_path, 'r', encoding=encoding) as f:
                        content = f.read(50000)  # 限制预览大小
                    break
                except (UnicodeDecodeError, UnicodeError):
                    continue

            if content is None:
                return jsonify({'error': '无法读取文件内容', 'type': 'binary'}), 400

            return jsonify({
                'filename': row['original_name'],
                'content': content,
                'type': 'text',
                'mime_type': mime_type,
                'category': category,
            })
        except Exception as e:
            return jsonify({'error': f'读取文件失败: {str(e)}'}), 500

    # PDF 返回文件
    if mime_type == 'application/pdf':
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

    # 视频和音频返回文件路径
    if category in ('video', 'audio'):
        return jsonify({
            'filename': row['original_name'],
            'type': category,
            'url': f'/uploads/{filename}',
            'mime_type': mime_type,
        })

    # 其他类型
    return jsonify({
        'filename': row['original_name'],
        'type': 'binary',
        'mime_type': mime_type,
        'category': category,
        'category_label': CATEGORY_MAP.get(category, CATEGORY_MAP['other'])['label'],
        'size_formatted': format_size(row['size']),
    })


@app.route('/uploads/<filename>')
def serve_upload(filename):
    """提供上传文件的静态访问"""
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)


# ========== 错误处理 ==========

@app.errorhandler(413)
def request_entity_too_large(error):
    return jsonify({'error': '文件大小超过限制（最大 100MB）'}), 413


@app.errorhandler(404)
def not_found(error):
    if request.path.startswith('/api/'):
        return jsonify({'error': '接口不存在'}), 404
    return render_template('index.html')


# ========== 启动 ==========

if __name__ == '__main__':
    init_db()
    print("=" * 50)
    print("  FileSage - 智能文件管家")
    print("  服务启动于: http://127.0.0.1:5000")
    print("=" * 50)
    app.run(debug=True, host='0.0.0.0', port=5000)

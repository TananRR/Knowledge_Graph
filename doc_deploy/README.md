# 项目部署文档（Docker 版）

## 一、项目结构说明 

SHIXUN/
├── backend/ # Django 后端代码（含 manage.py、db.sqlite3 等）
├── deploy/ # Docker 部署配置（docker-compose.yml、.env.example 等）
│ ├── docker-compose.yml
│ ├── .env.example
│ ├── Dockerfile.backend
│ └── nginx/conf.d/default.conf # Nginx 配置
├── frontend/ # 前端静态资源（index.html、static 目录等）
├── kg_modules/ # Neo4j 连接模块、工具代码
├── tests/ # 测试用例（可选）
├── .gitignore # Git 忽略规则
├── Makefile # 自动化脚本（可选）
├── README.md # 部署文档（你正在看的）
└── requirements.txt # Python 依赖

## 二、部署准备  
### 1. 安装依赖  
- 确保已安装：  
  - [Docker](https://docs.docker.com/get-docker/)（容器运行环境）  
  - [Docker Compose](https://docs.docker.com/compose/install/)（多容器编排工具）  


## 三、部署步骤  

### 1. 克隆代码（如果还没）  

git clone https://github.com/your-username/your-project.git
cd your-project

2. 配置环境变量
复制示例文件，并重命名为 .env（敏感信息不要提交到代码仓库）：
cp deploy/.env.example deploy/.env
编辑 deploy/.env，填写真实值：
ini
NEO4J_AUTH=neo4j/yourpassword   # Neo4j 登录密码
NEO4J_DB_NAME=your_database     # Neo4j 数据库名
DJANGO_SECRET_KEY=your-secret   # Django 密钥（生产环境必填）

3. 启动服务（开发环境）
在项目根目录执行：
docker-compose -f deploy/docker-compose.yml up -d --build
-f deploy/docker-compose.yml：指定 Compose 文件路径
--build：首次启动或代码更新后，强制构建镜像
-d：后台运行

4. 验证服务是否正常
前端：浏览器访问 http://localhost（Nginx 监听 80 端口），应显示 frontend/index.html 内容。
Django 后端：浏览器访问 http://localhost:8000，应显示 Django 欢迎页或 API 接口。
Neo4j 数据库：浏览器访问 http://localhost:7474，用 NEO4J_AUTH 配置的账号密码登录，验证数据库连接。
5. 常用命令
创建容器
bash
docker-compose -f 'deploy\docker-compose.yml' up -d --build

查看日志（所有服务）：
bash
docker-compose -f deploy/docker-compose.yml logs -f

停止并移除服务：
bash
docker-compose -f deploy/docker-compose.yml down

进入 Django 容器调试：
bash
docker-compose -f deploy/docker-compose.yml exec backend bash

四、端口说明
服务	容器端口	主机映射端口     说明
Django  后端	    8000:8000      开发环境 API 访问端口
Neo4j   数据库	    7474:7474	   Web 管理界面（浏览器访问）
Neo4j   数据库	    7687:7687	   Bolt 协议（Django 连接）
前端    Nginx	    80:80	       前端静态资源访问端口

五、生产环境注意事项
关闭 DEBUG 模式：
修改 deploy/.env 中 DJANGO_DEBUG=False，并设置 DJANGO_ALLOWED_HOSTS=your-domain.com。
优化镜像构建：
生产环境建议将 Dockerfile.backend 中的 requirements.txt 安装和代码复制分开，利用 Docker 缓存。
数据持久化：
Neo4j 的 neo4j_data 卷已持久化，确保数据库数据不会因容器删除丢失。
反向代理与 HTTPS：
生产环境建议在 Nginx 外层再加一层反向代理（如 Traefik、Caddy），并配置 HTTPS。
使用提示
如果前端是 Vue/React 等单页应用，确保 nginx/conf.d/default.conf 中 try_files $uri $uri/ /index.html; 已配置，避免路由 404。
Django 连接 Neo4j 时，在代码中用 bolt://neo4j:7687（服务名 neo4j 是 Docker Compose 自动解析的主机名）。
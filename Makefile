# 定义项目名称
PROJECT_NAME = deploy

# 启动所有服务
start:
	docker-compose -p $(PROJECT_NAME) up -d

# 停止所有服务
stop:
	docker-compose -p $(PROJECT_NAME) down

# 重建并启动所有服务
rebuild:
	docker-compose -p $(PROJECT_NAME) up -d --build

# 查看服务日志
logs:
	docker-compose -p $(PROJECT_NAME) logs -f

# 进入后端服务容器
backend-shell:
	docker-compose -p $(PROJECT_NAME) exec backend bash

# 进入前端服务容器
frontend-shell:
	docker-compose -p $(PROJECT_NAME) exec frontend sh

# 进入 Neo4j 服务容器
neo4j-shell:
	docker-compose -p $(PROJECT_NAME) exec neo4j bash

# 清理所有容器和数据卷
clean:
	docker-compose -p $(PROJECT_NAME) down -v

test:
	python backend/manage.py test backend.tests
from py2neo import Graph

# Neo4j连接配置
NEO4J_URL = "bolt://localhost:7687"
NEO4J_USER = "neo4j"
NEO4J_PASSWORD = "testpassword"  # 和docker-compose.yml中设置的一致

graph = Graph(NEO4J_URL, auth=(NEO4J_USER, NEO4J_PASSWORD))

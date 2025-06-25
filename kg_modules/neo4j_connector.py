from py2neo import Graph
from django.conf import settings

# Neo4j连接配置
NEO4J_URL = "bolt://localhost:7687"
NEO4J_USER = "neo4j"
NEO4J_PASSWORD = "testpassword"  # 和docker-compose.yml中设置的一致

# def get_neo4j_graph():
#     return Graph(
#         settings.NEO4J_URI,
#         auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD)
#     )
# def get_neo4j_graph():
#     try:
#         return Graph(
#             settings.NEO4J_URI,
#             auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD)
#         )
#     except Exception as e:
#         print("Neo4j连接失败：", e)
#         raise

def get_neo4j_graph():
    return Graph(
        scheme="bolt",
        host="neo4j",  # 关键修改：使用服务名而非 localhost
        port=7687,
        auth=("neo4j", "testpassword"),
    )

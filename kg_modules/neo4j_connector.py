from neo4j import GraphDatabase

# 配置你的 Neo4j 连接信息
URI = "bolt://localhost:7687"
USER = "neo4j"
PASSWORD = "testpassword"  # 替换为你的实际密码

driver = GraphDatabase.driver(URI, auth=(USER, PASSWORD))


def run_cypher(query, parameters=None):
    with driver.session() as session:
        result = session.run(query, parameters)
        return [dict(record) for record in result]

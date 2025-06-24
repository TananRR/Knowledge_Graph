# kg_modules/neo4j_connector.py

from py2neo import Graph

# Neo4j连接配置
NEO4J_URL = "bolt://localhost:7687"
NEO4J_USER = "neo4j"
NEO4J_PASSWORD = "testpassword"

graph = Graph(NEO4J_URL, auth=(NEO4J_USER, NEO4J_PASSWORD))

def run_cypher(cypher_query, parameters=None):
    result = graph.run(cypher_query, parameters or {})
    return [dict(record) for record in result]
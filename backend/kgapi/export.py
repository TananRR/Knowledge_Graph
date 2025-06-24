import json
from django.http import JsonResponse, HttpResponse
from django.views.decorators.http import require_http_methods
from neo4j import GraphDatabase

# Neo4j 数据库连接配置
NEO4J_URI = "bolt://localhost:7687"
NEO4J_USER = "neo4j"
NEO4J_PASSWORD = "testpassword"

# 初始化 Neo4j 驱动
driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))


@require_http_methods(["GET"])
def export_knowledge_graph(request):
    """
    导出知识图谱的接口
    """
    try:
        # 查询知识图谱中的所有节点和关系
        data = query_knowledge_graph()

        # 将数据导出为 JSON 文件
        export_to_json(data)

        # 返回成功响应
        return JsonResponse({"message": "知识图谱已成功导出为 JSON 文件"}, status=200)

    except Exception as e:
        # 返回错误响应
        return JsonResponse({"error": str(e)}, status=500)


def query_knowledge_graph():
    """
    查询知识图谱中的所有节点和关系
    """
    with driver.session() as session:
        result = session.run("""
            MATCH (n)-[r]->(m)
            RETURN n, r, m
        """)

        # 将查询结果转换为字典格式
        data = []
        for record in result:
            node1 = record["n"].items()
            relationship = record["r"].items()
            node2 = record["m"].items()
            data.append({
                "node1": dict(node1),
                "relationship": dict(relationship),
                "node2": dict(node2)
            })

        return data


def export_to_json(data):
    """
    将数据导出为 JSON 文件
    """
    file_path = "knowledge_graph_export.json"
    with open(file_path, "w", encoding="utf-8") as file:
        json.dump(data, file, ensure_ascii=False, indent=4)
    print(f"知识图谱已导出到文件：{file_path}")
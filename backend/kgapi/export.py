import json
from django.http import JsonResponse, HttpResponse
from django.views.decorators.http import require_http_methods
from neo4j import GraphDatabase

# Neo4j 数据库连接配置
NEO4J_URI = "bolt://neo4j:7687"
NEO4J_USER = "neo4j"
NEO4J_PASSWORD = "testpassword"

# 初始化 Neo4j 驱动
driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))


@require_http_methods(["GET"])
def export_knowledge_graph(request):
    """
    导出知识图谱的接口：
    - 若无参数，则直接返回 JSON 数据用于前端渲染；
    - 若带有 ?download=true 参数，则作为附件下载 JSON 文件。
    """
    try:
        data = query_knowledge_graph()

        # 判断是否需要作为附件下载
        if request.GET.get("download") == "true":
            response = HttpResponse(
                json.dumps(data, ensure_ascii=False, indent=4),
                content_type="application/json"
            )
            response["Content-Disposition"] = 'attachment; filename="knowledge_graph_export.json"'
            return response

        # 否则返回 JSON 对象（前端渲染用）
        return JsonResponse(data, safe=False)

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


def query_knowledge_graph():
    """
    查询知识图谱中的所有节点和关系
    """
    with driver.session() as session:
        result = session.run("""
            MATCH (n)-[r]->(m)
            RETURN n, type(r) as rel_type, m
        """)

        data = []
        for record in result:
            node1 = dict(record["n"])  # 将 Node 转为 dict
            node2 = dict(record["m"])  # 将 Node 转为 dict
            rel_type = record["rel_type"]

            data.append({
                "node1": node1,
                "relationship": {"type": rel_type},
                "node2": node2
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

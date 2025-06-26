import json
from django.http import JsonResponse, HttpResponse
from django.views.decorators.http import require_http_methods
from neo4j import GraphDatabase
from .kg_writer import query_subgraph

# Neo4j 数据库连接配置
NEO4J_URI = "bolt://neo4j:7687"
NEO4J_USER = "neo4j"
NEO4J_PASSWORD = "testpassword"

# 初始化 Neo4j 驱动
driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))


@require_http_methods(["GET"])
def export_knowledge_graph(request):
    try:
        graph_id = request.GET.get("graph_id")
        user_id = request.GET.get("user_id")

        with driver.session() as session:
            if graph_id:
                data = query_subgraph(session, graph_id=graph_id)
            elif user_id:
                data = query_subgraph(session, user_id=user_id)
            else:
                data = query_subgraph(session)  # 查询全部

        if request.GET.get("download") == "true":
            response = HttpResponse(
                json.dumps(data, ensure_ascii=False, indent=4),
                content_type="application/json"
            )
            filename = f"graph_{graph_id or user_id or 'all'}.json"
            response["Content-Disposition"] = f'attachment; filename="{filename}"'
            return response

        return JsonResponse(data, safe=False)

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

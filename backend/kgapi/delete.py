import json
from django.http import JsonResponse, HttpResponse
from django.views.decorators.http import require_http_methods
from neo4j import GraphDatabase
from .kg_writer import clear_all_graphs, clear_graph_by_id, clear_graphs_by_user

# Neo4j 数据库连接配置
NEO4J_URI = "bolt://neo4j:7687"
NEO4J_USER = "neo4j"
NEO4J_PASSWORD = "testpassword"

# 初始化 Neo4j 驱动
driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))


@require_http_methods(["DELETE"])
def delete_all_graphs(request):
    try:
        with driver.session() as session:
            clear_all_graphs(session)
        return JsonResponse({"message": "所有图谱已成功删除。"})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@require_http_methods(["DELETE"])
def delete_graph_by_id(request):
    try:
        graph_id = request.GET.get("graph_id")
        if not graph_id:
            return JsonResponse({"error": "graph_id 参数缺失"}, status=400)

        with driver.session() as session:
            clear_graph_by_id(session, graph_id)
        return JsonResponse({"message": f"图谱 graph_id={graph_id} 已成功删除。"})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@require_http_methods(["DELETE"])
def delete_graphs_by_user(request):
    try:
        user_id = request.GET.get("user_id")
        if not user_id:
            return JsonResponse({"error": "user_id 参数缺失"}, status=400)

        with driver.session() as session:
            clear_graphs_by_user(session, user_id)
        return JsonResponse({"message": f"用户 user_id={user_id} 的所有图谱已成功删除。"})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
import json
from django.http import JsonResponse, HttpResponse
from django.views.decorators.http import require_http_methods
from neo4j import GraphDatabase
from .kg_writer import query_graph,list_user_graphs,query_graphs_by_user,query_all_graphs

# Neo4j 数据库连接配置
NEO4J_URI = "bolt://neo4j:7687"
NEO4J_USER = "neo4j"
NEO4J_PASSWORD = "testpassword"

# 初始化 Neo4j 驱动
driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))


@require_http_methods(["GET"])
def get_graph_by_id(request):
    try:
        graph_id = request.GET.get("graph_id")
        if not graph_id:
            return JsonResponse({"error": "graph_id 参数缺失"}, status=400)

        with driver.session() as session:
            graph_data = query_graph(session, graph_id)

        return JsonResponse(graph_data, safe=False)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@require_http_methods(["GET"])
def get_user_graph_ids(request):
    try:
        user_id = request.GET.get("user_id")
        if not user_id:
            return JsonResponse({"error": "user_id 参数缺失"}, status=400)

        with driver.session() as session:
            graph_ids = list_user_graphs(session, user_id)

        return JsonResponse({"user_id": user_id, "graph_ids": graph_ids})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@require_http_methods(["GET"])
def get_graphs_by_user(request):
    try:
        user_id = request.GET.get("user_id")
        if not user_id:
            return JsonResponse({"error": "user_id 参数缺失"}, status=400)

        with driver.session() as session:
            graphs_data = query_graphs_by_user(session, user_id)

        return JsonResponse(graphs_data, safe=False)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@require_http_methods(["GET"])
def get_all_graphs(request):
    try:
        with driver.session() as session:
            all_graphs_data = query_all_graphs(session)
        return JsonResponse(all_graphs_data, safe=False)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
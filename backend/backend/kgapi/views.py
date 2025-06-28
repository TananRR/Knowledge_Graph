from django.http import JsonResponse
from .kg_writer import query_subgraph
from neo4j import GraphDatabase

import logging

logger = logging.getLogger(__name__)

# Neo4j 数据库连接配置
NEO4J_URI = "bolt://neo4j:7687"
NEO4J_USER = "neo4j"
NEO4J_PASSWORD = "testpassword"

driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))


def search_entity(request):
    keyword = request.GET.get("q", "")
    if not keyword:
        return JsonResponse({"error": "请提供关键词参数 ?q=xxx"}, status=400)

    try:
        with driver.session() as session:
            graph_data = query_subgraph(session, keyword=keyword)

            # 转换格式保持兼容
            entities = [
                {
                    **node["properties"],
                    "type": node["labels"][0] if node["labels"] else "Unknown"
                }
                for node in graph_data["nodes"]
            ]

            return JsonResponse({"results": entities}, safe=False)

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
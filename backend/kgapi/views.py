# backend/kgapi/views.py

from django.http import JsonResponse
from kg_modules.neo4j_connector import run_cypher

def search_entity(request):
    keyword = request.GET.get("q", "")
    if not keyword:
        return JsonResponse({"error": "请提供关键词参数 ?q=xxx"}, status=400)

    cypher = """
    MATCH (n)
    WHERE n.name CONTAINS $name
    RETURN n LIMIT 20
    """
    try:
        result = run_cypher(cypher, {"name": keyword})
        return JsonResponse(result, safe=False)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
from django.http import JsonResponse
from kg_modules.neo4j_connector import run_cypher

import logging

logger = logging.getLogger(__name__)


def search_entity(request):
    logger.info(f"搜索请求: {request.GET}")

    keyword = request.GET.get("q", "")
    if not keyword:
        logger.warning("未提供搜索关键词")
        return JsonResponse({"error": "请提供关键词参数 ?q=xxx"}, status=400)

    logger.info(f"执行搜索: {keyword}")

    cypher = """
    MATCH (n)
    WHERE 
        toLower(n.name) CONTAINS toLower($name) OR
        toString(n.id) CONTAINS $name
    RETURN 
        n,
        labels(n) AS labels
    LIMIT 20
    """

    try:
        logger.debug(f"执行Cypher查询: {cypher}")
        from kg_modules.neo4j_connector import run_cypher
        result = run_cypher(cypher, {"name": keyword})
        logger.info(f"查询结果: {len(result)} 条记录")

        entities = []
        for record in result:
            node = record['n']
            labels = record['labels']

            entity = dict(node)
            entity['type'] = labels[0] if labels else "Unknown"

            entities.append(entity)

        logger.debug(f"返回结果: {entities}")
        return JsonResponse({"results": entities}, safe=False)

    except Exception as e:
        logger.exception("搜索失败")
        return JsonResponse({"error": str(e)}, status=500)
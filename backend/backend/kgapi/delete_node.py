import json
from django.http import JsonResponse
from neo4j import GraphDatabase
from django.views.decorators.csrf import csrf_exempt
import logging

# 配置日志
logger = logging.getLogger(__name__)

# Neo4j 连接配置
NEO4J_URI = "bolt://neo4j:7687"
NEO4J_USER = "neo4j"
NEO4J_PASSWORD = "testpassword"

# 初始化Neo4j驱动
driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))


@csrf_exempt
def delete_node(request):
    """
    支持DELETE和POST方法，兼容URL参数和JSON body
    """
    # 记录请求信息
    logger.info(f"Request method: {request.method}, Body: {request.body}, GET params: {request.GET}")

    # 方法检查
    if request.method not in ['DELETE', 'POST']:
        return JsonResponse({
            'success': False,
            'message': 'Only DELETE or POST methods are allowed'
        }, status=405)

    # 参数获取逻辑
    graph_id = None
    node_id = None

    # 尝试从JSON body获取
    try:
        if request.body:
            data = json.loads(request.body)
            graph_id = data.get('graph_id')
            node_id = data.get('node_id')
    except json.JSONDecodeError:
        pass

    # 如果JSON中没有，尝试从GET参数获取
    if not all([graph_id, node_id]):
        graph_id = request.GET.get('graph_id')
        node_id = request.GET.get('node_id')

    # 参数验证
    if not graph_id or not node_id:
        return JsonResponse({
            'success': False,
            'message': 'Missing required parameters: graph_id and node_id'
        }, status=400)

    # Neo4j操作
    try:
        with driver.session() as session:
            deleted_count = session.execute_write(
                _delete_node_from_neo4j,
                graph_id,
                node_id
            )

            if deleted_count == 0:
                return JsonResponse({
                    'success': False,
                    'message': f'Node {node_id} not found in graph {graph_id}'
                }, status=404)

            return JsonResponse({
                'success': True,
                'message': f'Node {node_id} deleted successfully from graph {graph_id}'
            })

    except Exception as e:
        logger.error(f"Error deleting node: {str(e)}", exc_info=True)
        return JsonResponse({
            'success': False,
            'message': f'Server error: {str(e)}'
        }, status=500)


def _delete_node_from_neo4j(tx, graph_id, node_id):
    """Neo4j事务函数"""
    query = """
    MATCH (n {id: $node_id, graph_id: $graph_id})
    DETACH DELETE n
    RETURN count(n) as deleted_count
    """
    result = tx.run(query, node_id=node_id, graph_id=graph_id)
    return result.single()["deleted_count"]
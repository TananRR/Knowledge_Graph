from django.http import JsonResponse
from neo4j import GraphDatabase

# Neo4j 连接配置
NEO4J_URI = "bolt://neo4j:7687"
NEO4J_USER = "neo4j"
NEO4J_PASSWORD = "testpassword"  # 你的密码

# 初始化Neo4j驱动（可以放在类或模块级别）
driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))

def delete_node(request):
    """
    Django 视图函数，处理节点删除请求
    """
    if request.method != 'DELETE':
        return JsonResponse({
            'success': False,
            'message': 'Method not allowed'
        }, status=405)

    graph_id = request.GET.get('graph_id')
    node_id = request.GET.get('node_id')

    if not graph_id or not node_id:
        return JsonResponse({
            'success': False,
            'message': 'Missing graph_id or node_id parameter'
        }, status=400)

    try:
        with driver.session() as session:
            deleted_count = session.execute_write(
                _delete_node_from_neo4j, graph_id, node_id
            )

            if deleted_count == 0:
                return JsonResponse({
                    'success': False,
                    'message': f'Node {node_id} not found in graph {graph_id}'
                }, status=404)

            return JsonResponse({
                'success': True,
                'message': f'Node {node_id} and its relationships deleted successfully from graph {graph_id}'
            })

    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': f'Error deleting node: {str(e)}'
        }, status=500)

def _delete_node_from_neo4j(tx, graph_id, node_id):
    """
    Neo4j 事务函数，实际执行删除操作
    """
    query = """
    MATCH (n {id: $node_id, graph_id: $graph_id})
    DETACH DELETE n
    RETURN count(n) as deleted_count
    """
    result = tx.run(query, node_id=node_id, graph_id=graph_id)
    return result.single()["deleted_count"]
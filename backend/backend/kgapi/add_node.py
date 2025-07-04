from django.http import JsonResponse
from neo4j import GraphDatabase
import uuid

# Neo4j 配置（可与delete_node共用）
NEO4J_URI = "bolt://neo4j:7687"
NEO4J_USER = "neo4j"
NEO4J_PASSWORD = "testpassword"
driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))

def add_node(request):
    """
    添加节点并建立关系的Django视图
    """
    if request.method != 'POST':
        return JsonResponse({
            'success': False,
            'message': 'Method not allowed'
        }, status=405)

    try:
        # 处理JSON输入
        import json
        data = json.loads(request.body)
    except:
        return JsonResponse({
            'success': False,
            'message': 'Invalid JSON data'
        }, status=400)

    graph_id = data.get('graph_id')
    source_node_id = data.get('source_node_id')
    new_node = data.get('new_node', {})
    link = data.get('link')

    if not all([graph_id, source_node_id, new_node, link]):
        return JsonResponse({
            'success': False,
            'message': 'Missing required fields: graph_id, source_node_id, new_node or link'
        }, status=400)

    try:
        with driver.session() as session:
            new_node_id = session.execute_write(
                _add_node_to_neo4j, graph_id, source_node_id, new_node, link
            )

            return JsonResponse({
                'success': True,
                'message': f'New node connected to {source_node_id} with relationship: {link}',
                'node_id': new_node_id,
                'node_name': new_node.get('name', 'Unnamed')
            })

    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': f'Error adding node: {str(e)}'
        }, status=500)

def _add_node_to_neo4j(tx, graph_id, source_node_id, new_node_data, relationship):
    """
    Neo4j事务函数 - 实际执行节点添加操作
    """
    new_node_id = str(uuid.uuid4())
    query = """
    MATCH (source {id: $source_node_id, graph_id: $graph_id})
    CREATE (new_node:Node {
        id: $new_node_id,
        graph_id: $graph_id,
        name: $name,
        type: $type
    })
    CREATE (source)-[r:RELATION {type: $relationship}]->(new_node)
    RETURN new_node.id as new_node_id
    """
    result = tx.run(query,
                   source_node_id=source_node_id,
                   graph_id=graph_id,
                   new_node_id=new_node_id,
                   name=new_node_data.get('name', 'Unnamed'),
                   type=new_node_data.get('type', 'Node'),
                   relationship=relationship)
    return result.single()["new_node_id"]
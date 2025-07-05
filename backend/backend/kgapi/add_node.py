import json
import logging
import re
from datetime import datetime
from django.http import JsonResponse
from neo4j import GraphDatabase
from django.views.decorators.csrf import csrf_exempt

logger = logging.getLogger(__name__)
_DRIVER = None


def get_neo4j_driver():
    """获取Neo4j驱动连接（单例模式）"""
    global _DRIVER
    if _DRIVER is None:
        _DRIVER = GraphDatabase.driver(
            "bolt://neo4j:7687",
            auth=("neo4j", "testpassword"),
            max_connection_lifetime=30
        )
        # 初始化数据库约束
        with _DRIVER.session() as session:
            session.execute_write(_initialize_constraints)
    return _DRIVER


def _initialize_constraints(tx):
    """统一使用Entity标签的约束"""
    # 节点约束
    tx.run("""
    CREATE CONSTRAINT IF NOT EXISTS 
    FOR (n:Entity) REQUIRE (n.id, n.graph_id) IS NODE KEY
    """)
    # 关系约束
    tx.run("""
    CREATE CONSTRAINT IF NOT EXISTS 
    FOR ()-[r:RELATION]-() REQUIRE (r.id, r.graph_id) IS RELATIONSHIP KEY
    """)


def sanitize_relation_type(rel_type):
    """处理中文关系类型转换"""
    if not rel_type or not isinstance(rel_type, str):
        raise ValueError("关系类型必须是非空字符串")

    # 中文关键词映射表
    chinese_mapping = {
        "来自": "FROM",
        "包含": "CONTAIN",
        "属于": "BELONG_TO",
        "同现": "CO_OCCUR"
    }

    # 如果是预定义的中文关系类型，转换为英文
    if rel_type in chinese_mapping:
        return chinese_mapping[rel_type]

    # 默认处理：移除特殊字符，只保留字母数字和下划线
    cleaned = re.sub(r'[^a-zA-Z0-9_]', '', rel_type.strip())
    if not cleaned:
        raise ValueError("关系类型包含无效字符")
    if cleaned[0].isdigit():
        cleaned = "REL_" + cleaned
    return cleaned.upper()


@csrf_exempt
def add_node(request):
    """
    添加新节点并创建关联关系
    完整请求示例:
    {
        "graph_id": "graph1",
        "source_node_id": "e1",
        "link": "来自",
        "new_node": {
            "name": "张三",
            "type": "Person",
            "similarity": 0.5,
            "user_id": "user123",
            "verb": "认识"
        }
    }
    """
    logger.info(f"Request received: {request.method} {request.path}")

    if request.method != 'POST':
        return JsonResponse({
            'success': False,
            'message': 'Only POST method allowed'
        }, status=405)

    try:
        data = json.loads(request.body)

        # 必填字段验证
        required_fields = {
            'graph_id': '图谱ID',
            'source_node_id': '源节点ID',
            'link': '关系类型',
            'new_node': '新节点数据'
        }
        if missing := [name for field, name in required_fields.items() if field not in data]:
            return JsonResponse({
                'success': False,
                'message': f'缺少必填字段: {", ".join(missing)}'
            }, status=400)

        # 处理关系类型（支持中文）
        try:
            relationship_type = sanitize_relation_type(data['link'])
            original_relation_type = data['link']  # 保留原始值用于返回
        except ValueError as e:
            return JsonResponse({
                'success': False,
                'message': f'无效的关系类型: {str(e)}'
            }, status=400)

        # 准备参数
        params = {
            'graph_id': str(data['graph_id']),
            'source_id': str(data['source_node_id']),
            'relationship_type': relationship_type,
            'original_relation_type': original_relation_type,
            'node_data': {
                'name': str(data['new_node'].get('name', 'Unnamed')),
                'type': str(data['new_node'].get('type', 'Entity')),
                'user_id': str(data['new_node'].get('user_id', ''))
            },
            'rel_props': {
                'similarity': float(data['new_node'].get('similarity', 0.0)),
                'verb': str(data['new_node'].get('verb', ''))
            }
        }

        driver = get_neo4j_driver()
        with driver.session() as session:
            result = session.execute_write(
                _create_entity_with_relation,
                **params
            )

            return JsonResponse({
                'success': True,
                'data': {
                    'node': {
                        'id': result['node_id'],
                        'name': params['node_data']['name'],
                        'type': params['node_data']['type'],
                        'user_id': params['node_data']['user_id']
                    },
                    'relationship': {
                        'id': result['relationship_id'],
                        'type': params['original_relation_type'],
                        'verb': params['rel_props']['verb'],
                        'similarity': params['rel_props']['similarity'],
                        'user_id': params['node_data']['user_id']
                    }
                }
            })

    except json.JSONDecodeError as e:
        logger.error(f"JSON解析错误: {str(e)}")
        return JsonResponse({
            'success': False,
            'message': '非法的JSON格式'
        }, status=400)
    except ValueError as e:
        logger.error(f"参数错误: {str(e)}")
        return JsonResponse({
            'success': False,
            'message': str(e)
        }, status=400)
    except Exception as e:
        logger.error(f"服务器错误: {str(e)}", exc_info=True)
        return JsonResponse({
            'success': False,
            'message': f'服务器错误: {str(e)}'
        }, status=500)


def _create_entity_with_relation(tx, graph_id, source_id, relationship_type, node_data, rel_props, **kwargs):
    """
    创建Entity节点和关系的事务处理
    返回: {'node_id': str, 'relationship_id': int}
    """
    # 1. 检查源节点是否存在
    if not tx.run("""
    MATCH (n:Entity {id: $source_id, graph_id: $graph_id})
    RETURN count(n) > 0
    """, source_id=source_id, graph_id=graph_id).single()[0]:
        raise ValueError(f"源节点不存在: {source_id}")

    # 2. 生成新ID（兼容原有e1,e2...格式）
    new_node_id = _generate_entity_id(tx, graph_id)
    new_rel_id = _generate_relationship_id(tx, graph_id)

    # 3. 创建节点和关系（移除了created_at字段）
    result = tx.run(f"""
    MATCH (source:Entity {{id: $source_id, graph_id: $graph_id}})
    CREATE (new:Entity {{
        id: $node_id,
        graph_id: $graph_id,
        user_id: $user_id,
        name: $name,
        type: $type
    }})
    CREATE (source)-[r:{relationship_type} {{
        id: $rel_id,
        graph_id: $graph_id,
        user_id: $user_id,
        similarity: $similarity,
        verb: $verb
    }}]->(new)
    RETURN new.id AS node_id, r.id AS relationship_id
    """,
                    source_id=source_id,
                    graph_id=graph_id,
                    node_id=new_node_id,
                    user_id=node_data['user_id'],
                    name=node_data['name'],
                    type=node_data['type'],
                    rel_id=new_rel_id,
                    similarity=rel_props['similarity'],
                    verb=rel_props['verb'])

    if not (record := result.single()):
        raise ValueError("创建节点和关系失败")

    return {
        'node_id': record['node_id'],
        'relationship_id': record['relationship_id']
    }


def _generate_entity_id(tx, graph_id):
    """生成实体ID（e1,e2...格式）"""
    max_id = tx.run("""
    MATCH (n:Entity {graph_id: $graph_id})
    WHERE n.id STARTS WITH 'e' AND size(n.id) > 1
    WITH n.id AS id, toInteger(substring(n.id, 1)) AS num
    RETURN max(num) AS max_num
    """, graph_id=graph_id).single()
    return f"e{(max_id['max_num'] + 1) if max_id['max_num'] else 1}"


def _generate_relationship_id(tx, graph_id):
    """生成关系ID（纯数字）"""
    max_id = tx.run("""
    MATCH ()-[r {graph_id: $graph_id}]->()
    WHERE r.id IS NOT NULL AND toString(r.id) =~ '^\\\\d+$'
    RETURN max(toInteger(r.id)) AS max_num
    """, graph_id=graph_id).single()
    return (max_id['max_num'] + 1) if max_id['max_num'] else 1
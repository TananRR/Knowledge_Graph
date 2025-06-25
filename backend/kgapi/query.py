from django.http import JsonResponse
from django.views.decorators.http import require_GET
from kg_modules.neo4j_connector import get_neo4j_graph

@require_GET
def query_node(request):
    name = request.GET.get('name')
    if not name:
        return JsonResponse({'error': '缺少参数name'}, status=400)
    graph = get_neo4j_graph()
    # 节点有name属性
    result = graph.run("MATCH (n {name: $name}) RETURN n", name=name).data()
    if result:
        # 返回第一个节点的属性
        return JsonResponse({'found': True, 'node': result[0]['n']})
    else:
        return JsonResponse({'found': False, 'msg': '未找到该节点'})

@require_GET
def person_with_relations(request):
    name = request.GET.get('name')
    if not name:
        return JsonResponse({'error': '缺少参数name'}, status=400)
    graph = get_neo4j_graph()
    cypher = """
    MATCH (p:Person {name: $name})-[r]-(n)
    RETURN p, r, n
    """
    result = graph.run(cypher, name=name).data()
    if not result:
        return JsonResponse({'found': False, 'msg': '未找到该Person节点'})
    # 整理输出
    nodes = []
    relations = []
    for record in result:
        p = dict(record['p'])
        n = dict(record['n'])
        r = dict(record['r'])
        # 节点去重
        if p not in nodes:
            nodes.append(p)
        if n not in nodes:
            nodes.append(n)
        # 关系
        relations.append({
            'start': record['r'].start_node.identity,
            'end': record['r'].end_node.identity,
            'type': record['r'].__class__.__name__,
            'properties': r
        })
    return JsonResponse({'found': True, 'nodes': nodes, 'relations': relations})

@require_GET
def person_with_optional_relations(request):
    name = request.GET.get('name')
    if not name:
        return JsonResponse({'error': '缺少参数name'}, status=400)
    graph = get_neo4j_graph()
    cypher = """
    MATCH (p:Person {name: $name})
    OPTIONAL MATCH (p)-[r]-(n)
    RETURN p, collect(r) as relations, collect(n) as neighbors
    """
    result = graph.run(cypher, name=name).data()
    if not result or not result[0]['p']:
        return JsonResponse({'found': False, 'msg': '未找到该Person节点'})
    p = dict(result[0]['p'])
    relations = [dict(rel) for rel in result[0]['relations'] if rel is not None]
    neighbors = [dict(node) for node in result[0]['neighbors'] if node is not None]
    response = {
        'found': True,
        'person': p,
    }
    if relations and neighbors:
        response['relations'] = relations
        response['neighbors'] = neighbors
    return JsonResponse(response)
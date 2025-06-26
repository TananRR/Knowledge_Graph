from neo4j import GraphDatabase
import json
import re

# 连接 Neo4j
driver = GraphDatabase.driver("bolt://neo4j:7687", auth=("neo4j", "testpassword"))
import time
import networkx as nx
# 配置 Neo4j 数据库连接
# driver = GraphDatabase.driver("bolt://localhost:7687", auth=("neo4j", "testpassword"))


# 处理非法关系名
def sanitize_relation_type(rel_type):
    rel_type = rel_type.replace("-", "_")
    if re.fullmatch(r"[A-Za-z0-9_]+", rel_type):
        return rel_type.upper()
    else:
        raise ValueError(f"非法的关系类型: {rel_type}")


# 创建实体节点，绑定 graph_id 和 user_id
def create_entities(session, entities, graph_id, user_id):
    for entity in entities:
        session.run(
            """
            MERGE (e:Entity {id: $id})
            SET e.name = $name, e.type = $type, e.graph_id = $graph_id, e.user_id = $user_id
            """,
            id=entity["id"],
            name=entity["name"],
            type=entity["type"],
            graph_id=graph_id,
            user_id=user_id
        )


# 创建关系，绑定 graph_id 和 user_id
def create_relations(session, relations, entities, graph_id, user_id):
    entity_map = {entity["id"]: entity for entity in entities}
    for relation in relations:
        source_id = relation["source"]
        target_id = relation["target"]
        source_entity = entity_map.get(source_id)
        target_entity = entity_map.get(target_id)

        if not source_entity or not target_entity:
            print(f"跳过无效关系，source或target找不到对应实体: {relation}")
            continue

        try:
            rel_type = sanitize_relation_type(relation["type"])
        except ValueError as e:
            print(e)
            continue

        cypher = f"""
        MATCH (a:Entity {{id: $source_id}}), (b:Entity {{id: $target_id}})
        MERGE (a)-[r:{rel_type}]->(b)
        ON CREATE SET r.graph_id = $graph_id, r.verb = $verb, r.similarity = $similarity, r.user_id = $user_id
        """

        session.run(
            cypher,
            source_id=source_id,
            target_id=target_id,
            verb=relation.get("verb", ""),
            similarity=relation.get("similarity", 0.0),
            graph_id=graph_id,
            user_id=user_id
        )


# 查询某个图谱的所有内容
def query_graph(session, graph_id):
    print(f"\n📌 查询图谱 graph_id = {graph_id} 的结构：")
    result = session.run(
        """
        MATCH (a:Entity {graph_id: $graph_id})-[r]->(b:Entity {graph_id: $graph_id})
        RETURN a, r, b
        """,
        graph_id=graph_id
    )
    records = list(result)

    nodes = {}
    links = []

    if not records:
        print("未找到关系，仅列出实体：")
        node_result = session.run("MATCH (n:Entity {graph_id: $graph_id}) RETURN n", graph_id=graph_id)
        for record in node_result:
            node = dict(record["n"])
            node_id = node.get("id") or node.get("name")  # 前端唯一标识
            nodes[node_id] = node
        return {"nodes": list(nodes.values()), "links": []}

    for record in records:
        a = dict(record["a"])
        b = dict(record["b"])
        r = dict(record["r"])
        # 打印检查
        print(f"({a}) -[{r}]-> ({b})")
        
        # 用id或name作为唯一标识（根据你Neo4j的数据建模）
        a_id = a.get("id") or a.get("name")
        b_id = b.get("id") or b.get("name")

        nodes[a_id] = a
        nodes[b_id] = b

        links.append({
            "source": a_id,
            "target": b_id,
            "type": r.get("type"),
            "label": r.get("verb") or r.get("type"),  # 中文描述优先
            **r
        })

    return {
        "nodes": list(nodes.values()),
        "links": links
    }


# 查询某个用户的所有图谱 ID
def list_user_graphs(session, user_id):
    result = session.run(
        "MATCH (n:Entity) WHERE n.user_id = $user_id RETURN DISTINCT n.graph_id AS graph_id",
        user_id=user_id
    )
    graph_ids = [record["graph_id"] for record in result]
    print(f"\n👤 用户 {user_id} 的图谱ID：")
    for gid in graph_ids:
        print(f" - {gid}")
    return graph_ids
# 查询某个用户的所有图谱（完整结构）
def query_graphs_by_user(session, user_id):
    print(f"\n📌 查询用户 {user_id} 的所有图谱结构（实体 + 关系）：")
    result = session.run(
        """
        MATCH (n:Entity)
        WHERE n.user_id = $user_id
        RETURN DISTINCT n.graph_id AS graph_id
        """,
        user_id=user_id
    )
    graph_ids = [record["graph_id"] for record in result]
    if not graph_ids:
        print("⚠️ 该用户没有图谱。")
        return []

    all_graphs = []

    for graph_id in graph_ids:
        print(f"\n🧩 图谱 graph_id = {graph_id}：")
        graph_data = query_graph(session, graph_id)

        # 打印节点信息
        print("🔹 节点数量:", len(graph_data["nodes"]))
        for node in graph_data["nodes"]:
            print("  -", node)

        # 打印关系信息
        print("🔸 关系数量:", len(graph_data["links"]))
        for link in graph_data["links"]:
            print("  →", link["source"], "-[", link["label"], "]->", link["target"])

        all_graphs.append({
            "graph_id": graph_id,
            "nodes": graph_data["nodes"],
            "links": graph_data["links"]
        })

    return all_graphs



# 查询所有图谱
def query_all_graphs(session):
    print("📌 查询所有图谱的结构（实体 + 关系）：")

    result = session.run("MATCH (n:Entity) RETURN DISTINCT n.graph_id AS graph_id")
    graph_ids = [record["graph_id"] for record in result]

    if not graph_ids:
        print("⚠️ 当前数据库中没有图谱。")
        return []

    all_graphs = []

    for graph_id in graph_ids:
        print(f"\n🧩 图谱 graph_id = {graph_id}：")
        graph_data = query_graph(session, graph_id)

        # 打印节点信息
        print("🔹 节点数量:", len(graph_data["nodes"]))
        for node in graph_data["nodes"]:
            print("  -", node)

        # 打印关系信息
        print("🔸 关系数量:", len(graph_data["links"]))
        for link in graph_data["links"]:
            print("  →", link["source"], "-[", link["label"], "]->", link["target"])

        all_graphs.append({
            "graph_id": graph_id,
            "nodes": graph_data["nodes"],
            "links": graph_data["links"]
        })

    return all_graphs


# 删除所有图谱
def clear_all_graphs(session):
    print("🚨 清除所有图谱...")
    session.run("MATCH (n:Entity) WHERE n.graph_id IS NOT NULL DETACH DELETE n")
    print("✅ 已清除所有图谱。")


# 删除某个图谱
def clear_graph_by_id(session, graph_id):
    print(f"🚨 删除图谱 graph_id = {graph_id}")
    session.run("MATCH (n:Entity {graph_id: $graph_id}) DETACH DELETE n", graph_id=graph_id)
    print("✅ 删除完成。")


# 删除某用户所有图谱
def clear_graphs_by_user(session, user_id):
    print(f"🚨 删除用户 {user_id} 的所有图谱")
    session.run("MATCH (n:Entity) WHERE n.user_id = $user_id DETACH DELETE n", user_id=user_id)
    print("✅ 用户图谱删除完成。")


# 关键词查询某用户的实体
def search_entities_by_keyword(session, user_id, keyword):
    print(f"\n🔍 查询用户 {user_id} 下包含关键词 '{keyword}' 的实体：")

    result = session.run("""
        MATCH (e:Entity)
        WHERE e.user_id = $user_id AND e.name CONTAINS $keyword
        RETURN e
    """, user_id=user_id, keyword=keyword)

    entities = []
    for record in result:
        entity = dict(record["e"])
        print("  -", entity)
        entities.append(entity)

    if not entities:
        print("⚠️ 未找到相关实体。")
    return entities


# 主函数
def main():
    user_id = "user_001"  # 模拟当前登录用户
    file_path = "D:/A-trainingStore/Knowledge_Graph/extracted_result.json"
    
    with open(file_path, "r", encoding="utf-8") as file:
        data = json.load(file)

    graph_id = time.strftime("graph_%Y%m%d%H%M%S")

    with driver.session() as session:
        # 上传知识图谱
        create_entities(session, data["entities"], graph_id, user_id)
        create_relations(session, data["relations"], data["entities"], graph_id, user_id)

        # 展示与测试功能
        query_graph(session, graph_id)
        list_user_graphs(session, user_id)
        search_entities_by_keyword(session, user_id, "中国")
      

        # 可选功能：
        # clear_all_graphs(session)
        # clear_graph_by_id(session, graph_id)
        # clear_graphs_by_user(session, user_id)


if __name__ == "__main__":
    main()

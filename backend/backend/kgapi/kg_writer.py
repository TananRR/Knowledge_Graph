from neo4j import GraphDatabase
import json
import re

driver = GraphDatabase.driver("bolt://neo4j:7687", auth=("neo4j", "testpassword"))


def create_or_update_user_password(session, user_id, password):
    # 先查用户和密码节点是否存在；
    # 不存在就创建新节点；
    # 判断是否需要更新关联（密码变了才更新）；
    # 删除旧关联，建立新关联。
    cypher_main = """
    MERGE (user:User {user_id: $user_id})
    ON CREATE SET user.created_at = timestamp()
    WITH user
    OPTIONAL MATCH (user)-[r:HAS_PASSWORD]->(old_p:Password)
    WITH user, r, old_p
    MERGE (password_node:Password {password: $password})
    ON CREATE SET password_node.updated_at = timestamp()
    WITH user, r, old_p, password_node
    FOREACH (_ IN CASE WHEN old_p IS NULL OR old_p.password <> $password THEN [1] ELSE [] END |
        DELETE r
    )
    FOREACH (_ IN CASE WHEN old_p IS NULL OR old_p.password <> $password THEN [1] ELSE [] END |
        MERGE (user)-[:HAS_PASSWORD]->(password_node)
    )
    RETURN user.user_id AS user_id, password_node.password AS password, old_p.password AS old_password
    """
    result = session.run(cypher_main, user_id=user_id, password=password)
    record = result.single()

    # 清理旧密码节点（如果存在且无人引用）
    old_password = record.get("old_password")
    if old_password and old_password != password:
        cypher_cleanup = """
        MATCH (p:Password {password: $old_password})
        WHERE NOT ( (:User)-[:HAS_PASSWORD]->(p) )
        DETACH DELETE p
        """
        session.run(cypher_cleanup, old_password=old_password)
    # 返回当前用户和密码，前端可以再与输入的参数进行对比检查，若符合，则创建或更新成功
    return record["user_id"], record["password"]


def check_user_password(session, user_id: str, password: str) -> bool:
    """
    校验用户 ID 和密码是否正确关联。
    返回 True 表示匹配成功，False 表示密码错误或无匹配项。
    """
    result = session.run(
        """
        MATCH (u:User {user_id: $user_id})-[:HAS_PASSWORD]->(p:Password {password: $password})
        RETURN u
        """,
        user_id=user_id,
        password=password
    )
    return result.single() is not None


def delete_all_users_and_passwords(session):
    """
    删除数据库中所有用户节点和密码节点及它们之间的关系。
    """
    session.run("""
        MATCH (u:User)-[r:HAS_PASSWORD]->(p:Password)
        DELETE r, u, p
    """)
    print("所有用户和密码已删除")


# 处理非法关系名
def sanitize_relation_type(rel_type):
    rel_type = rel_type.replace("-", "_")
    if re.fullmatch(r"[A-Za-z0-9_]+", rel_type):
        return rel_type.upper()
    else:
        raise ValueError(f"非法的关系类型: {rel_type}")


# 为每次上传的数据打上唯一标识
def generate_new_graph_id(session, user_id):
    """
    为某个用户生成新的图谱 ID（如 user_1，user_2 ...）
    """
    result = session.run(
        """
        MATCH (n:Entity) 
        WHERE n.user_id = $user_id
        RETURN DISTINCT n.graph_id AS gid
        """,
        user_id=user_id
    )
    graph_ids = [record["gid"] for record in result]

    # 提取当前最大的编号
    max_index = 0
    for gid in graph_ids:
        if gid.startswith(f"{user_id}_"):
            try:
                index = int(gid.split("_")[-1])
                if index > max_index:
                    max_index = index
            except ValueError:
                continue
        print(max_index)
    new_graph_id = f"{user_id}_{max_index + 1}"
    print(f"新图谱ID：{new_graph_id}")
    return new_graph_id


# 创建实体节点，绑定 graph_id 和 user_id
def create_entities(session, entities, graph_id, user_id):
    for entity in entities:
        # 每个实体节点唯一由 id + graph_id + user_id 三个属性共同标识
        # 插入或更新，存在的话就更新，不存在就创建
        entity["graph_id"] = graph_id
        entity["user_id"] = user_id

        session.run(
            """
            MERGE (e:Entity {id: $id, graph_id: $graph_id, user_id: $user_id})
            SET e.name = $name, e.type = $type
            """,
            id=entity["id"],
            name=entity["name"],
            type=entity["type"],
            graph_id=graph_id,
            user_id=user_id
        )


# 创建关系，绑定 graph_id 和 user_id（支持多用户多图谱）
def create_relations(session, relations, entities, graph_id, user_id):
    # 构建实体映射：确保唯一性在 id + graph_id + user_id 维度

    entity_map = {
        (entity["id"], entity["graph_id"], entity["user_id"]): entity
        for entity in entities
    }

    for relation in relations:

        source_id = relation["source"]
        target_id = relation["target"]

        # 仅获取属于当前用户、当前图谱的实体
        source_entity = entity_map.get((source_id, graph_id, user_id))
        target_entity = entity_map.get((target_id, graph_id, user_id))

        if not source_entity or not target_entity:
            print(f" 跳过无效关系，source 或 target 找不到对应实体: {relation}")
            continue

        try:
            rel_type = sanitize_relation_type(relation["type"])
        except ValueError as e:
            print(f" 非法关系类型: {e}")
            continue

        cypher = f"""
        MATCH (a:Entity {{id: $source_id, graph_id: $graph_id, user_id: $user_id}}),
              (b:Entity {{id: $target_id, graph_id: $graph_id, user_id: $user_id}})
        MERGE (a)-[r:{rel_type}]->(b)
        ON CREATE SET r.graph_id = $graph_id,
                      r.verb = $verb,
                      r.similarity = $similarity,
                      r.user_id = $user_id
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
    print(f"查询图谱 graph_id = {graph_id} 的结构：")
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
    print(f" 用户 {user_id} 的图谱ID：")
    for gid in graph_ids:
        print(f" - {gid}")
    return graph_ids


# 查询某个用户的所有图谱（完整结构）
def query_graphs_by_user(session, user_id):
    print(f" 查询用户 {user_id} 的所有图谱结构（实体 + 关系）：")
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
        print(" 该用户没有图谱。")
        return []

    all_graphs = []

    for graph_id in graph_ids:
        print(f" 图谱 graph_id = {graph_id}：")
        graph_data = query_graph(session, graph_id)

        # 打印节点信息
        print(" 节点数量:", len(graph_data["nodes"]))
        for node in graph_data["nodes"]:
            print("  -", node)

        # 打印关系信息
        print("关系数量:", len(graph_data["links"]))
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
    print("查询所有图谱的结构（实体 + 关系）：")

    result = session.run("MATCH (n:Entity) RETURN DISTINCT n.graph_id AS graph_id")
    graph_ids = [record["graph_id"] for record in result]

    if not graph_ids:
        print("当前数据库中没有图谱。")
        return []

    all_graphs = []

    for graph_id in graph_ids:
        print(f" 图谱 graph_id = {graph_id}：")
        graph_data = query_graph(session, graph_id)

        # 打印节点信息
        print("节点数量:", len(graph_data["nodes"]))
        for node in graph_data["nodes"]:
            print("  -", node)

        # 打印关系信息
        print("关系数量:", len(graph_data["links"]))
        for link in graph_data["links"]:
            print("  →", link["source"], "-[", link["label"], "]->", link["target"])

        all_graphs.append({
            "graph_id": graph_id,
            "nodes": graph_data["nodes"],
            "links": graph_data["links"]
        })

    return all_graphs


# kg_writer.py 新增函数

def query_subgraph(session, graph_id=None, user_id=None, keyword=None):
    """
    通用子图查询函数
    参数：
    - graph_id: 查询指定图谱
    - user_id: 查询用户的所有图谱
    - keyword: 关键词搜索
    """
    if graph_id:
        return query_graph(session, graph_id)
    elif user_id:
        return query_graphs_by_user(session, user_id)
    elif keyword:
        # 关键词搜索增强版（返回子图而非单个节点）
        result = session.run(
            """
            MATCH path = (start)-[*0..2]-(related)
            WHERE any(
                prop IN keys(start) WHERE 
                toLower(toString(start[prop])) CONTAINS toLower($keyword)
            )
            UNWIND nodes(path) AS n
            UNWIND relationships(path) AS r
            RETURN 
                collect(DISTINCT n) AS nodes,
                collect(DISTINCT r) AS relationships
            """,
            keyword=keyword
        )
        record = result.single()
        return convert_to_graph_structure(record)
    else:
        return query_all_graphs(session)


def convert_to_graph_structure(record):
    """通用结果转换函数"""
    if not record:
        return {"nodes": [], "links": []}

    nodes = []
    links = []
    node_ids = set()

    # 处理节点
    for node in record.get("nodes", []):
        node_id = node.id
        if node_id not in node_ids:
            nodes.append({
                "id": node_id,
                "labels": list(node.labels),
                "properties": dict(node)
            })
            node_ids.add(node_id)

    # 处理关系
    for rel in record.get("relationships", []):
        links.append({
            "source": rel.start_node.id,
            "target": rel.end_node.id,
            "type": rel.type,
            "properties": dict(rel)
        })

    return {
        "nodes": nodes,
        "links": links
    }


# 删除所有图谱
def clear_all_graphs(session):
    print("清除所有图谱...")
    session.run("MATCH (n:Entity) WHERE n.graph_id IS NOT NULL DETACH DELETE n")
    print("已清除所有图谱。")


# 删除某个图谱
def clear_graph_by_id(session, graph_id):
    print(f"删除图谱 graph_id = {graph_id}")
    session.run("MATCH (n:Entity {graph_id: $graph_id}) DETACH DELETE n", graph_id=graph_id)
    print("删除完成。")


# 删除某用户所有图谱
def clear_graphs_by_user(session, user_id):
    print(f"删除用户 {user_id} 的所有图谱")
    session.run("MATCH (n:Entity) WHERE n.user_id = $user_id DETACH DELETE n", user_id=user_id)
    print("用户图谱删除完成。")


# 查询某个图谱里的所有实体id
def get_entity_ids_by_graph(session, graph_id):
    """
    查询指定 graph_id 下的所有实体的 id 列表。
    返回：一个字符串列表。 """
    result = session.run(
        """
        MATCH (e:Entity {graph_id: $graph_id})
        RETURN e.id AS entity_id
        """,
        graph_id=graph_id
    )
    entity_ids = [record["entity_id"] for record in result]
    print(f"图谱 {graph_id} 中的实体 ID 列表：", entity_ids)
    return entity_ids


# 查询某个图谱里的实体节点数
def count_entities_by_graph(session, graph_id):
    """
    查询指定 graph_id 下的实体节点总数。
    返回：整数（实体数量）。
    """
    result = session.run(
        """
        MATCH (e:Entity {graph_id: $graph_id})
        RETURN count(e) AS entity_count
        """,
        graph_id=graph_id
    )
    count = result.single()["entity_count"]
    print(f"图谱 {graph_id} 中的实体节点总数：{count}")
    return count


# 删除知识
def delete_entity_by_id(session, entity_id, graph_id, user_id):
    """
    删除指定图谱中、某用户的某个实体节点及其相关关系。
    参数：
        - entity_id：实体的唯一标识（id 字段）
        - graph_id：图谱 ID
        - user_id：用户 ID
    """
    print(f"准备删除实体 id={entity_id}，属于 graph_id={graph_id}, user_id={user_id} 的图谱")

    # 首先检查实体是否存在
    result = session.run(
        """
        MATCH (e:Entity {id: $entity_id, graph_id: $graph_id, user_id: $user_id})
        RETURN e
        """,
        entity_id=entity_id,
        graph_id=graph_id,
        user_id=user_id
    )
    if result.single() is None:
        print("❌ 没有找到该实体，删除操作取消")
        return False

    # 删除实体及其所有关联关系
    session.run(
        """
        MATCH (e:Entity {id: $entity_id, graph_id: $graph_id, user_id: $user_id})
        DETACH DELETE e
        """,
        entity_id=entity_id,
        graph_id=graph_id,
        user_id=user_id
    )
    print("实体及其相关关系已删除")
    return True


# 关键词查询某用户的实体
def search_entities_by_keyword(session, user_id, keyword):
    print(f"查询用户 {user_id} 下包含关键词 '{keyword}' 的实体：")

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
        print(" 未找到相关实体。")
    return entities


def create_graph(entities, relations, graph_id, user_id):
    with driver.session() as session:
        create_entities(session, entities, graph_id, user_id)
        create_relations(session, relations, entities, graph_id, user_id)

# 主函数
def main():
    # 配置 Neo4j 数据库连接
    driver = GraphDatabase.driver("bolt://localhost:7687", auth=("neo4j", "testpassword"))

    # test_cases = [
    #     ("user001", "pass123"),          # 新用户新密码
    #     ("user001", "pass123"),          # 用户密码没变，无动作
    #     ("user001", "newpassword"),      # 用户密码变更
    #     ("user002", "newpassword"),      # 新用户关联已有密码
    #     ("user002", "otherpassword"),    # 新用户新密码
    # ]

    # with driver.session() as session:
    #     for user_id, password in test_cases:
    #         uid, pwd = create_or_update_user_password(session, user_id, password)
    #         print(f"User: {uid}, Password: {pwd}")
    #         if check_user_password(session, user_id, password):
    #             print("登录成功")
    #         else:
    #             print("❌ 密码错误或用户不存在")
    #     delete_all_users_and_passwords(session)

    file_path = "D:/A-trainingStore/Knowledge_Graph/extracted_result.json"

    with open(file_path, "r", encoding="utf-8") as file:
        data = json.load(file)

    with driver.session() as session:
        # 删除图谱：
        # clear_all_graphs(session)
        # clear_graph_by_id(session, graph_id)
        # clear_graphs_by_user(session, user_id)

        # Step 1: 自动生成唯一 graph_id，user_id
        user_id = 'user003'
        graph_id = generate_new_graph_id(session, user_id)
        print(f"\n[1] 生成 graph_id: {graph_id}")
        # # 上传知识图谱
        # create_entities(session, data["entities"], graph_id, user_id)
        # create_relations(session, data["relations"], data["entities"], graph_id, user_id)

        # # 展示与测试功能
        # query_graph(session, graph_id)
        # list_user_graphs(session, user_id)

        # search_entities_by_keyword(session, user_id, "中国")
        # entity_num=count_entities_by_graph(session,graph_id)

        #  # Step 2: 构造测试实体和关系
        # entities = [
        #     {"id": "e"+str(entity_num+1), "name": "中国", "type": "国家", "graph_id": graph_id, "user_id": user_id},
        #     {"id": "e"+str(entity_num+2), "name": "北京", "type": "城市", "graph_id": graph_id, "user_id": user_id},
        #     {"id": "e"+str(entity_num+3), "name": "上海", "type": "城市", "graph_id": graph_id, "user_id": user_id},
        # ]
        # relations = [
        #     {"source": "e"+str(entity_num+2), "target": "e"+str(entity_num+1), "type": "属于", "verb": "属于", "similarity": 1.0},
        #     {"source": "e"+str(entity_num+3), "target": "e"+str(entity_num+1), "type": "属于", "verb": "属于", "similarity": 1.0},
        # ]
        #  # Step 3: 添加实体和关系
        # print("\n[2] 添加实体")
        # create_entities(session, entities, graph_id, user_id)

        # print("\n[3] 添加关系")
        # create_relations(session, relations, entities, graph_id, user_id)

        # # Step 4: 查询当前图谱内容
        # print("\n[4] 查询图谱结构")
        # graph = query_graph(session, graph_id)

        # # Step 5: 查询图谱所有实体 ID
        # print("\n[5] 获取实体ID列表")
        # ids = get_entity_ids_by_graph(session, graph_id)

        # # Step 6: 关键词搜索
        # print("\n[6] 关键词搜索实体：包含 '中'")
        # matched = search_entities_by_keyword(session, user_id, "中")

        # # Step 7: 删除一个实体
        # print("\n[7] 删除实体 e3")
        # delete_success = delete_entity_by_id(session, "e3", graph_id, user_id)

        # # Step 8: 查询图谱再次确认删除效果
        # print("\n[8] 查询图谱结构（删除后）")
        # graph = query_graph(session, graph_id)

        # # Step 9: 清除该图谱（可选）
        # print("\n[9] 删除图谱")
        # clear_graph_by_id(session, graph_id)

        print("\n✅ 所有测试完成。")


if __name__ == "__main__":
    main()

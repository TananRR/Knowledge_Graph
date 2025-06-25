from neo4j import GraphDatabase
import json
import re

# 连接 Neo4j
driver = GraphDatabase.driver("bolt://neo4j:7687", auth=("neo4j", "testpassword"))

# 校验关系类型合法性（只允许字母、数字和下划线，防止Cypher注入）
def sanitize_relation_type(rel_type):
    rel_type = rel_type.replace("-", "_")  # 替换连字符为下划线
    if re.fullmatch(r"[A-Za-z0-9_]+", rel_type):
        return rel_type.upper()
    else:
        raise ValueError(f"非法的关系类型: {rel_type}")

def create_entities(session, entities):
    for entity in entities:
        session.run(
            """
            MERGE (:Entity {id: $id, name: $name, type: $type})
            """,
            id=entity["id"],
            name=entity["name"],
            type=entity["type"]
        )

def create_relations(session, relations, entities):
    entity_map = {entity["id"]: entity["name"] for entity in entities}
    for relation in relations:
        source = entity_map.get(relation["source"])
        target = entity_map.get(relation["target"])
        if not source or not target:
            print(f"跳过无效关系，source或target找不到对应实体: {relation}")
            continue

        try:
            rel_type = sanitize_relation_type(relation["type"])
        except ValueError as e:
            print(e)
            continue

        # 使用字符串格式化构造动态关系类型的Cypher语句
        cypher = f"""
        MATCH (a:Entity {{name: $source}}), (b:Entity {{name: $target}})
        MERGE (a)-[r:{rel_type} {{verb: $verb, similarity: $similarity}}]->(b)
        """

        session.run(
            cypher,
            source=source,
            target=target,
            verb=relation.get("verb", ""),
            similarity=relation.get("similarity", 0.0)
        )

def main():
    with open("backend\\kgapi\\extracted_result.json", "r", encoding="utf-8") as file:
        data = json.load(file)

    with driver.session() as session:
        create_entities(session, data["entities"])
        create_relations(session, data["relations"], data["entities"])

        # 查询前10个节点测试
        result = session.run("MATCH (n:Entity) RETURN n LIMIT 10")
        for record in result:
            print(record)

if __name__ == "__main__":
    main()

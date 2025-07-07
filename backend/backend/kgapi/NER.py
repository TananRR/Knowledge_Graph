import spacy
from typing import List, Dict
import json

# 加载预训练中文模型
nlp = spacy.load("zh_core_web_sm")


def classify_with_spacy(text: str) -> str:
    """
    使用spaCy模型预测实体类型
    :param text: 待分类的实体文本
    :return: 实体类型（PER/ORG/LOC等，未知则返回"OTHER"）
    """
    doc = nlp(text)
    if len(doc.ents) > 0:
        return doc.ents[0].label_
    return "OTHER"


def process_entities(entities: List[Dict]) -> List[Dict]:
    """
    处理实体列表，强制重新识别所有实体的type字段
    :param entities: 原始实体列表
    :return: 处理后的实体列表
    """
    for entity in entities:
        original_name = entity["name"]

        # 特殊处理包含<unk>等噪声的实体
        if "<unk>" in original_name:
            entity["type"] = "OTHER"
            continue

        # 强制重新识别类型（无论是否已有type字段）
        entity["type"] = classify_with_spacy(original_name)
    return entities


# 从f.json读取数据
with open("backend/backend/kgapi/final_result.json", "r", encoding="utf-8") as f:
    input_data = json.load(f)

# 处理数据
output_entities = process_entities(input_data["entities"])

# 打印结果
print("实体类型识别结果：")
for entity in output_entities:
    print(f"{entity['name']} -> {entity['type']}")

# 保存结果到output.json
output_data = {"entities": output_entities}
with open("output.json", "w", encoding="utf-8") as f:
    json.dump(output_data, f, ensure_ascii=False, indent=2)

print("\n处理完成！结果已保存到 output.json")

# # 示例数据
# with open("final_result.json", "r", encoding="utf-8") as f:
#     input_data = json.load(f)
#
# # 处理数据
# output_entities = process_entities(input_data["entities"])
#
# # 打印结果
# print("实体类型识别结果：")
# for entity in output_entities:
#     print(f"{entity['name']} -> {entity['type']}")
#
# # 输出完整JSON（可选）
# output_data = {"entities": output_entities}
# print("\nJSON输出：")
# print(json.dumps(output_data, ensure_ascii=False, indent=2))

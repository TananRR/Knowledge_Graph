# -*- coding: utf-8 -*-
import spacy
from spacy.matcher import Matcher
import json
import numpy as np

try:
    nlp = spacy.load("zh_core_web_md")
except OSError:
    print("使用小模型，部分功能可能受限。建议安装: python -m spacy download zh_core_web_md")
    nlp = spacy.load("zh_core_web_sm")

ENTITY_MAPPING = {
    "PERSON": "Person",
    "ORG": "Organization",
    "GPE": "Location",
    "NORP": "Group",
    "WORK_OF_ART": "Work",
    "DATE": "DATE",
    "MONEY": "MONEY",
    "TIME": "TIME",
    "PERCENT": "PERCENT",
    "CARDINAL": "Number",
    "LAW": "Law",
    "PRODUCT": "Product",
    "EVENT": "Event",
    "FAC": "Facility",
    "TITLE": "Title"
}

VERB_RELATION_MAP = {
    "创立": "found", "创建": "found", "成立": "found",
    "收购": "acquire", "并购": "acquire", "投资": "invest",
    "开发": "develop", "担任": "serve_as", "合作": "cooperate",
    "达成": "reach", "发表": "publish", "宣布": "announce",
    "任命": "appoint", "加入": "join", "提升": "promote",
    "降低": "reduce", "获得": "win", "战胜": "defeat", "支持": "support"
}

STOP_VERBS = {"是", "有", "在", "为", "没有", "包括", "包含", "成为", "等等", "表示", "认为", "强调"}

matcher = Matcher(nlp.vocab)

def add_entity_patterns():
    company_patterns = [
        [{"TEXT": {"REGEX": r"[^\s]+(公司|集团|企业|中心|研究院|银行|大学|学院|医院|实验室)$"}}]
    ]
    matcher.add("ORG", company_patterns, on_match=lambda _, doc, i, matches: add_ent(doc, matches, "ORG"))

    product_patterns = [
        [{"TEXT": "智能"}, {"TEXT": {"REGEX": r"[^\s]+(系统|平台|设备|工具|软件|应用)$"}}],
        [{"TEXT": "新型"}, {"TEXT": {"REGEX": r"[^\s]+(技术|产品|药物|方法)$"}}]
    ]
    matcher.add("PRODUCT", product_patterns, on_match=lambda _, doc, i, matches: add_ent(doc, matches, "PRODUCT"))

    title_patterns = [
        [{"TEXT": {"IN": ["首席", "总裁", "副总裁", "总经理", "副总经理", "主席", "副主席", "主任", "副主任"]}},
         {"TEXT": {"IN": ["执行官", "科学家", "工程师", "教授", "医生", "律师", "分析师"]}}]
    ]
    matcher.add("TITLE", title_patterns, on_match=lambda _, doc, i, matches: add_ent(doc, matches, "TITLE"))

def add_ent(doc, matches, label):
    new_ents = list(doc.ents)
    token_indices = set(token.i for ent in new_ents for token in ent)

    for match_id, start, end in matches:
        overlap = any(i in token_indices for i in range(start, end))
        if overlap:
            continue
        span = doc.char_span(doc[start].idx, doc[end - 1].idx + len(doc[end - 1]), label=label, alignment_mode="expand")
        if span is not None:
            new_ents.append(span)
            token_indices.update(range(span.start, span.end))

    doc.ents = new_ents

add_entity_patterns()

def extract_entities_relations(text: str) -> dict:
    doc = nlp(text)
    matches = matcher(doc)
    for match_id, start, end in matches:
        add_ent(doc, [(match_id, start, end)], nlp.vocab.strings[match_id])

    entities = []
    entity_map = {}

    for i, ent in enumerate(doc.ents):
        ent_type = ENTITY_MAPPING.get(ent.label_, ent.label_)
        entity_id = f"e{i + 1}"
        entities.append({
            "id": entity_id,
            "name": ent.text,
            "type": ent_type,
            "start": ent.start,
            "end": ent.end
        })
        for token_idx in range(ent.start, ent.end):
            entity_map[token_idx] = entity_id

    relations = []
    for token in doc:
        if token.pos_ == "VERB" and token.text not in STOP_VERBS:
            subj = next((child for child in token.children if child.dep_ in {"nsubj", "nsubjpass"}), None)
            obj = next((child for child in token.children if child.dep_ in {"dobj", "obj"}), None)
            iobj = next((child for child in token.children if child.dep_ == "iobj"), None)
            prep_obj = next((gc for c in token.children if c.dep_ == "prep" for gc in c.children if gc.dep_ == "pobj"), None)

            rel_type = VERB_RELATION_MAP.get(token.text, token.text)

            if subj and obj:
                subj_ent = find_entity(subj.i, entity_map)
                obj_ent = find_entity(obj.i, entity_map)
                if subj_ent and obj_ent:
                    relations.append({
                        "source": subj_ent,
                        "target": obj_ent,
                        "type": rel_type,
                        "verb": token.text
                    })

            if subj and prep_obj and (not obj or prep_obj.i != obj.i):
                subj_ent = find_entity(subj.i, entity_map)
                prep_ent = find_entity(prep_obj.i, entity_map)
                if subj_ent and prep_ent:
                    relations.append({
                        "source": subj_ent,
                        "target": prep_ent,
                        "type": rel_type,
                        "verb": token.text
                    })

    for sent in doc.sents:
        sent_entities = [ent for ent in entities if ent['start'] < len(doc) and doc[ent['start']].sent == sent]
        if len(sent_entities) >= 2:
            for i in range(len(sent_entities)):
                for j in range(i + 1, len(sent_entities)):
                    if sent_entities[i]['type'] == sent_entities[j]['type']:
                        continue
                    has_relation = any(
                        (r['source'] == sent_entities[i]['id'] and r['target'] == sent_entities[j]['id']) or
                        (r['source'] == sent_entities[j]['id'] and r['target'] == sent_entities[i]['id'])
                        for r in relations
                    )
                    if not has_relation:
                        similarity = calculate_similarity(sent_entities[i]['name'], sent_entities[j]['name'])
                        if similarity > 0.15:
                            relations.append({
                                "source": sent_entities[i]["id"],
                                "target": sent_entities[j]["id"],
                                "type": "co-occurrence",
                                "verb": "同现",
                                "similarity": round(similarity, 2)
                            })

    return {"entities": entities, "relations": relations}

def find_entity(token_index, entity_map):
    return entity_map.get(token_index)

def calculate_similarity(text1, text2):
    doc1 = nlp(text1)
    doc2 = nlp(text2)
    return doc1.similarity(doc2)

def test_extraction(text, case_name):
    print(f"\n{'=' * 40}")
    print(f"测试用例: {case_name}")
    print(f"{'=' * 40}")
    print(f"文本内容: '{text[:100] + '...' if len(text) > 100 else text}'")
    result = extract_entities_relations(text)
    print("\n抽取结果:")
    print(json.dumps(result, indent=2, ensure_ascii=False))
    print("\n实体列表:")
    for ent in result["entities"]:
        print(f"- [{ent['id']}] {ent['name']} ({ent['type']})")
    print("\n关系列表:")
    for rel in result["relations"]:
        try:
            source_ent = next(e for e in result["entities"] if e["id"] == rel["source"])
            target_ent = next(e for e in result["entities"] if e["id"] == rel["target"])
            if rel["type"] == "co-occurrence":
                print(f"- {source_ent['name']} --[{rel['verb']}](相似度:{rel['similarity']})--> {target_ent['name']}")
            else:
                print(f"- {source_ent['name']} --[{rel['verb']}]--> {target_ent['name']}")
        except StopIteration:
            print(f"- 关系解析失败: {rel}")
    return result


if __name__ == "__main__":
    text1 = '在2023年6月15日，北京的人工智能公司"深度智云"宣布与上海的科技巨头"未来科技"达成战略合作协议。根据协议，深度智云将为未来科技开发基于大语言模型的智能客服系统，该系统将集成自然语言处理和计算机视觉技术，预计在2024年3月正式上线。深度智云的首席执行官李明博士表示，此次合作将加速人工智能技术在金融、医疗和教育领域的应用。未来科技的董事会主席王建国先生则强调，双方将共同投资5亿元人民币，在深圳建立一个联合研发中心，专注于生成式AI和多模态交互技术的研究。此外，著名科学家张教授也将加入该项目，担任技术顾问。这一合作被行业专家认为是AI领域的里程碑事件，将重塑中国科技产业的格局。'
    # text1='2023年12月20日，位于南京的半导体制造商“中芯先进”宣布，与合肥的高校“华东科技大学”签订产学研合作协议。此次合作将围绕3纳米制程工艺、EDA工具优化及晶圆测试自动化等领域展开。中芯先进计划投资3亿元用于建设联合实验室，并将选派技术骨干担任企业导师，指导高校研究生参与芯片原型设计。华东科技大学校长李志强指出，该项目不仅将提升我国高端芯片设计能力，也将为地方产业发展注入新动能。'
    result = test_extraction(text1, "商业合作新闻")

    # ✅ 写入 JSON 文件
    output_json_path = "extracted_result.json"
    with open(output_json_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(f"\n✅ 抽取结果已保存为 JSON 文件: {output_json_path}")

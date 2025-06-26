# import unittest
# from django.test import Client



# from kg_modules.neo4j_connector import run_cypher
# from backend.kgapi.extractor import extract_entities_relations

# class ProjectAllTestCase(unittest.TestCase):
#     def setUp(self):
#         self.client = Client()

#     def test_neo4j_connection_and_write(self):
#         # 写入一个测试节点
#         run_cypher("MERGE (p:Person {name: $name, born: $born})", {"name": "测试小明", "born": 2000})
#         # 查询节点
#         result = run_cypher("MATCH (p:Person {name: $name}) RETURN p", {"name": "测试小明"})
#         print("Neo4j 查询结果：", result, flush=True)
#         self.assertTrue(len(result) > 0)
#         self.assertEqual(result[0]['p']['name'], "测试小明")

#     def test_entity_extraction(self):
#         text = "张常宁，1995年11月6日出生于江苏省常州市， 毕业于南京师范大学。 中国女子排球运动员， 场上司职主攻、接应， 现效力于江苏中天钢铁女排俱乐部。 张常宁10岁开始练排球。 初二时，她被选入沙滩排球国家队。 2011赛季，张常宁搭档林玲玲在沙排世少赛中夺得中国队历史最佳战绩，获铜牌。 2013年张常宁代表江苏队参加室内排球全运会U19青少年比赛获得第三名后，坚持转项。 2013年12月24日，中国排协宣布张常宁补报参加女排联赛。 她在比赛中展现出五轮一传的保障能力， 并且在攻守两端都表现出了潜力。 2015年5月，张常宁第一次以中国女排国家队一队队员的身份参加了亚洲女排锦标赛。 此后张常宁随中国女排获得2015世界杯冠军、 2016奥运会冠军。 2016年5月，张常宁被体育总局正式授予国际级健将称号。 2016-2017赛季，张常宁在联赛中逐渐成长为江苏队攻防核心，帮助江苏女排夺得队史首冠，她本人获得中国排球协会女排联赛最有价值球员。 2019年，中国女排在张常宁的助力下，成功实现了女排世界杯的卫冕。 2024年5月，张常宁替补登场2024世界女排联赛。 2024年6月24日，江苏省体育局官网公示了2024年省优秀运动队拟退役运动员名单，张常宁在列。 2024年6月29日，张常宁入选中国国家女子排球队参加2024年巴黎奥运会排球比赛运动员参赛名单。 2025年3月4日，获得2024-2025中国女子排球超级联赛冠军。"
#         result = extract_entities_relations(text)
#         # print("实体抽取结果：", result, flush=True)
#         persons = [e for e in result['entities'] if e['type'] == 'Person']
#         self.assertTrue(any('张常宁' in p['name'] for p in persons))

#     def test_search_api(self):
#         # 先确保有数据
#         run_cypher("MERGE (n:Person {name: $name})", {"name": "小李"})
#         response = self.client.get('/api/search/?q=小李')
#         self.assertEqual(response.status_code, 200)
#         data = response.json()
#         self.assertIn('results', data)
#         self.assertTrue(any('小李' in e.get('name', '') for e in data['results']))

# if __name__ == '__main__':
#     unittest.main() 

#     # 这个测试结果的意思是：
#     # 你的测试一共运行了3个（Found 3 test(s).），其中有1个测试失败（F.），其余2个测试通过（.）。
#     # 失败的测试是 test_entity_extraction，在 test_all.py 的第25行。
#     # 失败原因是：self.assertTrue(any('小李' in p['name'] for p in persons)) 断言失败。
#     # 也就是说，extract_entities_relations(text) 返回的结果中，entities 里没有 type 为 'Person' 且 name 包含 '小李' 的实体。
#     # 你需要检查 extract_entities_relations 的实现，确保它能正确识别文本中的“人名”实体“小李”。

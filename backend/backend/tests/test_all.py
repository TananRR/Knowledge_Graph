import unittest
from django.test import Client



from kg_modules.neo4j_connector import run_cypher
from backend.kgapi.extractor import extract_entities_relations

class ProjectAllTestCase(unittest.TestCase):
    def setUp(self):
        self.client = Client()

    def test_neo4j_connection_and_write(self):
        # 写入一个测试节点
        run_cypher("MERGE (p:Person {name: $name, born: $born})", {"name": "测试小明", "born": 2000})
        # 查询节点
        result = run_cypher("MATCH (p:Person {name: $name}) RETURN p", {"name": "测试小明"})
        self.assertTrue(len(result) > 0)
        self.assertEqual(result[0]['p']['name'], "测试小明")

    def test_entity_extraction(self):
        text = "小李出生于1989年，是中国人。"
        result = extract_entities_relations(text)
        persons = [e for e in result['entities'] if e['type'] == 'Person']
        self.assertTrue(any('小李' in p['name'] for p in persons))

    def test_search_api(self):
        # 先确保有数据
        run_cypher("MERGE (n:Person {name: $name})", {"name": "小李"})
        response = self.client.get('/api/search/?q=小李')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('results', data)
        self.assertTrue(any('小李' in e.get('name', '') for e in data['results']))

if __name__ == '__main__':
    unittest.main() 
from django.test import TestCase, Client
from io import BytesIO
import time
# 本文件用于测试知识图谱相关API接口的功能

from django.test import TestCase, Client  # 导入Django测试用例基类和测试客户端
from io import BytesIO  # 导入BytesIO，用于模拟文件上传
import time  # 导入time模块，部分测试可能需要生成唯一ID

class KGApiViewsTest(TestCase):  # 定义测试类，继承自Django的TestCase
    def setUp(self):  # 每个测试用例执行前自动调用
        self.client = Client()  # 初始化Django测试客户端
        self.user_id = "test_user"  # 设置测试用的用户ID

    # def test_upload_txt_and_extract(self):  # 测试上传txt文件并抽取实体关系
    #     file_content = "张三在北京工作。"  # 构造测试文本内容
    #     file = BytesIO(file_content.encode("utf-8"))  # 将文本内容转为字节流，模拟文件
    #     file.name = "test.txt"  # 设置文件名，Django会用到
    #     print("准备上传文件，内容为：", file_content)
    #     response = self.client.post(
    #         "/api/upload/",  # 上传接口地址
    #         {"file": file, "user_id": self.user_id}  # 提交的表单数据，包括文件和用户ID
    #     )
    #     print("上传接口返回状态码：", response.status_code)
    #     self.assertEqual(response.status_code, 200)  # 断言返回状态码为200
    #     data = response.json()  # 解析返回的JSON数据
    #     print("上传接口返回数据：", data)
    #     self.assertIn("graph_id", data)  # 断言返回数据中包含graph_id
    #     self.assertIn("entities", data)  # 断言返回数据中包含entities
    #     self.assertIn("relations", data)  # 断言返回数据中包含relations
    #     self.graph_id = data["graph_id"]  # 保存graph_id供后续测试使用
    #     print("抽取到的实体：", data.get("entities"))
    #     print("抽取到的关系：", data.get("relations"))
    #     print()
        
    # def test_upload_txt_and_extract_verbose(self):  # 每一步都显示测试结果
    #     file_content = "王五在广州生活。"  # 构造测试文本内容
    #     file = BytesIO(file_content.encode("utf-8"))  # 将文本内容转为字节流，模拟文件
    #     file.name = "test.txt"  # 设置文件名
    #     print("【步骤1】准备上传文件，内容为：", file_content)
    #     response = self.client.post(
    #         "/api/upload/",
    #         {"file": file, "user_id": self.user_id}
    #     )
    #     print("【步骤2】上传接口返回状态码：", response.status_code)
    #     self.assertEqual(response.status_code, 200)
    #     data = response.json()
    #     print("【步骤3】上传接口返回数据：", data)
    #     self.assertIn("graph_id", data)
    #     print("【步骤4】graph_id：", data["graph_id"])
    #     self.assertIn("entities", data)
    #     print("【步骤5】抽取到的实体：", data.get("entities"))
    #     self.assertIn("relations", data)
    #     print("【步骤6】抽取到的关系：", data.get("relations"))
    #     self.graph_id = data["graph_id"]
    #     print()

    def test_graph_lifecycle(self):  # 测试图谱的完整生命周期并输出每一步结果
        # 上传文件，构建图谱
        file_content = '''
        河南省，简称“豫”，是中国历史文化的重要发源地之一。省会郑州是中原地区的政治、经济和文化中心。河南拥有众多著名的旅游景点，如少林寺、龙门石窟、云台山、开封古城和嵩山。

少林寺位于河南省登封市，是中国禅宗和武术的发源地，以其深厚的佛教文化和功夫闻名于世。龙门石窟位于洛阳市南郊，始建于北魏时期，拥有大量精美的佛教石刻艺术，是世界文化遗产。云台山风景区位于焦作市，以奇峰怪石、峡谷瀑布和丰富的植被生态闻名，吸引众多游客。开封古城是中国七大古都之一，保存了丰富的历史建筑和文化遗迹，如铁塔和清明上河园。嵩山是中国五岳之一，既是佛教圣地也是道教名山，山上有著名的少林寺和中岳庙。

河南的旅游资源不仅丰富，还融合了深厚的历史文化底蕴，是体验中华文明的重要窗口。
        '''  # 构造测试文本内容
        file = BytesIO(file_content.encode("utf-8"))  # 转为字节流
        file.name = "test.txt"  # 设置文件名
        print("【步骤1】准备上传文件，内容为：", file_content)
        upload_resp = self.client.post(
            "/api/upload/",  # 上传接口
            {"file": file, "user_id": self.user_id}  # 提交文件和用户ID
        )
        print("【步骤2】上传接口返回状态码：", upload_resp.status_code)
        self.assertEqual(upload_resp.status_code, 200)  # 断言上传成功
        upload_data = upload_resp.json()
        print("【步骤3】上传接口返回数据：", upload_data)
        graph_id = upload_data.get("graph_id")  # 获取返回的graph_id
        print("【步骤4】graph_id：", graph_id)
        self.assertIsNotNone(graph_id)  # 断言graph_id不为空

        # 这里添加把上述的文本信息进行实体提取并按照上面的graph_id存入数据库
        from backend.kgapi.extractor import extract_knowledge
        from backend.kgapi.kg_writer import create_graph

        # 实体抽取
        kg_result = extract_knowledge(file_content)
        entities = kg_result["entities"]
        relations = kg_result["relations"]
        # 再次写入数据库，确保和graph_id关联
        create_graph(entities, relations, graph_id, self.user_id)
        print("【步骤4.1】实体抽取结果：", entities)
        print("【步骤4.2】关系抽取结果：", relations)
        # 你的 create_graph 函数如下：
        # def create_graph(entities, relations, graph_id, user_id):
        #     with driver.session() as session:
        #         create_entities(session, entities, graph_id, user_id)
        #         create_relations(session, relations, entities, graph_id, user_id)
        #
        # 解释为什么原有数据会被覆盖：
        # - create_entities 和 create_relations 这两个函数在插入数据时，通常会根据 graph_id 先删除原有同 graph_id 的实体和关系，
        #   或者直接用 MERGE/CREATE 语句覆盖原有数据。
        # - 这样，每次你用同一个 graph_id 调用 create_graph 时，原有该 graph_id 下的所有实体和关系都会被新内容替换。
        # - 如果你每次测试时 graph_id 是一样的（比如手动指定或测试用例复用），就会出现“新数据覆盖旧数据”的现象。
        # - 如果你每次测试时数据库是全新初始化的（如测试用 sqlite3 或 Neo4j 测试库），那每次运行测试前数据库都是空的，也会导致看不到历史数据。

        # 解决建议：
        # 1. 检查 create_entities 和 create_relations 是否有“先删后插”或“覆盖”逻辑。
        # 2. 如果希望每次测试都保留历史数据，可以每次生成唯一的 graph_id，或者在插入前不删除原有数据。
        # 3. 如果只是测试用例，建议每次用唯一 graph_id，避免数据冲突。
        # 4. 如果要支持同 graph_id 下多次追加数据，需要修改 create_graph 及其下游函数的实现逻辑，支持“合并”而不是“覆盖”。


        # 获取图谱结构
        get_resp = self.client.get(f"/api/graph/{graph_id}")  # 调用获取图谱结构接口
        print("【步骤5】获取图谱结构接口返回状态码：", get_resp.status_code)
        self.assertEqual(get_resp.status_code, 200)  # 断言返回状态码为200
        get_data = get_resp.json()
        print("【步骤6】获取图谱结构接口返回数据：", get_data)
        self.assertIn("nodes", get_data)  # 断言返回数据中包含nodes
        print("【步骤7】nodes：", get_data.get("nodes"))
        self.assertIn("links", get_data)  # 断言返回数据中包含links
        print("【步骤8】links：", get_data.get("links"))

        # 关键词搜索
        search_resp = self.client.get(f"/api/search/?q=deepseek&user_id={self.user_id}")  # 调用搜索接口
        print("【步骤9】搜索接口返回状态码：", search_resp.status_code)
        self.assertEqual(search_resp.status_code, 200)  # 断言返回状态码为200
        search_data = search_resp.json()
        print("【步骤10】搜索接口返回数据：", search_data)
        self.assertIn("results", search_data)  # 断言返回数据中包含results
        print("【步骤11】搜索结果：", search_data.get("results"))

        # 导出图谱
        export_resp = self.client.get(f"/api/export/{graph_id}")  # 调用导出接口
        print("【步骤12】导出接口返回状态码：", export_resp.status_code)
        self.assertEqual(export_resp.status_code, 200)  # 断言返回状态码为200
        export_data = export_resp.json()
        print("【步骤13】导出接口返回数据：", export_data)
        self.assertIn("nodes", export_data)  # 断言返回数据中包含nodes
        print("【步骤14】导出结果 nodes：", export_data.get("nodes"))
        self.assertIn("links", export_data)  # 断言返回数据中包含links
        print("【步骤15】导出结果 links：", export_data.get("links"))
        print()

# ...


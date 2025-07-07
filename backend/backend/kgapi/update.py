import os
import time
import logging
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from docx import Document
import fitz  # PyMuPDF
import pdfplumber
from .extract import process_text_to_json
from .kg_writer import update_knowledge_graph
from .BaiduFanyi import BaiduTranslator,translate_relations_with_api
# 配置日志
logger = logging.getLogger(__name__)

translator = BaiduTranslator(
            appid='20250706002398770',
            secret_key='XgSUBZMZ_uJyDTQNvZbj'
        )


# 复用extract.py中的常量和方法
ALLOWED_EXTENSIONS = {'txt', 'pdf', 'docx'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
SUPPORTED_MIME_TYPES = {
    'text/plain',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
}


class FileProcessingError(Exception):
    """自定义文件处理异常"""
    pass


def validate_file(file):
    """验证上传的文件是否合法"""
    if not file:
        raise FileProcessingError("未提供文件")

    if file.size > MAX_FILE_SIZE:
        raise FileProcessingError(f"文件大小超过限制({MAX_FILE_SIZE / 1024 / 1024}MB)")

    ext = file.name.split('.')[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise FileProcessingError("不支持的文件类型")

    mime_type = getattr(file, 'content_type', '').split(';')[0]
    if mime_type not in SUPPORTED_MIME_TYPES:
        raise FileProcessingError("非法的文件MIME类型")


def extract_text_from_pdf(file):
    """提取PDF文件文本"""
    try:
        # 优先使用 PyMuPDF
        pdf_document = fitz.open(stream=file.read(), filetype="pdf")
        text = []
        for page_num in range(len(pdf_document)):
            page = pdf_document.load_page(page_num)
            text.append(page.get_text())
        result = "\n".join(text)
        if len(result.strip()) > 10:  # 简单验证提取结果
            return result
    except Exception as e:
        logger.warning(f"PyMuPDF提取失败，尝试pdfplumber: {str(e)}")

    try:
        # 回退到 pdfplumber
        file.seek(0)  # 重置文件指针
        with pdfplumber.open(file) as pdf:
            text = []
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:  # 避免添加None
                    text.append(page_text)
            return "\n".join(text)
    except Exception as e:
        logger.error(f"PDF文本提取失败: {str(e)}")
        raise FileProcessingError("无法从PDF提取文本")


def extract_text_from_docx(file):
    """提取DOCX文件文本"""
    try:
        file.seek(0)  # 确保文件指针在开头
        doc = Document(file)
        return "\n".join(para.text for para in doc.paragraphs if para.text.strip())
    except Exception as e:
        logger.error(f"DOCX文本提取失败: {str(e)}")
        raise FileProcessingError("无法从DOCX提取文本")


@csrf_exempt
@require_http_methods(["POST"])
def update_knowledge_from_file(request):
    """处理文件上传并更新知识图谱的接口"""
    try:
        # 获取上传的文件和必要参数
        file = request.FILES.get("file")
        graph_id = request.POST.get("graph_id")
        user_id = request.POST.get("user_id")

        if not graph_id:
            raise FileProcessingError("必须提供graph_id参数")
        if not user_id:
            raise FileProcessingError("必须提供user_id参数")

        # 验证文件
        validate_file(file)

        # 记录开始时间用于性能监控
        start_time = time.time()

        # 根据文件类型提取文本
        file_extension = file.name.split('.')[-1].lower()
        text = ""

        if file_extension == 'txt':
            text = file.read().decode('utf-8')
        elif file_extension == 'pdf':
            text = extract_text_from_pdf(file)
        elif file_extension == 'docx':
            text = extract_text_from_docx(file)

        # 检查是否成功提取到文本
        if not text.strip():
            raise FileProcessingError("提取到的文本内容为空")

        # 抽取知识
        kg_result = process_text_to_json(text)
        kg_result = translate_relations_with_api(kg_result,translator)

        # 更新知识图谱
        entities = kg_result["entities"]
        relations = kg_result["relations"]

        # 获取Neo4j会话（这里假设你已经有一个获取会话的方法）
        # 如果没有，你需要从你的配置中获取或创建一个
        session = get_neo4j_session()  # 你需要实现这个函数

        new_entities, new_relations = update_knowledge_graph(
            session=session,
            entities=entities,
            relations=relations,
            graph_id=graph_id,
            user_id=user_id
        )

        # 记录处理耗时
        processing_time = time.time() - start_time
        logger.info(f"知识图谱更新完成: 图谱ID={graph_id}, 新增实体={new_entities}, "
                    f"新增关系={new_relations}, 耗时={processing_time:.2f}秒")

        return JsonResponse({
            "status": "success",
            "graph_id": graph_id,
            "new_entities": new_entities,
            "new_relations": new_relations,
            "processing_time": f"{processing_time:.2f}秒",
            "file_info": {
                "name": file.name,
                "size": file.size,
                "type": file.content_type
            }
        }, status=200)

    except FileProcessingError as e:
        logger.warning(f"文件处理失败: {str(e)}")
        return JsonResponse({
            "status": "error",
            "error": str(e),
            "message": "文件处理失败"
        }, status=400)

    except Exception as e:
        logger.error(f"服务器错误: {str(e)}", exc_info=True)
        return JsonResponse({
            "status": "error",
            "error": "服务器内部错误",
            "message": "处理过程中发生意外错误"
        }, status=500)


def get_neo4j_session():
    """
    获取Neo4j数据库会话
    你需要根据你的实际配置实现这个函数
    """
    # 示例代码 - 需要根据你的实际配置修改
    from neo4j import GraphDatabase

    uri = settings.NEO4J_URI
    user = settings.NEO4J_USER
    password = settings.NEO4J_PASSWORD

    driver = GraphDatabase.driver(uri, auth=(user, password))
    return driver.session()
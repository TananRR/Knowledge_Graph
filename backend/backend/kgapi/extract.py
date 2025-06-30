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
from .extractor import extract_knowledge
from .kg_writer import create_graph

# 配置日志
logger = logging.getLogger(__name__)

# 常量定义
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
    """
    使用 PyMuPDF 和 pdfplumber 双重方式提取 PDF 文本
    """
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
    """提取 DOCX 文件文本"""
    try:
        file.seek(0)  # 确保文件指针在开头
        doc = Document(file)
        return "\n".join(para.text for para in doc.paragraphs if para.text.strip())
    except Exception as e:
        logger.error(f"DOCX文本提取失败: {str(e)}")
        raise FileProcessingError("无法从DOCX提取文本")


def save_uploaded_file(file):
    """保存上传的文件到临时目录"""
    upload_dir = os.path.join(settings.MEDIA_ROOT, 'uploads')
    os.makedirs(upload_dir, exist_ok=True)

    file_path = os.path.join(upload_dir, file.name)
    with open(file_path, 'wb+') as destination:
        for chunk in file.chunks():
            destination.write(chunk)
    return file_path


@csrf_exempt
@require_http_methods(["POST"])
def extract_text_from_file(request):
    """处理文件上传和知识提取的主视图函数"""
    try:
        # 获取上传的文件
        file = request.FILES.get("file")

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
        kg_result = extract_knowledge(text)

        # 创建知识图谱
        graph_id = time.strftime("graph_%Y%m%d%H%M%S")
        user_id = request.POST.get("user_id", "default_user")
        create_graph(kg_result["entities"], kg_result["relations"], graph_id, user_id)

        # 记录处理耗时
        processing_time = time.time() - start_time
        logger.info(f"文件处理完成: {file.name}, 大小: {file.size / 1024:.2f}KB, 耗时: {processing_time:.2f}秒")

        return JsonResponse({
            "status": "success",
            "text": text[:1000] + "..." if len(text) > 1000 else text,  # 返回部分文本预览
            "entities": kg_result["entities"],
            "relations": kg_result["relations"],
            "graph_id": graph_id,
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
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from docx import Document
import fitz  # PyMuPDF
import pdfplumber
from .extractor import extract_knowledge  # 🔗 加入这一行
from .kg_writer import create_graph,get_graph_data
import time


@csrf_exempt
@require_http_methods(["POST"])
def extract_text_from_file(request):
    try:
        file = request.FILES.get("file")
        if not file:
            return JsonResponse({"error": "No file provided"}, status=400)

        file_extension = file.name.split(".")[-1].lower()
        text = ""
        if file_extension == "txt":
            text = file.read().decode("utf-8")
        elif file_extension == "pdf":
            text = extract_text_from_pdf(file)
        elif file_extension == "docx":
            text = extract_text_from_docx(file)
        else:
            return JsonResponse({"error": "Unsupported file format"}, status=400)

        # 抽取实体与关系
        kg_result = extract_knowledge(text)

        entities = kg_result["entities"]
        relations = kg_result["relations"]

        graph_id = time.strftime("graph_%Y%m%d%H%M%S")
        user_id = request.POST.get("user_id", "default_user")

        create_graph(entities, relations, graph_id, user_id)
        # data = get_graph_data(graph_id)

        return JsonResponse({
            "text": text,
            "entities": kg_result["entities"],
            "relations": kg_result["relations"],
            "message": "构建成功",
            "graph_id": graph_id,
            # "nodes": data.get("nodes", data.get("entities", [])),
            # "links": data.get("links", data.get("relations", []))
        }, status=200)

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


def extract_text_from_pdf(file):
    """
    使用 PyMuPDF 提取 PDF 文件中的文本
    """
    try:
        # 使用 PyMuPDF
        pdf_document = fitz.open(stream=file, filetype="pdf")
        text = []
        for page_num in range(len(pdf_document)):
            page = pdf_document.load_page(page_num)
            text.append(page.get_text())
        return "\n".join(text)
    except Exception as e:
        # 如果 PyMuPDF 失败，尝试使用 pdfplumber
        try:
            with pdfplumber.open(file) as pdf:
                text = []
                for page in pdf.pages:
                    text.append(page.extract_text())
                return "\n".join(text)
        except Exception as e:
            raise Exception(f"Failed to extract text from PDF: {str(e)}")


def extract_text_from_docx(file):
    """
    使用 python-docx 提取 DOCX 文件中的文本
    """
    try:
        doc = Document(file)
        text = []
        for para in doc.paragraphs:
            text.append(para.text)
        return "\n".join(text)
    except Exception as e:
        raise Exception(f"Failed to extract text from DOCX: {str(e)}")

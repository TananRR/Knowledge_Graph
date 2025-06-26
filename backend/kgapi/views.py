from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .kg_writer import (
    create_graph, search_entities, get_graph_data, delete_graph
)
from .extractor import extract_knowledge  # 你自己写的实体关系抽取模块
import time


# 1. 上传文件 + 抽取知识 + 构建图谱
@csrf_exempt
def upload_and_extract(request):
    if request.method != 'POST':
        return JsonResponse({"error": "仅支持 POST 上传"}, status=405)

    file = request.FILES.get("file")
    if not file:
        return JsonResponse({"error": "请上传文件"}, status=400)

    text = file.read().decode("utf-8")
    result = extract_knowledge(text)  # 返回 dict
    entities = result["entities"]
    relations = result["relations"]

    graph_id = time.strftime("graph_%Y%m%d%H%M%S")
    user_id = request.POST.get("user_id", "default_user")

    create_graph(entities, relations, graph_id, user_id)

    return JsonResponse({"message": "构建成功", "graph_id": graph_id})


# 2. 获取图谱结构

def get_graph(request, graph_id):
    try:
        data = get_graph_data(graph_id)
        return JsonResponse({
            "nodes": data.get("nodes", data.get("entities", [])),
            "links": data.get("links", data.get("relations", []))
        })
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


# 3. 关键词搜索

def search_entity(request):
    keyword = request.GET.get("q", "")
    user_id = request.GET.get("user_id", "default_user")

    if not keyword:
        return JsonResponse({"error": "请提供关键词参数 ?q=xxx"}, status=400)

    try:
        results = search_entities(user_id, keyword)
        return JsonResponse({"results": results})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


# 4. 删除图谱
@csrf_exempt
def delete_graph_view(request, graph_id):
    if request.method != 'DELETE':
        return JsonResponse({"error": "仅支持 DELETE"}, status=405)

    try:
        delete_graph(graph_id)
        return JsonResponse({"message": "图谱已删除"})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


# 5. 导出图谱为 JSON

def export_graph(request, graph_id):
    try:
        data = get_graph_data(graph_id)
        return JsonResponse(data, safe=False)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

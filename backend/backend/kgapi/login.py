from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
import json

from kg_modules.neo4j_connector import run_cypher

@csrf_exempt
def login(request):
    if request.method != "POST":
        return JsonResponse({"error": "仅支持POST请求"}, status=405)

    # 检查请求内容类型是否为 JSON
    if request.content_type == 'application/json':
        try:
            # 解析 JSON 请求体
            data = json.loads(request.body)
            user_id = data.get("user_id")
            password = data.get("password")
        except json.JSONDecodeError:
            return JsonResponse({"error": "无效的JSON格式"}, status=400)
    else:
        # 处理传统表单数据
        user_id = request.POST.get("user_id")
        password = request.POST.get("password")

    # 验证参数
    if not user_id or not password:
        return JsonResponse({"error": "用户名和密码不能为空"}, status=400)

    # 使用kg_modules中的run_cypher进行Neo4j查询
    cypher = "MATCH (u:User {id: $user_id, password: $password}) RETURN u"
    params = {"user_id": user_id, "password": password}
    result = run_cypher(cypher, params)
    if result and len(result) > 0:
        return JsonResponse({"message": "登录成功", "user_id": user_id})
    else:
        return JsonResponse({"error": "用户名或密码错误"}, status=401)

        # 注册用户接口
@csrf_exempt
def register(request):
    if request.method != "POST":
        return JsonResponse({"error": "仅支持POST请求"}, status=405)

    if request.content_type == 'application/json':
        try:
            data = json.loads(request.body)
            user_id = data.get("user_id")
            password = data.get("password")
        except json.JSONDecodeError:
            return JsonResponse({"error": "无效的JSON格式"}, status=400)
    else:
        user_id = request.POST.get("user_id")
        password = request.POST.get("password")

    if not user_id or not password:
        return JsonResponse({"error": "用户名和密码不能为空"}, status=400)

    # 检查用户是否已存在
    cypher_check = "MATCH (u:User {id: $user_id}) RETURN u"
    params_check = {"user_id": user_id}
    result = run_cypher(cypher_check, params_check)
    if result and len(result) > 0:
        return JsonResponse({"error": "用户已存在"}, status=409)

    # 创建新用户
    cypher_create = "CREATE (u:User {id: $user_id, password: $password}) RETURN u"
    params_create = {"user_id": user_id, "password": password}
    run_cypher(cypher_create, params_create)
    return JsonResponse({"message": "注册成功", "user_id": user_id})

# 删除用户接口
@csrf_exempt
def delete_user(request):
    if request.method != "POST":
        return JsonResponse({"error": "仅支持POST请求"}, status=405)

    if request.content_type == 'application/json':
        try:
            data = json.loads(request.body)
            user_id = data.get("user_id")
            password = data.get("password")
        except json.JSONDecodeError:
            return JsonResponse({"error": "无效的JSON格式"}, status=400)
    else:
        user_id = request.POST.get("user_id")
        password = request.POST.get("password")

    if not user_id or not password:
        return JsonResponse({"error": "用户名和密码不能为空"}, status=400)

    # 验证用户身份
    cypher_check = "MATCH (u:User {id: $user_id, password: $password}) RETURN u"
    params_check = {"user_id": user_id, "password": password}
    result = run_cypher(cypher_check, params_check)
    if not result or len(result) == 0:
        return JsonResponse({"error": "用户名或密码错误"}, status=401)

    # 删除用户节点
    cypher_delete = "MATCH (u:User {id: $user_id}) DETACH DELETE u"
    params_delete = {"user_id": user_id}
    run_cypher(cypher_delete, params_delete)
    return JsonResponse({"message": "用户已删除", "user_id": user_id})

# 修改密码接口
@csrf_exempt
def change_password(request):
    if request.method != "POST":
        return JsonResponse({"error": "仅支持POST请求"}, status=405)

    if request.content_type == 'application/json':
        try:
            data = json.loads(request.body)
            user_id = data.get("user_id")
            old_password = data.get("old_password")
            new_password = data.get("new_password")
        except json.JSONDecodeError:
            return JsonResponse({"error": "无效的JSON格式"}, status=400)
    else:
        user_id = request.POST.get("user_id")
        old_password = request.POST.get("old_password")
        new_password = request.POST.get("new_password")

    if not user_id or not old_password or not new_password:
        return JsonResponse({"error": "用户名、原密码和新密码不能为空"}, status=400)

    # 验证原密码
    cypher_check = "MATCH (u:User {id: $user_id, password: $old_password}) RETURN u"
    params_check = {"user_id": user_id, "old_password": old_password}
    result = run_cypher(cypher_check, params_check)
    if not result or len(result) == 0:
        return JsonResponse({"error": "用户名或原密码错误"}, status=401)

    # 更新密码
    cypher_update = "MATCH (u:User {id: $user_id}) SET u.password = $new_password RETURN u"
    params_update = {"user_id": user_id, "new_password": new_password}
    run_cypher(cypher_update, params_update)
    return JsonResponse({"message": "密码修改成功", "user_id": user_id})

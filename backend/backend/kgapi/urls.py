# kgapi/urls.py
from django.urls import path
from .views import search_entity  # 确保这是正确的导入
from .export import export_knowledge_graph
from .extract import extract_text_from_file
from .delete import delete_all_graphs, delete_graph_by_id, delete_graphs_by_user
from .query import get_graph_by_id, get_user_graph_ids, get_graphs_by_user, get_all_graphs
from .login import login,register,delete_user,change_password
from .delete_node import delete_node
from .add_node import add_node

urlpatterns = [
    path('search/', search_entity),  # 确保这个路径存在
    path('export/', export_knowledge_graph),
    path('extract/', extract_text_from_file),
    path('delete/all/', delete_all_graphs),
    path('delete/graph/', delete_graph_by_id),
    path('delete/user/', delete_graphs_by_user),
    path('query/graph/', get_graph_by_id),
    path('query/user/graph_ids/', get_user_graph_ids ),
    path('query/user/graphs/', get_graphs_by_user),
    path('query/all/graphs/', get_all_graphs),
    path('login/',login),
    path('register/',register),
    path('delete_user/',delete_user),
    path('change_password/',change_password),
    path('delete/node/', delete_node),  # 删除节点
    path('add/node/', add_node),
]
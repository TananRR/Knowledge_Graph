# kgapi/urls.py
from django.urls import path
from .views import search_entity  # 确保这是正确的导入
from .export import export_knowledge_graph
from .extract import extract_text_from_file
from .delete import delete_all_graphs, delete_graph_by_id, delete_graphs_by_user

urlpatterns = [
    path('search/', search_entity),  # 确保这个路径存在
    path('export/', export_knowledge_graph),
    path('extract/', extract_text_from_file),
    path('delete/all/', delete_all_graphs),
    path('delete/graph/', delete_graph_by_id),
    path('delete/user/', delete_graphs_by_user),
]
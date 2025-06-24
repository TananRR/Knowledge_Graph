# kgapi/urls.py
from django.urls import path
from .views import search_entity  # 确保这是正确的导入
from .export import export_knowledge_graph

urlpatterns = [
    path('search/', search_entity),  # 确保这个路径存在
    path('export/', export_knowledge_graph),
]
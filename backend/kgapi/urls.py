# kgapi/urls.py
from django.urls import path
from .views import search_entity  # 确保这是正确的导入

urlpatterns = [
    path('search/', search_entity),  # 确保这个路径存在
]
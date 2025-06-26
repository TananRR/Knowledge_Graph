"""
URL configuration for backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
# backend/urls.py
from django.contrib import admin
from django.urls import path, include
from django.http import HttpResponse  # 添加这个导入

# 添加一个简单的根视图
def home_view(request):
    return HttpResponse("""
        <h1>知识图谱后台服务</h1>
        <p>API 端点：<a href="/api/search/">/api/search/?q=关键词</a></p>
        <p>管理后台：<a href="/admin/">/admin/</a></p>
        <button onclick="handleDeleteByUser">删除用户_id图谱</button>
    """)

urlpatterns = [
    path('', home_view, name='home'),  # 添加根路径
    path('admin/', admin.site.urls),
    path('api/', include('backend.kgapi.urls')),
]


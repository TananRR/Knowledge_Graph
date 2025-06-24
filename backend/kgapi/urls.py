from django.urls import path
from .views import search_entity

urlpatterns = [
    path("search/", search_entity),
]
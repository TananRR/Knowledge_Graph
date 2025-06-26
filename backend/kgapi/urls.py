# kgapi/urls.py

from django.urls import path
from . import views
from .extract import extract_text_from_file


urlpatterns = [
    path("upload/",extract_text_from_file),
    path("graph/<str:graph_id>", views.get_graph),
    path("graph/<str:graph_id>/delete", views.delete_graph_view),
    path("search/", views.search_entity),
    path("export/<str:graph_id>", views.export_graph),
]

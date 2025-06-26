# kgapi/urls.py

from django.urls import path
from . import views
from .delete import delete_all_graphs, delete_graph_by_id, delete_graphs_by_user
from .extract import extract_text_from_file


urlpatterns = [
    path("upload/",extract_text_from_file),
    path("graph/<str:graph_id>", views.get_graph),
    path("search/", views.search_entity),
    path("export/<str:graph_id>", views.export_graph),
    path('delete/all/', delete_all_graphs),
    path('delete/graph/', delete_graph_by_id),
    path('delete/user/', delete_graphs_by_user),
]

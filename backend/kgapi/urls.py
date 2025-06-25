from django.urls import path
from .query import query_node,person_with_relations,person_with_optional_relations

urlpatterns = [
    path('query', query_node),
    path('person_with_relations', person_with_relations),
    path('person_with_optional_relations', person_with_optional_relations),
]

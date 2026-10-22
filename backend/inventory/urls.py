from django.urls import path
from rest_framework.routers import DefaultRouter

from .dashboard import DashboardView
from .views import (
    ProductViewSet,
    PurchaseViewSet,
    SaleViewSet,
    SupplierViewSet,
)

router = DefaultRouter()
router.register("products", ProductViewSet, basename="product")
router.register("suppliers", SupplierViewSet, basename="supplier")
router.register("purchases", PurchaseViewSet, basename="purchase")
router.register("sales", SaleViewSet, basename="sale")

urlpatterns = router.urls + [
    path("dashboard/", DashboardView.as_view(), name="dashboard"),
]
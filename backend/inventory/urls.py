from rest_framework.routers import DefaultRouter

from .views import ProductViewSet, SupplierViewSet

router = DefaultRouter()
router.register("suppliers", SupplierViewSet, basename="supplier")
router.register("products", ProductViewSet, basename="product")

urlpatterns = router.urls
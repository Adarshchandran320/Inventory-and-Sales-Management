from django.db.models import F, Q
from rest_framework import status, viewsets
from rest_framework.response import Response

from .models import Product, Supplier
from .serializers import ProductSerializer, SupplierSerializer


class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all().order_by("company_name")
    serializer_class = SupplierSerializer

    def destroy(self, request, *args, **kwargs):
        supplier = self.get_object()
        if supplier.products.exists() or supplier.purchase_orders.exists():
            return Response(
                {"detail": "Supplier has products or purchase history and cannot be deleted."},
                status=status.HTTP_409_CONFLICT,
            )
        return super().destroy(request, *args, **kwargs)


class ProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductSerializer

    def get_queryset(self):
        qs = Product.objects.select_related("supplier").order_by("product_name")
        p = self.request.query_params

        search = p.get("search")
        if search:
            qs = qs.filter(Q(product_name__icontains=search) | Q(sku__icontains=search))
        if p.get("category"):
            qs = qs.filter(category__iexact=p["category"])
        if p.get("active") in ("true", "false"):
            qs = qs.filter(is_active=(p["active"] == "true"))
        if p.get("low_stock") == "true":
            qs = qs.filter(stock_quantity__lte=F("reorder_level"))
        return qs

    def destroy(self, request, *args, **kwargs):
        product = self.get_object()
        if product.purchase_items.exists() or product.sale_items.exists():
            product.is_active = False
            product.save(update_fields=["is_active", "updated_at"])
            return Response(
                {"detail": "Product has transaction history, so it was deactivated instead of deleted.",
                 "is_active": False},
                status=status.HTTP_200_OK,
            )
        return super().destroy(request, *args, **kwargs)
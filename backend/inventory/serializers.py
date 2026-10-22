from rest_framework import serializers
from rest_framework.exceptions import APIException

from .models import Product, Supplier


class DuplicateSKUError(APIException):
    status_code = 409
    default_detail = "A product with this SKU already exists."
    default_code = "duplicate_sku"


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = "__all__"


class ProductSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source="supplier.company_name", read_only=True)

    class Meta:
        model = Product
        fields = [
            "id", "sku", "product_name", "category", "cost_price", "selling_price",
            "stock_quantity", "reorder_level", "is_active", "supplier",
            "supplier_name", "created_at", "updated_at",
        ]
        read_only_fields = ["stock_quantity"]  # only purchases/sales may change stock
        extra_kwargs = {
            "sku": {"validators": []},  # remove DRF's default 400 so we can return 409
            "cost_price": {"min_value": 0},
            "selling_price": {"min_value": 0},
        }

    def validate_sku(self, value):
        value = value.strip().upper()
        qs = Product.objects.filter(sku=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise DuplicateSKUError()
        return value
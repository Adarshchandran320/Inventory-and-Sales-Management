from decimal import Decimal

from django.db import transaction
from django.db.models import F
from rest_framework import serializers
from rest_framework.exceptions import APIException

from .models import (
    Product, PurchaseOrder, PurchaseOrderItem, Sale, SaleItem, Supplier,
)


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

class PurchaseOrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.product_name", read_only=True)
    sku = serializers.CharField(source="product.sku", read_only=True)
    subtotal = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    unit_cost = serializers.DecimalField(
        max_digits=12, decimal_places=2, min_value=0, required=False
    )
    quantity = serializers.IntegerField(min_value=1)

    class Meta:
        model = PurchaseOrderItem
        fields = ["id", "product", "product_name", "sku", "quantity", "unit_cost", "subtotal"]


class PurchaseOrderSerializer(serializers.ModelSerializer):
    items = PurchaseOrderItemSerializer(many=True)
    supplier_name = serializers.CharField(source="supplier.company_name", read_only=True)
    status = serializers.ChoiceField(
        choices=[PurchaseOrder.Status.DRAFT, PurchaseOrder.Status.ORDERED],
        default=PurchaseOrder.Status.DRAFT,
    )

    class Meta:
        model = PurchaseOrder
        fields = [
            "id", "supplier", "supplier_name", "order_date", "status",
            "total_amount", "received_at", "items",
        ]
        read_only_fields = ["total_amount", "received_at"]  # Rule 4

    def validate_items(self, items):
        if not items:
            raise serializers.ValidationError("A purchase order needs at least one item.")
        ids = [i["product"].id for i in items]
        if len(ids) != len(set(ids)):
            raise serializers.ValidationError("The same product appears more than once.")
        return items

    def validate(self, data):
        supplier = data["supplier"]
        for item in data["items"]:
            product = item["product"]
            if not product.is_active:
                raise serializers.ValidationError(
                    f"Product {product.sku} is inactive and cannot be ordered."
                )
            if product.supplier_id != supplier.id:
                raise serializers.ValidationError(
                    f"Product {product.sku} does not belong to this supplier."
                )
        return data

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop("items")
        order = PurchaseOrder.objects.create(**validated_data)
        total = Decimal("0.00")
        for item in items_data:
            product = item["product"]
            unit_cost = item.get("unit_cost", product.cost_price)  # Rule 8: snapshot
            PurchaseOrderItem.objects.create(
                purchase_order=order,
                product=product,
                quantity=item["quantity"],
                unit_cost=unit_cost,
            )
            total += unit_cost * item["quantity"]
        order.total_amount = total  # Rule 4: server-calculated
        order.save(update_fields=["total_amount", "updated_at"])
        return order

class SaleItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.product_name", read_only=True)
    sku = serializers.CharField(source="product.sku", read_only=True)
    quantity = serializers.IntegerField(min_value=1)

    class Meta:
        model = SaleItem
        fields = ["id", "product", "product_name", "sku", "quantity", "unit_price", "subtotal"]
        read_only_fields = ["unit_price", "subtotal"]  # Rule 4 and 8


class SaleSerializer(serializers.ModelSerializer):
    items = SaleItemSerializer(many=True)

    class Meta:
        model = Sale
        fields = ["id", "sale_date", "status", "total_amount", "cancelled_at", "items"]
        read_only_fields = ["status", "total_amount", "cancelled_at"]  # Rule 4

    def validate_items(self, items):
        if not items:
            raise serializers.ValidationError("A sale needs at least one item.")
        ids = [i["product"].id for i in items]
        if len(ids) != len(set(ids)):
            raise serializers.ValidationError("The same product appears more than once.")
        return items

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop("items")

        # Rule 10: lock every product row first, in ascending id order
        ids = sorted(i["product"].id for i in items_data)
        locked = {
            p.id: p
            for p in Product.objects.select_for_update().filter(id__in=ids).order_by("id")
        }

        # Rule 3: validate against the locked, up-to-date rows
        errors = []
        for item in items_data:
            product = locked[item["product"].id]
            if not product.is_active:
                errors.append(f"Product {product.sku} is inactive and cannot be sold.")
            elif product.stock_quantity < item["quantity"]:
                errors.append(
                    f"Insufficient stock for {product.sku}: "
                    f"requested {item['quantity']}, available {product.stock_quantity}."
                )
        if errors:
            raise serializers.ValidationError({"items": errors})  # rolls back everything

        sale = Sale.objects.create(**validated_data)
        total = Decimal("0.00")
        for item in items_data:
            product = locked[item["product"].id]
            qty = item["quantity"]
            subtotal = product.selling_price * qty
            SaleItem.objects.create(
                sale=sale,
                product=product,
                quantity=qty,
                unit_price=product.selling_price,  # Rule 8: snapshot, server-side
                subtotal=subtotal,
            )
            Product.objects.filter(pk=product.pk).update(
                stock_quantity=F("stock_quantity") - qty  # Rule 5: decreases once, here only
            )
            total += subtotal

        sale.total_amount = total  # Rule 4
        sale.save(update_fields=["total_amount", "updated_at"])
        return sale

    
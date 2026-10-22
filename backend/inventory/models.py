from decimal import Decimal
from django.db import models
from django.db.models import Q


class Supplier(models.Model):
    company_name = models.CharField(max_length=150)
    contact_person = models.CharField(max_length=100, blank=True)
    email = models.EmailField(max_length=120, unique=True)
    phone = models.CharField(max_length=30)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.company_name


class Product(models.Model):
    sku = models.CharField(max_length=50, unique=True)  # Rule 1
    product_name = models.CharField(max_length=150)
    category = models.CharField(max_length=80)
    cost_price = models.DecimalField(max_digits=12, decimal_places=2)
    selling_price = models.DecimalField(max_digits=12, decimal_places=2)
    stock_quantity = models.PositiveIntegerField(default=0)  # Rule 2: never negative
    reorder_level = models.PositiveIntegerField(default=10)
    is_active = models.BooleanField(default=True)  # Rule 9: soft delete
    supplier = models.ForeignKey(
        Supplier, on_delete=models.PROTECT, related_name="products"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=Q(cost_price__gte=0), name="product_cost_price_gte_0"
            ),
            models.CheckConstraint(
                condition=Q(selling_price__gte=0), name="product_selling_price_gte_0"
            ),
        ]

    def __str__(self):
        return f"{self.sku} - {self.product_name}"


class PurchaseOrder(models.Model):
    class Status(models.TextChoices):
        DRAFT = "Draft", "Draft"
        ORDERED = "Ordered", "Ordered"
        RECEIVED = "Received", "Received"
        CANCELLED = "Cancelled", "Cancelled"

    supplier = models.ForeignKey(
        Supplier, on_delete=models.PROTECT, related_name="purchase_orders"
    )
    order_date = models.DateTimeField(auto_now_add=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.DRAFT
    )
    total_amount = models.DecimalField(
        max_digits=14, decimal_places=2, default=Decimal("0.00")
    )
    received_at = models.DateTimeField(null=True, blank=True)  # Rule 6 guard
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"PO #{self.pk} ({self.status})"


class PurchaseOrderItem(models.Model):
    purchase_order = models.ForeignKey(
        PurchaseOrder, on_delete=models.CASCADE, related_name="items"
    )
    product = models.ForeignKey(
        Product, on_delete=models.PROTECT, related_name="purchase_items"
    )
    quantity = models.PositiveIntegerField()
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2)  # Rule 8: snapshot

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=Q(quantity__gt=0), name="poitem_quantity_gt_0"
            ),
            models.CheckConstraint(
                condition=Q(unit_cost__gte=0), name="poitem_unit_cost_gte_0"
            ),
        ]

    @property
    def subtotal(self):
        return self.quantity * self.unit_cost


class Sale(models.Model):
    class Status(models.TextChoices):
        CONFIRMED = "Confirmed", "Confirmed"
        CANCELLED = "Cancelled", "Cancelled"

    sale_date = models.DateTimeField(auto_now_add=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.CONFIRMED
    )
    total_amount = models.DecimalField(
        max_digits=14, decimal_places=2, default=Decimal("0.00")
    )
    cancelled_at = models.DateTimeField(null=True, blank=True)  # Rule 7 guard
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Sale #{self.pk} ({self.status})"


class SaleItem(models.Model):
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(
        Product, on_delete=models.PROTECT, related_name="sale_items"
    )
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)  # Rule 8: snapshot
    subtotal = models.DecimalField(
        max_digits=14, decimal_places=2, default=Decimal("0.00")
    )  # set by backend, never by client

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=Q(quantity__gt=0), name="saleitem_quantity_gt_0"
            ),
            models.CheckConstraint(
                condition=Q(unit_price__gte=0), name="saleitem_unit_price_gte_0"
            ),
        ]
from django.db import transaction
from django.db.models import F, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Product, PurchaseOrder, Sale, Supplier
from .serializers import (
    ProductSerializer,
    PurchaseOrderSerializer,
    SaleSerializer,
    SupplierSerializer,
)


class SupplierViewSet(viewsets.ModelViewSet):
    serializer_class = SupplierSerializer

    def get_queryset(self):
        qs = Supplier.objects.all().order_by("company_name")
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(company_name__icontains=search)
                | Q(contact_person__icontains=search)
                | Q(email__icontains=search)
            )
        return qs

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
        qs = Product.objects.select_related("supplier").order_by(
            "product_name"
        )
        params = self.request.query_params

        search = params.get("search")
        if search:
            qs = qs.filter(
                Q(product_name__icontains=search)
                | Q(sku__icontains=search)
            )

        category = params.get("category")
        if category:
            qs = qs.filter(category__iexact=category)

        active = params.get("active")
        if active in ("true", "false"):
            qs = qs.filter(is_active=(active == "true"))

        if params.get("low_stock") == "true":
            qs = qs.filter(
                stock_quantity__lte=F("reorder_level")
            )

        supplier = params.get("supplier")
        if supplier:
            qs = qs.filter(supplier_id=supplier)

        return qs

    def destroy(self, request, *args, **kwargs):
        product = self.get_object()

        # Preserve products referenced by historical transactions.
        if (
            product.purchase_items.exists()
            or product.sale_items.exists()
        ):
            product.is_active = False
            product.save(
                update_fields=["is_active", "updated_at"]
            )

            return Response(
                {
                    "detail": (
                        "Product has transaction history, so it was "
                        "deactivated instead of deleted."
                    ),
                    "is_active": False,
                },
                status=status.HTTP_200_OK,
            )

        return super().destroy(request, *args, **kwargs)


class PurchaseViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = PurchaseOrderSerializer

    def get_queryset(self):
        qs = (
            PurchaseOrder.objects
            .select_related("supplier")
            .prefetch_related("items__product")
            .order_by("-order_date")
        )

        status_param = self.request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)

        return qs

    @action(detail=True, methods=["post"])
    def receive(self, request, pk=None):
        with transaction.atomic():
            order = get_object_or_404(
                PurchaseOrder.objects.select_for_update(),
                pk=pk,
            )

            if order.status == PurchaseOrder.Status.RECEIVED:
                return Response(
                    {
                        "detail": (
                            "This purchase order has already "
                            "been received."
                        )
                    },
                    status=status.HTTP_409_CONFLICT,
                )

            if order.status == PurchaseOrder.Status.CANCELLED:
                return Response(
                    {
                        "detail": (
                            "A cancelled purchase order cannot "
                            "be received."
                        )
                    },
                    status=status.HTTP_409_CONFLICT,
                )

            # Lock products in ascending primary-key order.
            items = list(
                order.items.order_by("product_id")
            )
            product_ids = sorted(
                {item.product_id for item in items}
            )

            list(
                Product.objects.select_for_update()
                .filter(id__in=product_ids)
                .order_by("id")
            )

            # Increase stock within the same transaction.
            for item in items:
                Product.objects.filter(
                    pk=item.product_id
                ).update(
                    stock_quantity=(
                        F("stock_quantity") + item.quantity
                    )
                )

            order.status = PurchaseOrder.Status.RECEIVED
            order.received_at = timezone.now()
            order.save(
                update_fields=[
                    "status",
                    "received_at",
                    "updated_at",
                ]
            )

        order.refresh_from_db()
        return Response(self.get_serializer(order).data)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        with transaction.atomic():
            order = get_object_or_404(
                PurchaseOrder.objects.select_for_update(),
                pk=pk,
            )

            if order.status not in (
                PurchaseOrder.Status.DRAFT,
                PurchaseOrder.Status.ORDERED,
            ):
                return Response(
                    {
                        "detail": (
                            f"A {order.status} purchase order "
                            "cannot be cancelled."
                        )
                    },
                    status=status.HTTP_409_CONFLICT,
                )

            order.status = PurchaseOrder.Status.CANCELLED
            order.save(
                update_fields=["status", "updated_at"]
            )

        order.refresh_from_db()
        return Response(self.get_serializer(order).data)


class SaleViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = SaleSerializer

    def get_queryset(self):
        qs = (
            Sale.objects
            .prefetch_related("items__product")
            .order_by("-sale_date")
        )

        status_param = self.request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)

        return qs

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        with transaction.atomic():
            sale = get_object_or_404(
                Sale.objects.select_for_update(),
                pk=pk,
            )

            if sale.status != Sale.Status.CONFIRMED:
                return Response(
                    {
                        "detail": (
                            f"A {sale.status} sale cannot "
                            "be cancelled."
                        )
                    },
                    status=status.HTTP_409_CONFLICT,
                )

            # Lock products in ascending primary-key order.
            items = list(
                sale.items.order_by("product_id")
            )
            product_ids = sorted(
                {item.product_id for item in items}
            )

            list(
                Product.objects.select_for_update()
                .filter(id__in=product_ids)
                .order_by("id")
            )

            # Restore stock exactly once.
            for item in items:
                Product.objects.filter(
                    pk=item.product_id
                ).update(
                    stock_quantity=(
                        F("stock_quantity") + item.quantity
                    )
                )

            sale.status = Sale.Status.CANCELLED
            sale.cancelled_at = timezone.now()
            sale.save(
                update_fields=[
                    "status",
                    "cancelled_at",
                    "updated_at",
                ]
            )

        sale.refresh_from_db()
        return Response(self.get_serializer(sale).data)
from datetime import timedelta
from decimal import Decimal

from django.db.models import Count, F, Sum
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Product, Sale, SaleItem, Supplier


class DashboardView(APIView):
    def get(self, request):
        # "Today" in local time. A range filter avoids __date, which needs
        # MySQL timezone tables that Windows installs usually don't have.
        now = timezone.localtime()
        day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)

        today_revenue = (
            Sale.objects.filter(
                status=Sale.Status.CONFIRMED,
                sale_date__gte=day_start,
                sale_date__lt=day_end,
            ).aggregate(total=Sum("total_amount"))["total"]
            or Decimal("0.00")
        )

        low_stock_count = Product.objects.filter(
            is_active=True, stock_quantity__lte=F("reorder_level")
        ).count()

        recent_sales = list(
            Sale.objects.annotate(item_count=Count("items"))
            .order_by("-sale_date")
            .values("id", "sale_date", "status", "total_amount", "item_count")[:5]
        )

        best_selling = [
            {
                "product_id": row["product_id"],
                "sku": row["product__sku"],
                "product_name": row["product__product_name"],
                "total_sold": row["total_sold"],
                "revenue": row["revenue"],
            }
            for row in SaleItem.objects.filter(sale__status=Sale.Status.CONFIRMED)
            .values("product_id", "product__sku", "product__product_name")
            .annotate(total_sold=Sum("quantity"), revenue=Sum("subtotal"))
            .order_by("-total_sold")[:5]
        ]

        return Response(
            {
                "total_active_products": Product.objects.filter(is_active=True).count(),
                "total_suppliers": Supplier.objects.count(),
                "today_revenue": today_revenue,
                "low_stock_count": low_stock_count,
                "recent_sales": recent_sales,
                "best_selling_products": best_selling,
            }
        )
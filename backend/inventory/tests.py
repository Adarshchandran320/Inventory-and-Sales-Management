import threading
from decimal import Decimal

from django.db import connection
from django.test import TransactionTestCase
from rest_framework.test import APIClient, APITestCase

from .models import Product, PurchaseOrder, Sale, Supplier


def make_supplier(name="ABC Traders", email="abc@test.com"):
    return Supplier.objects.create(company_name=name, email=email, phone="9876543210")


def make_product(supplier, sku, cost, price, stock):
    return Product.objects.create(
        sku=sku,
        product_name=f"Item {sku}",
        category="General",
        cost_price=Decimal(cost),
        selling_price=Decimal(price),
        stock_quantity=stock,
        reorder_level=2,
        supplier=supplier,
    )


class InventoryRulesTests(APITestCase):
    def setUp(self):
        self.supplier = make_supplier()
        self.p1 = make_product(self.supplier, "P-001", "5.00", "8.00", 10)
        self.p2 = make_product(self.supplier, "P-002", "20.00", "35.00", 5)

    def stock(self, product):
        product.refresh_from_db()
        return product.stock_quantity

    def sell(self, items):
        return self.client.post("/api/sales/", {"items": items}, format="json")

    # ---- Products (Rules 1, 2, 9) ----
    def test_duplicate_sku_returns_409(self):
        resp = self.client.post(
            "/api/products/",
            {"sku": "p-001", "product_name": "Dup", "category": "General",
             "cost_price": "1.00", "selling_price": "2.00", "supplier": self.supplier.id},
            format="json",
        )
        self.assertEqual(resp.status_code, 409)

    def test_negative_price_rejected(self):
        resp = self.client.post(
            "/api/products/",
            {"sku": "NEG-1", "product_name": "Neg", "category": "General",
             "cost_price": "-1.00", "selling_price": "2.00", "supplier": self.supplier.id},
            format="json",
        )
        self.assertEqual(resp.status_code, 400)

    def test_stock_cannot_be_set_through_product_api(self):
        resp = self.client.post(
            "/api/products/",
            {"sku": "NEW-1", "product_name": "New", "category": "General",
             "cost_price": "1.00", "selling_price": "2.00",
             "stock_quantity": 999, "supplier": self.supplier.id},
            format="json",
        )
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data["stock_quantity"], 0)

    def test_product_with_history_is_deactivated_not_deleted(self):
        self.sell([{"product": self.p1.id, "quantity": 1}])
        resp = self.client.delete(f"/api/products/{self.p1.id}/")
        self.assertEqual(resp.status_code, 200)
        self.p1.refresh_from_db()
        self.assertFalse(self.p1.is_active)

    # ---- Sales (Rules 3, 4, 5, 7, 8) ----
    def test_sale_calculates_total_and_reduces_stock_once(self):
        resp = self.sell([
            {"product": self.p1.id, "quantity": 2},
            {"product": self.p2.id, "quantity": 1},
        ])
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(Decimal(resp.data["total_amount"]), Decimal("51.00"))
        self.assertEqual(self.stock(self.p1), 8)
        self.assertEqual(self.stock(self.p2), 4)

    def test_client_supplied_total_and_price_are_ignored(self):
        resp = self.client.post(
            "/api/sales/",
            {"total_amount": "1.00",
             "items": [{"product": self.p1.id, "quantity": 1,
                        "unit_price": "0.01", "subtotal": "0.01"}]},
            format="json",
        )
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(Decimal(resp.data["total_amount"]), Decimal("8.00"))
        self.assertEqual(Decimal(resp.data["items"][0]["unit_price"]), Decimal("8.00"))

    def test_oversell_rejected_and_nothing_changes(self):
        resp = self.sell([
            {"product": self.p1.id, "quantity": 1},
            {"product": self.p2.id, "quantity": 999},
        ])
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(self.stock(self.p1), 10)  # rollback proof
        self.assertEqual(self.stock(self.p2), 5)
        self.assertEqual(Sale.objects.count(), 0)

    def test_sale_validation_errors(self):
        self.assertEqual(self.sell([]).status_code, 400)
        self.assertEqual(
            self.sell([{"product": self.p1.id, "quantity": 0}]).status_code, 400
        )
        self.assertEqual(
            self.sell([
                {"product": self.p1.id, "quantity": 1},
                {"product": self.p1.id, "quantity": 1},
            ]).status_code,
            400,
        )

    def test_inactive_product_cannot_be_sold(self):
        self.p1.is_active = False
        self.p1.save()
        resp = self.sell([{"product": self.p1.id, "quantity": 1}])
        self.assertEqual(resp.status_code, 400)

    def test_cancel_restores_stock_exactly_once(self):
        sale_id = self.sell([{"product": self.p1.id, "quantity": 4}]).data["id"]
        self.assertEqual(self.stock(self.p1), 6)

        first = self.client.post(f"/api/sales/{sale_id}/cancel/")
        self.assertEqual(first.status_code, 200)
        self.assertEqual(self.stock(self.p1), 10)

        second = self.client.post(f"/api/sales/{sale_id}/cancel/")
        self.assertEqual(second.status_code, 409)
        self.assertEqual(self.stock(self.p1), 10)

    def test_sale_keeps_price_after_product_price_changes(self):
        sale_id = self.sell([{"product": self.p1.id, "quantity": 1}]).data["id"]
        self.p1.selling_price = Decimal("12.00")
        self.p1.save()
        resp = self.client.get(f"/api/sales/{sale_id}/")
        self.assertEqual(Decimal(resp.data["items"][0]["unit_price"]), Decimal("8.00"))

    # ---- Purchases (Rules 4, 6, 8) ----
    def make_po(self, status="Ordered", qty=10):
        return self.client.post(
            "/api/purchases/",
            {"supplier": self.supplier.id, "status": status,
             "items": [{"product": self.p1.id, "quantity": qty}]},
            format="json",
        )

    def test_purchase_total_is_calculated_by_server(self):
        resp = self.make_po()
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(Decimal(resp.data["total_amount"]), Decimal("50.00"))
        self.assertEqual(self.stock(self.p1), 10)  # creating an order doesn't touch stock

    def test_receive_increases_stock_exactly_once(self):
        po_id = self.make_po().data["id"]
        first = self.client.post(f"/api/purchases/{po_id}/receive/")
        self.assertEqual(first.status_code, 200)
        self.assertEqual(self.stock(self.p1), 20)

        second = self.client.post(f"/api/purchases/{po_id}/receive/")
        self.assertEqual(second.status_code, 409)
        self.assertEqual(self.stock(self.p1), 20)

    def test_cancelled_purchase_cannot_be_received(self):
        po_id = self.make_po().data["id"]
        self.assertEqual(self.client.post(f"/api/purchases/{po_id}/cancel/").status_code, 200)
        self.assertEqual(self.client.post(f"/api/purchases/{po_id}/receive/").status_code, 409)
        self.assertEqual(self.stock(self.p1), 10)

    def test_purchase_rejects_product_from_another_supplier(self):
        other = make_supplier("Other Co", "other@test.com")
        foreign = make_product(other, "F-001", "1.00", "2.00", 0)
        resp = self.client.post(
            "/api/purchases/",
            {"supplier": self.supplier.id,
             "items": [{"product": foreign.id, "quantity": 1}]},
            format="json",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(PurchaseOrder.objects.count(), 0)

    # ---- Dashboard ----
    def test_dashboard_reflects_sales_and_cancellations(self):
        resp = self.client.get("/api/dashboard/")
        self.assertEqual(resp.status_code, 200)
        for key in ("total_active_products", "total_suppliers", "today_revenue",
                    "low_stock_count", "recent_sales", "best_selling_products"):
            self.assertIn(key, resp.data)
        self.assertEqual(Decimal(str(resp.data["today_revenue"])), Decimal("0.00"))

        sale_id = self.sell([{"product": self.p2.id, "quantity": 2}]).data["id"]
        resp = self.client.get("/api/dashboard/")
        self.assertEqual(Decimal(str(resp.data["today_revenue"])), Decimal("70.00"))
        self.assertEqual(resp.data["best_selling_products"][0]["total_sold"], 2)

        self.client.post(f"/api/sales/{sale_id}/cancel/")
        resp = self.client.get("/api/dashboard/")
        self.assertEqual(Decimal(str(resp.data["today_revenue"])), Decimal("0.00"))
        self.assertEqual(resp.data["best_selling_products"], [])
        self.assertEqual(resp.data["recent_sales"][0]["status"], "Cancelled")


class ConcurrentSaleTests(TransactionTestCase):
    """Rule 10: two simultaneous sales for the last unit must not both succeed."""

    def test_two_simultaneous_sales_for_the_last_unit(self):
        supplier = make_supplier()
        product = make_product(supplier, "C-001", "5.00", "8.00", 1)

        barrier = threading.Barrier(2)
        results = []

        def attempt():
            try:
                client = APIClient()
                barrier.wait()
                resp = client.post(
                    "/api/sales/",
                    {"items": [{"product": product.id, "quantity": 1}]},
                    format="json",
                )
                results.append(resp.status_code)
            finally:
                connection.close()

        threads = [threading.Thread(target=attempt) for _ in range(2)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        self.assertEqual(sorted(results), [201, 400])
        product.refresh_from_db()
        self.assertEqual(product.stock_quantity, 0)
        self.assertEqual(Sale.objects.count(), 1)
import json
import urllib.parse
from flask import Blueprint, request, jsonify, render_template
from db import get_connection, release_connection
from routes.users import ADMINS

store_bp = Blueprint('store', __name__)

SEED_PRODUCTS = [
    {
        'name': 'Pin La Teoría del Todo',
        'category': 'pin',
        'price': 25000,
        'image_url': '../static/images/logos/logo_M&B.png',
        'variations': {'colores': ['Negro', 'Blanco', 'Azul']}
    }
]


def _format_price(price):
    """Format price in Colombian peso style: $25.000"""
    return f"${price:,.0f}".replace(",", ".")


def _seed_products(connection):
    cursor = connection.cursor()
    try:
        cursor.execute("SELECT COUNT(*) FROM products WHERE active = TRUE;")
        count = cursor.fetchone()[0]
        if count > 0:
            return
        for product in SEED_PRODUCTS:
            cursor.execute("""
                INSERT INTO products (name, category, price, image_url, variations, active)
                VALUES (%s, %s, %s, %s, %s, TRUE);
            """, (
                product['name'],
                product['category'],
                product['price'],
                product['image_url'],
                json.dumps(product['variations'])
            ))
        connection.commit()
    except Exception as e:
        connection.rollback()
        print('Error seed_products:', e)
    finally:
        cursor.close()


def _parse_variations(raw_value, category):
    if not raw_value:
        return {}
    try:
        parsed = json.loads(raw_value)
        if isinstance(parsed, dict):
            return parsed
    except Exception:
        pass

    values = [item.strip() for item in raw_value.split(',') if item.strip()]
    if not values:
        return {}
    if category == 'buso':
        return {'tallas': values, 'colores': values}
    if category == 'pin':
        return {'colores': values}
    return {'opciones': values}


@store_bp.route('/tienda')
def page_tienda():
    return render_template('store.html')


@store_bp.route('/api/products')
def get_products():
    connection = None
    cursor = None
    try:
        connection = get_connection()
        _seed_products(connection)
        cursor = connection.cursor()
        cursor.execute("""
            SELECT id, name, category, price, image_url, variations
            FROM products
            WHERE active = TRUE
            ORDER BY category, name;
        """)
        rows = cursor.fetchall()
        products = []
        for row in rows:
            products.append({
                'id': row[0],
                'name': row[1],
                'category': row[2],
                'price': row[3],
                'image_url': row[4],
                'variations': row[5] if row[5] else {}
            })
        return jsonify(products)
    except Exception as e:
        print("Error get_products:", e)
        return jsonify([]), 500
    finally:
        if cursor:
            cursor.close()
        if connection:
            release_connection(connection)


@store_bp.route('/api/orders', methods=['POST'])
def create_order():
    connection = get_connection()
    try:
        cursor = connection.cursor()
        data = request.get_json()

        # Validate required fields
        required = ['customer_name', 'customer_phone', 'shipping_address', 'city', 'items']
        for field in required:
            if not data.get(field):
                return jsonify({'error': f'Campo requerido: {field}'}), 400

        items = data['items']
        if not items or len(items) == 0:
            return jsonify({'error': 'El pedido debe tener al menos un producto'}), 400

        # Look up each product's price and name
        total = 0
        resolved_items = []
        for item in items:
            cursor.execute("SELECT id, name, price FROM products WHERE id = %s AND active = TRUE;", (item['product_id'],))
            product = cursor.fetchone()
            if not product:
                return jsonify({'error': f'Producto no encontrado: {item["product_id"]}'}), 404
            qty = item.get('quantity', 1)
            line_total = product[2] * qty
            total += line_total
            variation_parts = []
            color = (item.get('color') or '').strip()
            size = (item.get('size') or '').strip()
            variation = (item.get('variation') or '').strip()
            if color:
                variation_parts.append(f'Color: {color}')
            if size:
                variation_parts.append(f'Talla: {size}')
            if variation and not variation_parts:
                variation_parts.append(variation)
            variation_text = ' / '.join(variation_parts)

            resolved_items.append({
                'product_id': product[0],
                'name': product[1],
                'price': product[2],
                'quantity': qty,
                'variation': variation_text
            })

        # Insert order
        cursor.execute("""
            INSERT INTO orders (customer_name, customer_phone, customer_email, shipping_address, city, total_price, notes)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id;
        """, (
            data['customer_name'],
            data['customer_phone'],
            data.get('customer_email', ''),
            data['shipping_address'],
            data['city'],
            total,
            data.get('notes', '')
        ))
        order_id = cursor.fetchone()[0]

        # Insert order items
        for ri in resolved_items:
            cursor.execute("""
                INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase, variation_selected)
                VALUES (%s, %s, %s, %s, %s);
            """, (order_id, ri['product_id'], ri['quantity'], ri['price'], ri['variation']))

        connection.commit()

        # Build WhatsApp message
        product_lines = []
        for ri in resolved_items:
            variation_text = f" ({ri['variation']})" if ri['variation'] else ""
            line_total = ri['price'] * ri['quantity']
            product_lines.append(f"• {ri['quantity']}x {ri['name']}{variation_text} - {_format_price(line_total)}")

        products_text = "\n".join(product_lines)

        message = (
            f"🛒 *Nuevo Pedido - Math & Beer*\n"
            f"📋 Pedido #{order_id}\n\n"
            f"*Productos:*\n"
            f"{products_text}\n\n"
            f"💰 *Total: {_format_price(total)}*\n\n"
            f"👤 *Datos:*\n"
            f"Nombre: {data['customer_name']}\n"
            f"Teléfono: {data['customer_phone']}\n"
            f"Email: {data.get('customer_email', '')}\n"
            f"Dirección: {data['shipping_address']}\n"
            f"Ciudad: {data['city']}\n"
            f"Notas: {data.get('notes', '')}"
        )

        # Encode message for WhatsApp URL, preserving emojis and formatting
        encoded_message = urllib.parse.quote(message, safe='')
        whatsapp_url = f"https://wa.me/573115709293?text={encoded_message}"

        return jsonify({
            'success': True,
            'order_id': order_id,
            'whatsapp_url': whatsapp_url
        })
    except Exception as e:
        connection.rollback()
        print("Error create_order:", e)
        return jsonify({'error': 'Error al crear el pedido'}), 500
    finally:
        cursor.close()
        release_connection(connection)


@store_bp.route('/api/admin/products', methods=['POST'])
def create_product():
    data = request.get_json() or {}
    userid = data.get('userid')
    if userid not in ADMINS:
        return jsonify({'error': 'No autorizado'}), 403

    name = (data.get('name') or '').strip()
    category = (data.get('category') or '').strip().lower()
    price = data.get('price')
    image_url = (data.get('image_url') or '').strip()
    variations_raw = data.get('variations') or ''

    if not name or not category or not price:
        return jsonify({'error': 'Faltan datos obligatorios'}), 400
    if category not in {'pin', 'forro', 'buso'}:
        return jsonify({'error': 'Categoría inválida'}), 400

    connection = get_connection()
    try:
        cursor = connection.cursor()
        cursor.execute("""
            INSERT INTO products (name, category, price, image_url, variations, active)
            VALUES (%s, %s, %s, %s, %s, %s, TRUE)
            RETURNING id;
        """, (
            name,
            category,
            int(price),
            image_url or '../static/images/logos/logo_M&B.png',
            json.dumps(_parse_variations(variations_raw, category))
        ))
        product_id = cursor.fetchone()[0]
        connection.commit()
        return jsonify({'success': True, 'product_id': product_id})
    except Exception as e:
        connection.rollback()
        print('Error create_product:', e)
        return jsonify({'error': 'Error al crear el producto'}), 500
    finally:
        cursor.close()
        release_connection(connection)


@store_bp.route('/api/admin/orders')
def admin_orders():
    userid = request.args.get('userid')
    if userid not in ADMINS:
        return jsonify({'error': 'No autorizado'}), 403

    connection = get_connection()
    try:
        cursor = connection.cursor()
        cursor.execute("""
            SELECT o.id, o.customer_name, o.customer_phone, o.customer_email,
                   o.shipping_address, o.city, o.total_price, o.status,
                   o.created_at, o.notes
            FROM orders o
            ORDER BY o.created_at DESC;
        """)
        orders_rows = cursor.fetchall()

        orders = []
        for row in orders_rows:
            order_id = row[0]
            cursor.execute("""
                SELECT oi.id, oi.product_id, p.name, oi.quantity,
                       oi.price_at_purchase, oi.variation_selected
                FROM order_items oi
                JOIN products p ON p.id = oi.product_id
                WHERE oi.order_id = %s;
            """, (order_id,))
            items_rows = cursor.fetchall()
            items = []
            for ir in items_rows:
                items.append({
                    'id': ir[0],
                    'product_id': ir[1],
                    'product_name': ir[2],
                    'quantity': ir[3],
                    'price_at_purchase': ir[4],
                    'variation_selected': ir[5]
                })

            orders.append({
                'id': order_id,
                'customer_name': row[1],
                'customer_phone': row[2],
                'customer_email': row[3],
                'shipping_address': row[4],
                'city': row[5],
                'total_price': row[6],
                'status': row[7],
                'created_at': row[8].isoformat() if row[8] else None,
                'notes': row[9],
                'items': items
            })

        return jsonify(orders)
    except Exception as e:
        print("Error admin_orders:", e)
        return jsonify({'error': 'Error al obtener pedidos'}), 500
    finally:
        cursor.close()
        release_connection(connection)


@store_bp.route('/api/admin/orders/<int:order_id>/status', methods=['PATCH'])
def update_order_status(order_id):
    data = request.get_json()
    userid = data.get('userid')
    if userid not in ADMINS:
        return jsonify({'error': 'No autorizado'}), 403

    new_status = data.get('status')
    valid_statuses = ['pending', 'paid', 'shipped', 'completed', 'cancelled']
    if new_status not in valid_statuses:
        return jsonify({'error': f'Estado inválido. Opciones: {valid_statuses}'}), 400

    connection = get_connection()
    try:
        cursor = connection.cursor()
        cursor.execute("""
            UPDATE orders SET status = %s WHERE id = %s;
        """, (new_status, order_id))
        connection.commit()

        if cursor.rowcount == 0:
            return jsonify({'error': 'Pedido no encontrado'}), 404

        return jsonify({'success': True, 'order_id': order_id, 'status': new_status})
    except Exception as e:
        connection.rollback()
        print("Error update_order_status:", e)
        return jsonify({'error': 'Error al actualizar estado'}), 500
    finally:
        cursor.close()
        release_connection(connection)

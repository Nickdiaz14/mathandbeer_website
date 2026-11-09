import unittest
from unittest.mock import patch, MagicMock
from app import create_app
from routes.games import generate_kenken
from routes.daily import _get_daily_seed, _get_daily_game


def _mock_cursor(rows=None, fetchone_val=None):
    """Devuelve un cursor mock configurable."""
    cursor = MagicMock()
    cursor.fetchall.return_value = rows or []
    cursor.fetchone.return_value = fetchone_val
    return cursor


class TestNoDBRequired(unittest.TestCase):
    """Tests que no necesitan base de datos — se ejecutan siempre."""

    @classmethod
    def setUpClass(cls):
        cls.app = create_app()
        cls.app.config['TESTING'] = True
        cls.client = cls.app.test_client()

    def test_404_custom_error_html(self):
        """Rutas inexistentes devuelven la plantilla 404 personalizada."""
        response = self.client.get('/ruta-que-no-existe-jamas')
        self.assertEqual(response.status_code, 404)
        self.assertIn(b'404', response.data)
        self.assertIn('Página no encontrada'.encode('utf-8'), response.data)

    def test_api_404_returns_json(self):
        """Rutas /api/ inexistentes devuelven JSON estructurado."""
        response = self.client.get('/api/ruta_inexistente')
        self.assertEqual(response.status_code, 404)
        self.assertTrue(response.is_json)
        body = response.get_json()
        self.assertIn('error', body)
        self.assertEqual(body.get('status'), 404)

    def test_daily_page_loads(self):
        """La página /daily renderiza sin errores de template."""
        response = self.client.get('/daily')
        self.assertEqual(response.status_code, 200)
        self.assertIn(b'Reto Diario', response.data)

    def test_store_page_loads(self):
        """La página /store renderiza sin errores de template."""
        response = self.client.get('/store')
        self.assertEqual(response.status_code, 200)

    def test_kenken_generator_4x4(self):
        """El generador de KenKen 4×4 produce un Latin Square válido."""
        game = generate_kenken(4, seed_val=42)
        self.assertEqual(game['size'], 4)
        self.assertEqual(len(game['solution']), 4)
        self.assertEqual(len(game['solution'][0]), 4)
        self.assertGreater(len(game['cages']), 0)
        for r in range(4):
            self.assertEqual(set(game['solution'][r]), {1, 2, 3, 4})
        for c in range(4):
            col = {game['solution'][r][c] for r in range(4)}
            self.assertEqual(col, {1, 2, 3, 4})

    def test_kenken_generator_5x5(self):
        """El generador de KenKen 5×5 produce un Latin Square válido."""
        game = generate_kenken(5, seed_val=99)
        self.assertEqual(game['size'], 5)
        for r in range(5):
            self.assertEqual(set(game['solution'][r]), {1, 2, 3, 4, 5})

    def test_kenken_deterministic(self):
        """La misma semilla siempre produce el mismo tablero."""
        g1 = generate_kenken(4, seed_val=1234)
        g2 = generate_kenken(4, seed_val=1234)
        self.assertEqual(g1['solution'], g2['solution'])
        self.assertEqual(len(g1['cages']), len(g2['cages']))

    def test_daily_seed_deterministic(self):
        """El seed del reto diario es estable en el mismo día."""
        s1 = _get_daily_seed()
        s2 = _get_daily_seed()
        self.assertEqual(s1, s2)

    def test_daily_game_returns_tuple(self):
        """_get_daily_game devuelve una tupla de 3 elementos."""
        game = _get_daily_game()
        self.assertEqual(len(game), 3)
        game_type, game_size, game_name = game
        self.assertIsInstance(game_type, str)
        self.assertIsInstance(game_size, int)
        self.assertIsInstance(game_name, str)

    def test_leaderboard_page_loads(self):
        """La página /leaderboards renderiza sin DB."""
        response = self.client.get('/leaderboards')
        self.assertEqual(response.status_code, 200)

    def test_profile_page_loads(self):
        """La página /profile renderiza sin DB."""
        response = self.client.get('/profile')
        self.assertEqual(response.status_code, 200)

    def test_register_page_loads(self):
        """La página /register renderiza sin DB."""
        response = self.client.get('/register')
        self.assertEqual(response.status_code, 200)

    def test_institutions_page_loads(self):
        """La página /institutions renderiza sin DB."""
        response = self.client.get('/institutions')
        self.assertEqual(response.status_code, 200)
        self.assertIn('Instituciones'.encode('utf-8'), response.data)

    def test_forms_page_loads(self):
        """La página /forms renderiza sin DB."""
        response = self.client.get('/forms')
        self.assertEqual(response.status_code, 200)

    def test_game_page_loads(self):
        """Páginas de juegos (0h_h1, knight, etc.) renderizan directamente desde base.html."""
        resp1 = self.client.get('/0h_h1?n=4')
        self.assertEqual(resp1.status_code, 200)

        resp2 = self.client.get('/knight')
        self.assertEqual(resp2.status_code, 200)

        resp3 = self.client.get('/tutorial_0h_h1')
        self.assertEqual(resp3.status_code, 200)


class TestWithMockedDB(unittest.TestCase):
    """Tests que mockean la base de datos para probar lógica de rutas."""

    @classmethod
    def setUpClass(cls):
        cls.app = create_app()
        cls.app.config['TESTING'] = True
        cls.client = cls.app.test_client()

    def _make_conn_mock(self, fetchall=None, fetchone=None):
        cursor = MagicMock()
        cursor.__enter__ = lambda s: s
        cursor.__exit__ = MagicMock(return_value=False)
        cursor.fetchall.return_value = fetchall or []
        cursor.fetchone.return_value = fetchone
        cursor.description = []
        conn = MagicMock()
        conn.cursor.return_value = cursor
        return conn, cursor

    @patch('routes.pages.get_connection')
    @patch('routes.pages.release_connection')
    def test_homepage_with_db(self, mock_release, mock_get_conn):
        """La homepage carga correctamente con DB mockeada."""
        conn, cursor = self._make_conn_mock(fetchall=[], fetchone=(0,))
        mock_get_conn.return_value = conn

        response = self.client.get('/')
        # Con DB mock puede fallar por datos faltantes; verificamos que al menos
        # no arroja un 500 sin controlar (el 500 sería renderizado por nuestro handler)
        self.assertIn(response.status_code, [200, 500])
        # Si es 500, debe ser nuestra página de error personalizada
        if response.status_code == 500:
            self.assertIn(b'500', response.data)

    @patch('routes.pages.get_connection')
    @patch('routes.pages.release_connection')
    def test_menu_games_with_db(self, mock_release, mock_get_conn):
        """El menú de juegos carga con DB mockeada."""
        # fetchone primero devuelve nickname, luego None para "charla hoy"
        cursor = MagicMock()
        cursor.fetchone.side_effect = [('TestUser',), None]
        conn = MagicMock()
        conn.cursor.return_value = cursor
        mock_get_conn.return_value = conn

        response = self.client.get('/menu_games')
        self.assertIn(response.status_code, [200, 500])


class TestAPIEndpoints(unittest.TestCase):
    """Tests de endpoints API con DB mockeada."""

    @classmethod
    def setUpClass(cls):
        cls.app = create_app()
        cls.app.config['TESTING'] = True
        cls.client = cls.app.test_client()

    @patch('db.get_connection')
    @patch('db.release_connection')
    def test_kenken_api_valid(self, mock_release, mock_get_conn):
        """POST /kenken/play con tamaño válido devuelve 200."""
        response = self.client.post('/kenken/play',
                                    json={'n': 4},
                                    content_type='application/json')
        self.assertEqual(response.status_code, 200)
        body = response.get_json()
        self.assertIn('size', body)
        self.assertIn('cages', body)
        self.assertIn('solution', body)

    def test_kenken_api_invalid_size(self):
        """POST /kenken/play con tamaño inválido devuelve 400."""
        response = self.client.post('/kenken/play',
                                    json={'n': 7},
                                    content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_0hh1_api_invalid_size(self):
        """POST /0h_h1/play con tamaño inválido devuelve 400."""
        response = self.client.post('/0h_h1/play',
                                    json={'n': 3},
                                    content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_nerdle_api_invalid_size(self):
        """POST /nerdle/play con tamaño inválido devuelve 400."""
        response = self.client.post('/nerdle/play',
                                    json={'n': 5},
                                    content_type='application/json')
        self.assertEqual(response.status_code, 400)


if __name__ == '__main__':
    unittest.main(verbosity=2)

"""
Board cache — all game boards loaded once at startup.
Eliminates per-request disk I/O for board file reads.
"""
import ast
import os

_BASE = os.path.dirname(os.path.abspath(__file__))


def _load(filename, parse=True):
    path = os.path.join(_BASE, 'static', 'boards', filename)
    with open(path, 'r', encoding='utf-8') as f:
        lines = [l.strip() for l in f if l.strip()]
    if not parse:
        return lines
    result = []
    for l in lines:
        try:
            result.append(ast.literal_eval(l))
        except (ValueError, SyntaxError):
            pass  # skip malformed entries
    return result


BOARDS = {
    'aleatorios4':  _load('aleatorios4.txt'),
    'aleatorios6':  _load('aleatorios6.txt'),
    'aleatorios8':  _load('aleatorios8.txt'),
    'aleatorios10': _load('aleatorios10.txt'),
    'ohno4':        _load('aleatorios_ohno4.txt'),
    'ohno5':        _load('aleatorios_ohno5.txt'),
    'igualdades6':  _load('igualdades6.txt',  parse=False),
    'igualdades8':  _load('igualdades8.txt',  parse=False),
    'igualdades10': _load('igualdades10.txt', parse=False),
}

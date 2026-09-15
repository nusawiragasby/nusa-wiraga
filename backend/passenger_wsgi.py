import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

_wsgi_app = None


def application(environ, start_response):
    # Built lazily so the ASGI event-loop thread is created after LiteSpeed forks
    # the worker; a thread started before the fork does not survive it.
    global _wsgi_app
    if _wsgi_app is None:
        from a2wsgi import ASGIMiddleware

        from server import app as asgi_app

        _wsgi_app = ASGIMiddleware(asgi_app)
    return _wsgi_app(environ, start_response)

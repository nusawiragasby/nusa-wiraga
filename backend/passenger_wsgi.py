import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

_asgi_app = None
_init_lock = None


async def _lazy_asgi(scope, receive, send):
    # server is imported from inside the adapter's event loop so the Motor client
    # binds to that loop; importing it at module level binds it to a dead loop.
    global _asgi_app, _init_lock
    if _asgi_app is None:
        if _init_lock is None:
            _init_lock = asyncio.Lock()
        async with _init_lock:
            if _asgi_app is None:
                import server

                try:
                    await server.startup()
                except Exception:
                    pass
                _asgi_app = server.app
    await _asgi_app(scope, receive, send)


_wsgi_app = None


def application(environ, start_response):
    # Built on first request so the adapter's loop thread is created after
    # LiteSpeed forks the worker; a thread started before the fork is dead.
    global _wsgi_app
    if _wsgi_app is None:
        from a2wsgi import ASGIMiddleware

        _wsgi_app = ASGIMiddleware(_lazy_asgi)
    return _wsgi_app(environ, start_response)

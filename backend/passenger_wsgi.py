import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from server import app as asgi_app
from a2wsgi import ASGIMiddleware

application = ASGIMiddleware(asgi_app)

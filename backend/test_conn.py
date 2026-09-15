import os
import socket
import sys

print("PYTHON:", sys.version)

# 1. DNS SRV resolution test
try:
    import dns.resolver
    answers = dns.resolver.resolve("_mongodb._tcp.cluster0.zd1jt0x.mongodb.net", "SRV")
    hosts = [(str(r.target).rstrip("."), r.port) for r in answers]
    print("SRV OK:", hosts)
except Exception as e:
    print("SRV FAIL:", type(e).__name__, e)
    hosts = []

# 2. Raw TCP test to each resolved host
for host, port in hosts:
    try:
        s = socket.create_connection((host, port), timeout=10)
        s.close()
        print(f"TCP OK: {host}:{port}")
    except Exception as e:
        print(f"TCP FAIL: {host}:{port} -> {type(e).__name__}: {e}")

# 3. Generic outbound HTTPS test
try:
    s = socket.create_connection(("www.google.com", 443), timeout=10)
    s.close()
    print("HTTPS OUTBOUND OK")
except Exception as e:
    print("HTTPS OUTBOUND FAIL:", type(e).__name__, e)

# 4. Actual pymongo ping
try:
    from pymongo import MongoClient
    c = MongoClient(os.environ.get("MONGO_URL", ""), serverSelectionTimeoutMS=8000)
    print("PING:", c.admin.command("ping"))
except Exception as e:
    print("PYMONGO FAIL:", type(e).__name__, str(e)[:300])

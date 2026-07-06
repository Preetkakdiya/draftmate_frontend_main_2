import httpx

BASE_URL = "http://localhost:8010"

print("=== Testing e-Courts Endpoints ===")

print("\n1. Testing /health")
response = httpx.get(f"{BASE_URL}/api/v1/library/ecourts/health")
print(f"Status: {response.status_code}")
print(f"Response: {response.json()}")

print("\n2. Testing /search?cnr=1234567890")
response = httpx.get(f"{BASE_URL}/api/v1/library/ecourts/search?cnr=1234567890")
print(f"Status: {response.status_code}")
print(f"Response: {response.json()}")

print("\n3. Testing /status?cnr=1234567890")
response = httpx.get(f"{BASE_URL}/api/v1/library/ecourts/status?cnr=1234567890")
print(f"Status: {response.status_code}")
print(f"Response: {response.json()}")

print("\n4. Testing /orders?cnr=1234567890")
response = httpx.get(f"{BASE_URL}/api/v1/library/ecourts/orders?cnr=1234567890")
print(f"Status: {response.status_code}")
print(f"Response: {response.json()}")

print("\n5. Testing /judgments?cnr=1234567890")
response = httpx.get(f"{BASE_URL}/api/v1/library/ecourts/judgments?cnr=1234567890")
print(f"Status: {response.status_code}")
print(f"Response: {response.json()}")

print("\n6. Testing /causelist?court=High Court of Delhi&date=15-07-2024")
response = httpx.get(f"{BASE_URL}/api/v1/library/ecourts/causelist?court=High Court of Delhi&date=15-07-2024")
print(f"Status: {response.status_code}")
print(f"Response: {response.json()}")

print("\n7. Testing /integrations/status")
response = httpx.get(f"{BASE_URL}/api/v1/library/integrations/status")
print(f"Status: {response.status_code}")
print(f"Response: {response.json()}")

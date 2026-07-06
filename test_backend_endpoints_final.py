
import requests

BASE_URL = "http://localhost:8010"

print("=== Testing Bare Acts Endpoints ===")
print("\n1. Testing /health")
response = requests.get(f"{BASE_URL}/health")
print(f"Status: {response.status_code}")
print(f"Response: {response.json()}\n")

print("2. Testing /api/v1/library/bareacts")
response = requests.get(f"{BASE_URL}/api/v1/library/bareacts")
print(f"Status: {response.status_code}")
print(f"Response: {response.json()}\n")

print("3. Testing /api/v1/library/bareacts/categories")
response = requests.get(f"{BASE_URL}/api/v1/library/bareacts/categories")
print(f"Status: {response.status_code}")
print(f"Response: {response.json()}\n")

queries = ["IPC", "Evidence", "RTI", "Contract", "Family", "GST", "Dowry", "Section 420", "Article 21"]

for query in queries:
    print(f"4. Testing /api/v1/library/bareacts/search?query={query}")
    response = requests.get(f"{BASE_URL}/api/v1/library/bareacts/search", params={"query": query})
    print(f"Status: {response.status_code}")
    try:
        json_data = response.json()
        if json_data.get("success") and json_data.get("data"):
            print(f"Results count: {len(json_data['data'])}")
            print(f"First result: {json_data['data'][0].get('name', '')}")
        else:
            print("Response:", json_data)
    except Exception as e:
        print(f"Error parsing response: {e}")
    print()

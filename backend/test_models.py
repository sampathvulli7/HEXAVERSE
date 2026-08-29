import httpx
import json

api_key = "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"
base_url = "https://integrate.api.nvidia.com/v1"

try:
    print("Fetching models...")
    response = httpx.get(f"{base_url}/models", headers={"Authorization": f"Bearer {api_key}"})
    print(response.status_code)
    models = response.json().get("data", [])
    for m in models:
        if "llama" in m.get("id", "").lower():
            print(m.get("id"))
except Exception as e:
    print("Error:", e)

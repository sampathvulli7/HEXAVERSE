import httpx
import json

api_key = "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"
base_url = "https://integrate.api.nvidia.com/v1"

models = [
    "deepseek-ai/deepseek-v4-flash-0731",
    "01-ai/yi-large",
    "databricks/dbrx-instruct"
]

for model in models:
    print(f"Testing {model}...")
    try:
        response = httpx.post(
            f"{base_url}/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "model": model,
                "messages": [{"role": "user", "content": "Hello"}],
                "temperature": 0.2
            },
            timeout=5.0
        )
        print(response.status_code)
        if response.status_code == 200:
            print(response.json()["choices"][0]["message"]["content"])
            break
        else:
            print(response.text)
    except Exception as e:
        print("Error:", e)

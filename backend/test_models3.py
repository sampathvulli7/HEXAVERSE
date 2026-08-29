import httpx

api_key = "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"
base_url = "https://integrate.api.nvidia.com/v1"

models = [
    "meta/llama-3.2-11b-vision-instruct",
    "meta/llama-3.2-90b-vision-instruct"
]

for model in models:
    print(f"Testing {model}...")
    try:
        response = httpx.post(
            f"{base_url}/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "model": model,
                "messages": [{"role": "user", "content": "Say 'hello world'"}],
                "temperature": 0.2,
                "max_tokens": 10
            },
            timeout=40.0
        )
        print(response.status_code)
        if response.status_code == 200:
            print("SUCCESS:", response.json()["choices"][0]["message"]["content"])
        else:
            print("FAIL:", response.text)
    except Exception as e:
        print("Error:", e)

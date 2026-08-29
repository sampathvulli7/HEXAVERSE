import os
from openai import OpenAI

api_key = "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"
base_url = "https://integrate.api.nvidia.com/v1"

client = OpenAI(base_url=base_url, api_key=api_key)
try:
    print("Sending request to NVIDIA...")
    response = client.chat.completions.create(
        model="meta/llama-3.2-90b-vision-instruct",
        messages=[{"role": "user", "content": "Hello"}],
        temperature=0.2,
    )
    print("Success:", response.choices[0].message.content)
except Exception as e:
    print("Error:", e)

from flask import Flask, request, jsonify
import requests
from flask_cors import CORS
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
CORS(app)

# Use environment variables
API_KEY = os.getenv("GROQ_API_KEY")
GROQ_API_URL = os.getenv("GROQ_API_URL")

@app.route('/api/data', methods=['POST'])
def get_data():
    data = request.get_json()
    user_question = data.get('userQuestion')
    document_content = data.get('documentContent')

    if not user_question:
        return jsonify({"error": "No user question provided"}), 400

    messages = []

    if document_content:
        messages.append({
            'role': 'system',
            'content': """You are a helpful assistant that answers questions based on the provided document. 
Always format your answers using **Markdown** with the following structure:
1. **Introduction** – a short summary of what the document is about.
2. **Key Points / Themes** – use numbered or bulleted lists for clarity.
3. **Additional Highlights** – extra insights, facts, or relevant details.
4. **Conclusion** – wrap up with the overall significance.

Keep the tone clear, professional, and structured."""
        })
        messages.append({
            'role': 'user',
            'content': f"Document:\n{document_content}\n\nQuestion:\n{user_question}"
        })
    else:
        messages.append({
            'role': 'system',
            'content': """You are a helpful assistant. 
Always answer in Markdown using the following structure:
1. **Introduction**
2. **Key Points / Themes**
3. **Conclusion**"""
        })
        messages.append({'role': 'user', 'content': user_question})

    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {API_KEY}'
    }

    payload = {
        "messages": messages,
        "model": "llama-3.1-8b-instant"
    }

    try:
        response = requests.post(GROQ_API_URL, headers=headers, json=payload)
        response.raise_for_status()
        api_response = response.json()
        answer = api_response['choices'][0]['message']['content']
        return jsonify({"answer": answer})
    except requests.exceptions.RequestException as e:
        return jsonify({"error": str(e)}), 500
import requests
from bs4 import BeautifulSoup   # <-- install with: pip install beautifulsoup4

@app.route('/api/summarize_url', methods=['POST'])
def summarize_url():
    data = request.get_json()
    url = data.get('url')

    if not url:
        return jsonify({"error": "No URL provided"}), 400

    try:
        # Fetch page content
        page = requests.get(url, timeout=10)
        soup = BeautifulSoup(page.text, "html.parser")

        # Extract visible text
        for script in soup(["script", "style"]):
            script.extract()
        text = ' '.join(soup.get_text().split())

        # Limit to avoid token overload
        text = text[:4000]

        messages = [
            {
                "role": "system",
                "content": """You are a helpful assistant. Summarize the following webpage clearly using Markdown.
Structure:
1. **Introduction**
2. **Key Points / Themes** (bullets or numbers)
3. **Conclusion**"""
            },
            {"role": "user", "content": f"Summarize this webpage:\n{text}"}
        ]

        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {API_KEY}'
        }

        payload = {
            "messages": messages,
            "model": "llama-3.1-8b-instant"
        }

        response = requests.post(GROQ_API_URL, headers=headers, json=payload)
        response.raise_for_status()
        api_response = response.json()
        summary = api_response['choices'][0]['message']['content']

        return jsonify({"summary": summary})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True)

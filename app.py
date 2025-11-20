from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from google import genai
from dotenv import load_dotenv
import os

load_dotenv()

app = Flask(__name__)
CORS(app)

API_KEY = os.getenv("API_KEY")

if not API_KEY:
    raise Exception("❌ ERROR: API_KEY not found in .env file!")

# Correct Gemini client for google-genai
client = genai.Client(api_key=API_KEY)

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/ask-ai", methods=["POST"])
def ask_ai():
    try:
        data = request.json
        user_query = data.get("query", "")
        excel_data = data.get("excelData", [])

        if len(excel_data) > 150:
            excel_data = excel_data[:150]

        prompt = f"""
        You are an Excel Analysis AI.

        Excel Data (first 150 rows):
        {excel_data}

        User Question:
        {user_query}

        Give short, list-style insights only.
        """

        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt
        )

        return jsonify({"answer": response.text})

    except Exception as e:
        return jsonify({"answer": f"❌ Backend Error: {str(e)}"})


if __name__ == "__main__":
    app.run(debug=True, port=1000)

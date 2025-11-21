from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from google import genai
from dotenv import load_dotenv
import os

load_dotenv()

app = Flask(__name__, static_folder="static", template_folder="templates")

# Enable full CORS
CORS(app)

API_KEY = os.getenv("API_KEY")

if not API_KEY:
    raise Exception("❌ ERROR: API_KEY not found in .env file!")

# Gemini client
client = genai.Client(api_key=API_KEY)

# FRONTEND ROUTE
@app.route("/")
def home():
    return render_template("index.html")

# BACKEND ROUTE
@app.route("/analyze", methods=["POST"])
def analyze():
    try:
        data = request.get_json(force=True, silent=True)
        if not data:
            return jsonify({"answer": "❌ Backend Error: invalid JSON"}), 400

        user_query = data.get("query", "")
        excel_data = data.get("excelData", [])

        # Limit to header + first 150 rows
        if len(excel_data) > 151:
            excel_data = excel_data[:151]

        prompt = (
            "You are an Excel Analysis AI.\n\n"
            "Return short actionable insights in bullet or numbered list format.\n"
            "Keep output concise and easy to read.\n\n"
            "Excel Data (header + up to 150 rows):\n"
            f"{excel_data}\n\n"
            "User Question:\n"
            f"{user_query}\n\n"
            "Give final answer as a bullet list.\n"
        )

        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt
        )

        answer_text = ""
        try:
            answer_text = getattr(response, "text", None) or getattr(response, "content", None) or str(response)
        except:
            answer_text = str(response)

        return jsonify({"answer": answer_text})

    except Exception as e:
        return jsonify({"answer": f"❌ Backend Error: {str(e)}"})

if __name__ == "__main__":
    app.run(debug=True)

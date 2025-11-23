from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from google import genai
from dotenv import load_dotenv
import os
import pandas as pd
import numpy as np

load_dotenv()

app = Flask(__name__, static_folder="static", template_folder="templates")
CORS(app)

API_KEY = os.getenv("API_KEY")
if not API_KEY:
    raise Exception("❌ ERROR: API_KEY not found in .env file!")

# Correct Gemini client initialization
client = genai.Client(api_key=API_KEY)

# ===================================================
# CLEAN DATATYPES (Numeric, Datetime, Boolean)
# ===================================================
def clean_and_convert(df):
    for col in df.columns:
        s = df[col]

        # BOOLEAN FIX
        if s.dtype == object:
            lowered = s.astype(str).str.lower()
            if lowered.isin(["true", "false", "yes", "no", "y", "n"]).any():
                df[col] = lowered.map({
                    "true": True, "false": False,
                    "yes": True, "no": False,
                    "y": True, "n": False
                }).astype("boolean")
                continue

        # NUMERIC FIX
        if s.dtype == object:
            df[col] = pd.to_numeric(s, errors="ignore")

        # DATETIME FIX
        if s.dtype == object:
            df[col] = pd.to_datetime(s, errors="ignore")

    return df


# ===================================================
# ROUTES
# ===================================================
@app.route("/")
def home():
    return render_template("index.html")


@app.route("/analyze", methods=["POST"])
def analyze():
    try:
        data = request.get_json(force=True, silent=True)
        if not data:
            return jsonify({"answer": "❌ Backend Error: invalid JSON"}), 400

        user_query = data.get("query", "")
        excel_data = data.get("excelData", [])

        if len(excel_data) < 2:
            return jsonify({"answer": "❌ No valid Excel data received."}), 400

        header = excel_data[0]
        rows = excel_data[1:]

        df = pd.DataFrame(rows, columns=header)

        # Clean datatypes
        df = clean_and_convert(df)

        # Reduce sample for AI
        sample = excel_data[:151]

        # -------- USER QUERY ANSWER --------
        prompt = (
            "You are an Excel Data Analyzer.\n"
            "Return insights in clean, short bullet points only.\n\n"
            f"Sample Data:\n{sample}\n\n"
            f"User Question:\n{user_query}\n"
        )

        # ⭐ Correct Google GenAI call
        resp = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt
        )

        answer_text = resp.text if hasattr(resp, "text") else str(resp)

        return jsonify({
            "answer": answer_text
        })

    except Exception as e:
        return jsonify({"answer": f"❌ Backend Error: {str(e)}"})


if __name__ == "__main__":
    app.run(debug=True)

import os
import datetime
import logging
import fitz  # PyMuPDF
from groq import Groq
import json
from flask import Flask, request, jsonify, send_from_directory, send_file
from werkzeug.utils import secure_filename
from flask_cors import CORS
import tempfile

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configure file uploads - using temporary directories instead of persistent storage
ALLOWED_EXTENSIONS = {'pdf'}
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload size

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

client = Groq(api_key='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')

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def read_pdf_content(file_path):
    try:
        doc = fitz.open(file_path)
        text = ""
        for page in doc:
            text += page.get_text()
        return text
    except Exception as e:
        logging.error(f"Error reading PDF file {file_path}: {e}")
        return None

def analyze_medical_report(file_path):
    report_content = read_pdf_content(file_path)
    if not report_content:
        logging.error(f"Failed to read medical report: {file_path}")
        return None

    logging.info(f"Analyzing medical report (in-memory)")

    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "user",
                    "content": (
                        "Act as an expert medical analysis chatbot. Analyze the following patient medical report thoroughly and provide a structured response with these sections:Key Diagnoses & Disease DetectionClearly state if the patient has the disease (e.g., malaria, diabetes) based on test results. Use phrases like 'The patient is diagnosed with [Disease]' or 'No evidence of [Disease] found'.For numerical parameters (e.g., RBC count, blood sugar):Compare values to WHO-standard ranges and flag High/Low/Normal.Example: 'Hemoglobin: 10 g/dL (Low vs WHO range 12-16 g/dL)'.Patient SummaryConcise overview of medical history, allergies, chronic conditions, and recent symptoms.Treatment RecommendationsBasic Care: Suggest home remedies, fruits, or OTC medicines (non-prescription) for mild issues (e.g., ginger tea for nausea, hydration for fever).Medications Prescribed: List drugs/dosages from the report (if any).Specialist Referral & Next StepsIf critical or unresolved issues: Recommend a specific doctor specialty (e.g., 'Consult a [Cardiologist/Neurologist/Oncologist]').Mandatory Line: 'Visit the Specialist Locator feature section to find the best specialist near your location.'Anomalies & Urgent ConcernsHighlight abnormal results, conflicting data, or urgent risks (e.g., 'Severely elevated CRP levels suggest acute inflammation').Tone: Use simple, empathetic language. Prioritize clarity for non-medical users.Avoid assumptions: Cross-check data with patient history before final conclusions."
                        f"Medical Report:\n{report_content}"
                    )
                }
            ],
            temperature=0.7,
            max_tokens=32768,
            top_p=1,
            stream=False,  # Changed to False for API usage
            stop=None,
        )

        full_response = completion.choices[0].message.content
        
        timestamp = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
        
        # Create structured JSON
        sections = full_response.split("**")
        analysis_data = {}
        
        # Process the sections
        current_section = ""
        for section in sections:
            if not section.strip():
                continue
                
            parts = section.split("**", 1)
            if len(parts) == 1:  # This is content
                section_title = current_section.strip()
                if section_title:
                    analysis_data[section_title] = section.strip()
            else:  # This is a section header
                current_section = section.strip()
        
        # Create the analysis JSON without saving to disk
        analysis_json = {
            "timestamp": timestamp,
            "sections": analysis_data,
            "raw_analysis": full_response
        }
        
        logging.info(f"Analysis completed with timestamp {timestamp}")
        return {"analysis_id": f"analysis_{timestamp}.json", "data": analysis_json}

    except Exception as e:
        logging.error(f"Error analyzing medical report: {e}")
        return None

# Route to serve the index.html file
@app.route('/', methods=['GET'])
def serve_index():
    return send_file(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'index.html'))

# Route to serve static files
@app.route('/<path:filename>', methods=['GET'])
def serve_static(filename):
    return send_from_directory(os.path.dirname(os.path.abspath(__file__)), filename)

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"}), 200

@app.route('/analyze', methods=['POST'])
def analyze_report():
    # Check if the post request has the file part
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['file']
    
    # If user does not select file, browser also submits an empty part without filename
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    
    if file and allowed_file(file.filename):
        # Create a temporary file to process
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
            file.save(temp_file.name)
            temp_path = temp_file.name
        
        try:
            # Process the file
            analysis_result = analyze_medical_report(temp_path)
            
            # Clean up the temporary file
            if os.path.exists(temp_path):
                os.unlink(temp_path)
            
            if analysis_result:
                return jsonify({
                    "success": True,
                    "message": "Analysis completed successfully",
                    "analysis_id": analysis_result["analysis_id"],
                    "analysis": analysis_result["data"]
                }), 200
            else:
                return jsonify({
                    "success": False,
                    "message": "Analysis failed",
                }), 500
        finally:
            # Ensure the temporary file is deleted even if there's an error
            if os.path.exists(temp_path):
                os.unlink(temp_path)
    
    return jsonify({"error": "File type not allowed"}), 400

@app.route('/results/<analysis_id>', methods=['GET'])
def get_analysis(analysis_id):
    # Since we're not saving analysis results to disk, this endpoint can't retrieve past results
    return jsonify({
        "error": "Analysis results are not saved to disk. Please resubmit the file for analysis."
    }), 404

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)

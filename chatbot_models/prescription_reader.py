import os
import base64
import requests
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
import tempfile

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configuration
ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png'}
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload size
GEMINI_API_KEY = "AIzaSyDbde3rdFBnIbME6KX7-m5NtQtAKyybgTs"
GEMINI_API_ENDPOINT = f"https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"

# Helper functions
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def image_to_base64(image_path):
    with open(image_path, "rb") as image_file:
        encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
        mime = "image/png" if image_path.endswith(".png") else "image/jpeg"
        return {
            "inlineData": {
                "mimeType": mime,
                "data": encoded_string
            }
        }

def call_gemini_with_image(image_path):
    prompt = (
        "You are a medical expert. Analyze this prescription image and return:\n"
        "- Medicine names\n- Dosages\n- Instructions\n- Frequency\n"
        "Format the output as a clean list. If any field is unclear, mention 'Not specified'." \
        "Explain all the abbreviations in the prescription (like OD, BD) and if something is not specified " \
        "and if you don't know the meaning then advice to consult a doctor"
    )

    payload = {
        "contents": [{
            "parts": [
                {"text": prompt},
                image_to_base64(image_path)
            ]
        }]
    }

    headers = {"Content-Type": "application/json"}

    response = requests.post(GEMINI_API_ENDPOINT, headers=headers, json=payload)
    if response.ok:
        return response.json()['candidates'][0]['content']['parts'][0]['text']
    else:
        raise Exception(f"Gemini API Error: {response.text}")

@app.route('/', methods=['GET'])
def index():
    logger.info("Root endpoint called")
    return jsonify({
        "message": "Prescription Reader API is running!",
        "endpoints": {
            "/health": "Check API health",
            "/analyze-prescription": "POST endpoint to analyze prescription images"
        }
    })

@app.route('/health', methods=['GET'])
def health_check():
    logger.info("Health check endpoint called")
    return jsonify({"status": "healthy"}), 200

@app.route('/test-upload', methods=['POST'])
def test_upload():
    logger.info("Test upload endpoint called")
    
    # Log all request details
    logger.debug(f"Request method: {request.method}")
    logger.debug(f"Request headers: {dict(request.headers)}")
    logger.debug(f"Request form data: {request.form}")
    logger.debug(f"Request files: {request.files}")
    
    # Check if the post request has the file part
    if 'file' not in request.files:
        logger.error("No file part in request")
        return jsonify({"error": "No file part", "success": False}), 400
    
    file = request.files['file']
    
    # If user does not select file, browser also submits an empty part without filename
    if file.filename == '':
        logger.error("No selected file")
        return jsonify({"error": "No selected file", "success": False}), 400
    
    return jsonify({
        "success": True,
        "message": "File upload test successful",
        "file_info": {
            "filename": file.filename,
            "content_type": file.content_type,
            "content_length": request.content_length
        }
    })

@app.route('/analyze-prescription', methods=['POST'])
def analyze_prescription():
    logger.info("Analyze prescription endpoint called")
    
    # Log all request details
    logger.debug(f"Request method: {request.method}")
    logger.debug(f"Request headers: {dict(request.headers)}")
    logger.debug(f"Request form data: {request.form}")
    logger.debug(f"Request files: {request.files}")
    
    # Check if the post request has the file part
    if 'file' not in request.files:
        logger.error("No file part in request")
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['file']
    
    # If user does not select file, browser also submits an empty part without filename
    if file.filename == '':
        logger.error("No selected file")
        return jsonify({"error": "No selected file"}), 400
    
    logger.info(f"Processing file: {file.filename}")
    
    if file and allowed_file(file.filename):
        logger.info(f"File type allowed: {file.filename}")
        # Create a temporary file to process
        with tempfile.NamedTemporaryFile(delete=False, suffix='.' + file.filename.rsplit('.', 1)[1].lower()) as temp_file:
            file.save(temp_file.name)
            temp_path = temp_file.name
            logger.info(f"File saved to temp path: {temp_path}")
        
        try:
            # Process the file
            logger.info("Calling Gemini API to analyze the image")
            analysis_result = call_gemini_with_image(temp_path)
            
            # Clean up the temporary file
            if os.path.exists(temp_path):
                os.unlink(temp_path)
                logger.info("Temporary file deleted")
            
            if analysis_result:
                logger.info("Analysis successful, returning results")
                return jsonify({
                    "success": True,
                    "message": "Prescription analyzed successfully",
                    "analysis": {
                        "raw_analysis": analysis_result,
                        "sections": {
                            "Prescription Analysis": analysis_result
                        }
                    }
                }), 200
            else:
                logger.error("Analysis result is empty")
                return jsonify({
                    "success": False,
                    "message": "Analysis failed",
                }), 500
        except Exception as e:
            logger.exception(f"Error during analysis: {str(e)}")
            return jsonify({
                "success": False,
                "message": f"Analysis error: {str(e)}",
            }), 500
        finally:
            # Ensure the temporary file is deleted even if there's an error
            if os.path.exists(temp_path):
                os.unlink(temp_path)
                logger.info("Temporary file deleted in finally block")
    else:
        logger.error(f"File type not allowed: {file.filename}")
        return jsonify({"error": "File type not allowed"}), 400

if __name__ == '__main__':
    logger.info("Starting Prescription Reader API server on port 5003")
    app.run(debug=True, host='0.0.0.0', port=5003) 
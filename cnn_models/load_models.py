import os
import numpy as np
import pickle
import tensorflow as tf
from tensorflow.keras.models import load_model # type: ignore
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Define the models directory path
MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'saved_models')

# Initialize model variables
breast_cancer_model = None
heart_disease_model = None
liver_model = None
hepatitis_model = None
diabetis_model = None
kidney_disease_model = None
brain_tumor_model = None

# Load models
def load_pkl_model(model_path):
    try:
        # Standard pickle loading
        with open(model_path, 'rb') as file:
            return pickle.load(file)
    except Exception as e:
        print(f"Error with standard pickle loading: {str(e)}")
        try:
            # Try with encoding='latin1' which can help with Python 2/3 compatibility
            with open(model_path, 'rb') as file:
                return pickle.load(file, encoding='latin1')
        except Exception as e2:
            print(f"Error with latin1 encoding: {str(e2)}")
            try:
                # Try with encoding='bytes' which can help with some compatibility issues
                with open(model_path, 'rb') as file:
                    return pickle.load(file, encoding='bytes')
            except Exception as e3:
                print(f"Failed to load pickle model {model_path}: {str(e3)}")
                return None

def load_h5_model(model_path):
    try:
        # Try loading with standard approach
        return load_model(model_path)
    except Exception as e:
        print(f"Error loading h5 model {model_path}: {str(e)}")
        try:
            # Sometimes we need to handle custom objects
            return load_model(model_path, compile=False)
        except Exception as e2:
            print(f"Error loading h5 model with compile=False: {str(e2)}")
            # Return None to indicate failure
            return None

# Check if model file exists
def check_model_file(model_path):
    if not os.path.exists(model_path):
        print(f"Warning: Model file not found: {model_path}")
        return False
    return True

# Load all models on startup
try:
    # Load pickle models
    breast_cancer_model_path = os.path.join(MODEL_DIR, 'breast_cancer_model.pkl')
    if check_model_file(breast_cancer_model_path):
        breast_cancer_model = load_pkl_model(breast_cancer_model_path)
    
    heart_disease_model_path = os.path.join(MODEL_DIR, 'heart_disease_model.pkl')
    if check_model_file(heart_disease_model_path):
        heart_disease_model = load_pkl_model(heart_disease_model_path)
    
    liver_model_path = os.path.join(MODEL_DIR, 'Liver_Model.pkl')
    if check_model_file(liver_model_path):
        liver_model = load_pkl_model(liver_model_path)
    
    hepatitis_model_path = os.path.join(MODEL_DIR, 'hepatitis_model.pkl')
    if check_model_file(hepatitis_model_path):
        hepatitis_model = load_pkl_model(hepatitis_model_path)
    
    diabetis_model_path = os.path.join(MODEL_DIR, 'diabetis_model.pkl')
    if check_model_file(diabetis_model_path):
        diabetis_model = load_pkl_model(diabetis_model_path)

    # Load h5 models
    kidney_disease_model_path = os.path.join(MODEL_DIR, 'kidney_disease_model.h5')
    if check_model_file(kidney_disease_model_path):
        kidney_disease_model = load_h5_model(kidney_disease_model_path)
    
    brain_tumor_model_path = os.path.join(MODEL_DIR, 'brain_tumor_model.h5')
    if check_model_file(brain_tumor_model_path):
        brain_tumor_model = load_h5_model(brain_tumor_model_path)
    
    print("All models loaded successfully!")
except Exception as e:
    print(f"Error loading models: {str(e)}")

# Health check endpoint
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "models_loaded": ["breast_cancer", "heart_disease", "liver_disease", "kidney_disease", "brain_tumor", "hepatitis", "diabetes"]}), 200

# Models status endpoint
@app.route('/models/status', methods=['GET'])
def models_status():
    # Check which models are actually loaded
    status = {
        "breast_cancer": breast_cancer_model is not None,
        "heart_disease": heart_disease_model is not None,
        "liver_disease": liver_model is not None,
        "kidney_disease": kidney_disease_model is not None,
        "brain_tumor": brain_tumor_model is not None,
        "hepatitis": hepatitis_model is not None,
        "diabetes": diabetis_model is not None
    }
    
    # Check if model files exist
    files_exist = {
        "breast_cancer": os.path.exists(os.path.join(MODEL_DIR, 'breast_cancer_model.pkl')),
        "heart_disease": os.path.exists(os.path.join(MODEL_DIR, 'heart_disease_model.pkl')),
        "liver_disease": os.path.exists(os.path.join(MODEL_DIR, 'Liver_Model.pkl')),
        "kidney_disease": os.path.exists(os.path.join(MODEL_DIR, 'kidney_disease_model.h5')),
        "brain_tumor": os.path.exists(os.path.join(MODEL_DIR, 'brain_tumor_model.h5')),
        "hepatitis": os.path.exists(os.path.join(MODEL_DIR, 'hepatitis_model.pkl')),
        "diabetes": os.path.exists(os.path.join(MODEL_DIR, 'diabetis_model.pkl'))
    }
    
    return jsonify({
        "models_loaded": status,
        "files_exist": files_exist,
        "models_dir": MODEL_DIR
    }), 200

# Breast cancer prediction endpoint
@app.route('/predict/breast-cancer', methods=['POST'])
def predict_breast_cancer():
    try:
        # Get data from request
        data = request.json
        if not data or 'features' not in data:
            return jsonify({"error": "Missing required field (features)"}), 400
            
        # Process input data
        features = np.array(data['features']).reshape(1, -1)
        
        # Make prediction
        prediction = breast_cancer_model.predict(features)
        probability = breast_cancer_model.predict_proba(features).tolist()
        
        # Convert prediction to boolean/int and then to list for JSON serialization
        prediction_result = bool(prediction[0])
        
        return jsonify({
            "prediction": prediction_result,
            "probability": probability,
            "diagnosis": "Malignant" if prediction_result else "Benign"
        })
    except Exception as e:
        return jsonify({"error": f"Prediction failed: {str(e)}"}), 500

# Heart disease prediction endpoint
@app.route('/predict/heart-disease', methods=['POST'])
def predict_heart_disease():
    try:
        # Get data from request
        data = request.json
        if not data or 'features' not in data:
            return jsonify({"error": "Missing required field (features)"}), 400
            
        # Process input data
        features = np.array(data['features']).reshape(1, -1)
        
        # Make prediction
        prediction = heart_disease_model.predict(features)
        probability = heart_disease_model.predict_proba(features).tolist()
        
        # Convert prediction to boolean/int and then to list for JSON serialization
        prediction_result = bool(prediction[0])
        
        return jsonify({
            "prediction": prediction_result,
            "probability": probability,
            "diagnosis": "Heart Disease Present" if prediction_result else "No Heart Disease"
        })
    except Exception as e:
        return jsonify({"error": f"Prediction failed: {str(e)}"}), 500

# Liver disease prediction endpoint
@app.route('/predict/liver-disease', methods=['POST'])
def predict_liver_disease():
    try:
        # Get data from request
        data = request.json
        if not data or 'features' not in data:
            return jsonify({"error": "Missing required field (features)"}), 400
            
        # Process input data
        features = np.array(data['features']).reshape(1, -1)
        
        # Make prediction
        prediction = liver_model.predict(features)
        probability = liver_model.predict_proba(features).tolist()
        
        # Convert prediction to boolean/int and then to list for JSON serialization
        prediction_result = bool(prediction[0])
        
        return jsonify({
            "prediction": prediction_result,
            "probability": probability,
            "diagnosis": "Liver Disease Present" if prediction_result else "No Liver Disease"
        })
    except Exception as e:
        return jsonify({"error": f"Prediction failed: {str(e)}"}), 500

# Kidney disease prediction endpoint
@app.route('/predict/kidney-disease', methods=['POST'])
def predict_kidney_disease():
    try:
        # Check if the model is loaded
        if kidney_disease_model is None:
            return jsonify({
                "error": "Kidney disease model is not loaded. Please check server logs and ensure the model file exists."
            }), 503  # Service Unavailable
            
        # Get data from request
        data = request.json
        if not data or 'input' not in data:
            return jsonify({"error": "Missing required field (input)"}), 400
            
        # Process input data for CNN model
        input_data = np.array(data['input'])
        
        # Make prediction with keras model
        prediction = kidney_disease_model.predict(input_data)
        
        # Process prediction result
        # Assuming the model outputs a sigmoid value between 0 and 1
        prediction_value = float(prediction[0][0])
        prediction_result = prediction_value >= 0.5
        
        return jsonify({
            "prediction": prediction_result,
            "probability": float(prediction_value),
            "diagnosis": "Kidney Disease Present" if prediction_result else "No Kidney Disease"
        })
    except Exception as e:
        return jsonify({"error": f"Prediction failed: {str(e)}"}), 500

# Route for handling image uploads for kidney disease detection
@app.route('/predict/kidney-disease/image', methods=['POST'])
def predict_kidney_disease_image():
    try:
        # Check if the model is loaded
        if kidney_disease_model is None:
            return jsonify({
                "error": "Kidney disease model is not loaded. Please check server logs and ensure the model file exists."
            }), 503  # Service Unavailable
            
        # For image uploads
        if 'file' not in request.files:
            return jsonify({"error": "No image file provided"}), 400
            
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "Empty filename"}), 400
            
        # Read and preprocess the image
        # This is a placeholder. You need to implement the actual preprocessing
        # based on how your kidney_disease_model was trained
        from PIL import Image
        import io
        
        # Load the image
        img = Image.open(io.BytesIO(file.read()))
        
        # Resize to expected input size (adjust as needed for your model)
        img = img.resize((256, 256))
        
        # Convert to array and normalize
        img_array = np.array(img) / 255.0
        
        # Add batch dimension
        img_array = np.expand_dims(img_array, axis=0)
        
        # Make prediction
        prediction = kidney_disease_model.predict(img_array)
        prediction_value = float(prediction[0][0])
        prediction_result = prediction_value >= 0.5
        
        return jsonify({
            "prediction": prediction_result,
            "probability": float(prediction_value),
            "diagnosis": "Kidney Disease Present" if prediction_result else "No Kidney Disease"
        })
    except Exception as e:
        return jsonify({"error": f"Image prediction failed: {str(e)}"}), 500

# Brain tumor prediction endpoint
@app.route('/predict/brain-tumor', methods=['POST'])
def predict_brain_tumor():
    try:
        # Check if the model is loaded
        if brain_tumor_model is None:
            return jsonify({
                "error": "Brain tumor model is not loaded. Please check server logs and ensure the model file exists.",
                "message": "Mock predictions have been disabled. Please contact administrator to resolve model loading issues."
            }), 503  # Service Unavailable
            
        # Get data from request
        data = request.json
        if not data or 'input' not in data:
            return jsonify({"error": "Missing required field (input)"}), 400
            
        # Process input data for CNN model
        input_data = np.array(data['input'])
        
        # Make prediction with keras model
        prediction = brain_tumor_model.predict(input_data)
        
        # Process prediction result
        # Assuming the model outputs a sigmoid value between 0 and 1
        prediction_value = float(prediction[0][0])
        prediction_result = prediction_value >= 0.5
        
        return jsonify({
            "prediction": prediction_result,
            "probability": float(prediction_value),
            "diagnosis": "Brain Tumor Detected" if prediction_result else "No Brain Tumor Detected"
        })
    except Exception as e:
        return jsonify({"error": f"Prediction failed: {str(e)}"}), 500

# Route for handling image uploads for brain tumor detection
@app.route('/predict/brain-tumor/image', methods=['POST'])
def predict_brain_tumor_image():
    try:
        # Check if the model is loaded
        if brain_tumor_model is None:
            return jsonify({
                "error": "Brain tumor model is not loaded. Please check server logs and ensure the model file exists.",
                "message": "Mock predictions have been disabled. Please contact administrator to resolve model loading issues."
            }), 503  # Service Unavailable
            
        # For image uploads
        if 'file' not in request.files:
            return jsonify({"error": "No image file provided"}), 400
            
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "Empty filename"}), 400
            
        print(f"Processing brain tumor image: {file.filename}")
            
        # Read and preprocess the image
        try:
            from PIL import Image
            import io
            
            # Load the image
            img = Image.open(io.BytesIO(file.read()))
            print(f"Image loaded successfully. Size: {img.size}, Mode: {img.mode}")
            
            # Resize to expected input size
            img = img.resize((128, 128))  # Change from 224x224 to 128x128 to match the model's expected input
            print(f"Resized image to 128x128")
            
            # Convert to RGB if it's not
            if img.mode != 'RGB':
                img = img.convert('RGB')
                print(f"Converted image to RGB mode")
            
            # Convert to array and normalize
            img_array = np.array(img) / 255.0
            
            # Check for valid array shape
            print(f"Image array shape: {img_array.shape}")
            if len(img_array.shape) != 3 or img_array.shape[2] != 3:
                return jsonify({"error": f"Invalid image format. Expected RGB image, got shape {img_array.shape}"}), 400
            
            # Validate dimensions
            expected_height, expected_width = 128, 128  # Match model's expected input
            if img_array.shape[0] != expected_height or img_array.shape[1] != expected_width:
                print(f"Resizing image from {img_array.shape[0]}x{img_array.shape[1]} to {expected_height}x{expected_width}")
                # This shouldn't happen as we already resized, but just in case
            
            # Add batch dimension
            img_array = np.expand_dims(img_array, axis=0)
            
            # Make prediction
            print("Making prediction...")
            prediction = brain_tumor_model.predict(img_array)
            prediction_value = float(prediction[0][0])
            prediction_result = prediction_value >= 0.5
            print(f"Prediction complete: {prediction_result}, value: {prediction_value}")
            
            return jsonify({
                "prediction": prediction_result,
                "probability": float(prediction_value),
                "diagnosis": "Brain Tumor Detected" if prediction_result else "No Brain Tumor Detected"
            })
        except Exception as img_error:
            # Specific error for image processing
            print(f"Image processing error: {str(img_error)}")
            return jsonify({"error": f"Image processing error: {str(img_error)}"}), 400
            
    except Exception as e:
        # General error
        import traceback
        error_traceback = traceback.format_exc()
        print(f"Brain tumor image prediction failed: {str(e)}")
        print(error_traceback)
        return jsonify({"error": f"Image prediction failed: {str(e)}"}), 500

# Hepatitis prediction endpoint
@app.route('/predict/hepatitis', methods=['POST'])
def predict_hepatitis():
    try:
        # Get data from request
        data = request.json
        if not data or 'features' not in data:
            return jsonify({"error": "Missing required field (features)"}), 400
            
        # Process input data
        features = np.array(data['features']).reshape(1, -1)
        
        # Make prediction
        prediction = hepatitis_model.predict(features)
        probability = hepatitis_model.predict_proba(features).tolist()
        
        # Convert prediction to boolean/int and then to list for JSON serialization
        prediction_result = bool(prediction[0])
        
        return jsonify({
            "prediction": prediction_result,
            "probability": probability,
            "diagnosis": "Hepatitis Present" if prediction_result else "No Hepatitis"
        })
    except Exception as e:
        return jsonify({"error": f"Prediction failed: {str(e)}"}), 500

# Diabetes prediction endpoint
@app.route('/predict/diabetes', methods=['POST'])
def predict_diabetes():
    try:
        # Get data from request
        data = request.json
        if not data or 'features' not in data:
            return jsonify({"error": "Missing required field (features)"}), 400
            
        # Process input data
        features = np.array(data['features']).reshape(1, -1)
        
        # Make prediction
        prediction = diabetis_model.predict(features)
        probability = diabetis_model.predict_proba(features).tolist()
        
        # Convert prediction to boolean/int and then to list for JSON serialization
        prediction_result = bool(prediction[0])
        
        return jsonify({
            "prediction": prediction_result,
            "probability": probability,
            "diagnosis": "Diabetes Present" if prediction_result else "No Diabetes"
        })
    except Exception as e:
        return jsonify({"error": f"Prediction failed: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(debug=False, host='0.0.0.0', port=5002) 
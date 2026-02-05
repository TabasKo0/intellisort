from flask import Flask, request, jsonify
from flask_cors import CORS
import base64
from PIL import Image
from io import BytesIO
import logging
from pathlib import Path
from ultralytics import YOLO

app = Flask(__name__)
CORS(app)
logging.basicConfig(level=logging.INFO)

# Load model
MODEL_PATH = '../model_work/best.pt'
try:
    model = YOLO(MODEL_PATH)
    logging.info(f"✅ Model loaded: {MODEL_PATH}")
except Exception as e:
    logging.error(f"❌ Failed to load model: {e}")
    model = None

# Waste info
WASTE_INFO = {
    'cardboard': {'disposal': 'Recycle', 'bin_color': 'Blue'},
    'glass': {'disposal': 'Recycle', 'bin_color': 'Blue'},
    'metal': {'disposal': 'Recycle', 'bin_color': 'Blue'},
    'organic': {'disposal': 'Compost', 'bin_color': 'Green'},
    'paper': {'disposal': 'Recycle', 'bin_color': 'Blue'},
    'plastic': {'disposal': 'Recycle', 'bin_color': 'Blue'},
    'trash': {'disposal': 'Landfill', 'bin_color': 'Black'}
}

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "model_loaded": model is not None})

@app.route('/classify', methods=['POST'])
def classify():
    try:
        # Get image
        data = request.json
        image_data = data.get('image')
        
        if not image_data:
            return jsonify({"error": "No image provided"}), 400
        
        # Decode base64
        if 'base64,' in image_data:
            image_data = image_data.split('base64,')[1]
        
        image_bytes = base64.b64decode(image_data)
        image = Image.open(BytesIO(image_bytes)).convert('RGB')
        
        # Predict
        results = model(image, verbose=False)
        
        # Get results
        predicted_class = results[0].names[results[0].probs.top1]
        confidence = float(results[0].probs.top1conf.item())
        
        # Get disposal info
        info = WASTE_INFO.get(predicted_class, {'disposal': 'Unknown', 'bin_color': 'Unknown'})
        
        # Response
        print(predicted_class);
        return jsonify({
            "category": predicted_class,
            "confidence": confidence,
            "disposal": info['disposal'],
            "bin_color": info['bin_color']
        })
        
    except Exception as e:
        logging.error(f"Error: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("\n🚀 IntelliSort API running on http://localhost:5000\n")
    app.run(debug=True, host='0.0.0.0', port=5000)
from flask import Flask, request, jsonify
from flask_cors import CORS
import base64
from PIL import Image
from io import BytesIO
import logging

# Import your new pipeline
from classification_pipeline.pipeline import WastePipeline

app = Flask(__name__)
CORS(app)
logging.basicConfig(level=logging.INFO)

# Load pipeline instead of just YOLO
try:
    pipeline = WastePipeline()
    logging.info("✅ Two-stage classification pipeline loaded successfully.")
except Exception as e:
    logging.error(f"❌ Failed to load pipeline: {e}")
    pipeline = None

# Waste info (Ensure classes match your pipeline config: cardboard, glass, metal, paper, plastic, trash)
WASTE_INFO = {
    'cardboard': {'disposal': 'Recycle', 'bin_color': 'Blue'},
    'glass': {'disposal': 'Recycle', 'bin_color': 'Blue'},
    'metal': {'disposal': 'Recycle', 'bin_color': 'Blue'},
    'paper': {'disposal': 'Recycle', 'bin_color': 'Blue'},
    'plastic': {'disposal': 'Recycle', 'bin_color': 'Blue'},
    'trash': {'disposal': 'Landfill', 'bin_color': 'Black'}
}

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "pipeline_loaded": pipeline is not None})

@app.route('/classify', methods=['POST'])
def classify():
    if pipeline is None:
        return jsonify({"error": "Pipeline not initialized"}), 500

    try:
        data = request.json
        image_data = data.get('image')
        
        if not image_data:
            return jsonify({"error": "No image provided"}), 400
        
        # Decode base64
        if 'base64,' in image_data:
            image_data = image_data.split('base64,')[1]
        
        image_bytes = base64.b64decode(image_data)
        image = Image.open(BytesIO(image_bytes)).convert('RGB')
        
        # Predict using the new pipeline
        results = pipeline.process(image)
        
        if len(results) == 0:
            return jsonify({
                "category": "Unknown",
                "confidence": 0.0,
                "disposal": "Unknown",
                "bin_color": "Unknown",
                "message": "No waste detected in image."
            })
        
        # If multiple items are detected, find the one with the highest classification confidence
        best_detection = max(results, key=lambda x: x['class_confidence'])
        
        predicted_class = best_detection['class_name']
        confidence = best_detection['class_confidence']
        
        info = WASTE_INFO.get(predicted_class, {'disposal': 'Unknown', 'bin_color': 'Unknown'})
        
        logging.info(f"Detected: {predicted_class} ({confidence:.2f})")
        
        return jsonify({
            "category": predicted_class,
            "confidence": confidence,
            "disposal": info['disposal'],
            "bin_color": info['bin_color'],
            "all_detections": results  # Optional: pass all detections to frontend if needed
        })
        
    except Exception as e:
        logging.error(f"Error: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("\n🚀 IntelliSort API running on http://localhost:5000\n")
    app.run(debug=True, host='0.0.0.0', port=5000)
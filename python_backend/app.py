from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import base64
from PIL import Image
from io import BytesIO
import logging

app = Flask(__name__)
CORS(app)
logging.basicConfig(level=logging.INFO)

# TODO: Load your trained model here
# from your_model import load_model
# model = load_model('path/to/model')

# Waste categories and disposal methods
WASTE_CATEGORIES = {
    0: {"category": "Plastic", "disposal": "Recyclable", "tip": "Rinse before recycling"},
    1: {"category": "Paper", "disposal": "Recyclable", "tip": "Keep dry and clean"},
    2: {"category": "Glass", "disposal": "Recyclable", "tip": "Rinse thoroughly"},
    3: {"category": "Metal", "disposal": "Recyclable", "tip": "Remove any food residue"},
    4: {"category": "Organic", "disposal": "Compostable", "tip": "Can be composted"},
    5: {"category": "Mixed", "disposal": "Landfill", "tip": "No recycling possible"},
}

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy"})

@app.route('/classify', methods=['POST'])
def classify_waste():
    try:
        data = request.json
        image_data = data.get('image')

        if not image_data:
            return jsonify({"error": "No image provided"}), 400

        # Decode base64 image
        if image_data.startswith('data:image'):
            image_data = image_data.split(',')[1]

        image_bytes = base64.b64decode(image_data)
        image = Image.open(BytesIO(image_bytes))
        image_array = np.array(image)

        # TODO: Run your model inference here
        # prediction = model.predict(image_array)
        # predicted_class = np.argmax(prediction)
        # confidence = float(np.max(prediction))

        # Mock prediction for demo
        predicted_class = np.random.randint(0, len(WASTE_CATEGORIES))
        confidence = np.random.uniform(0.7, 0.99)

        waste_info = WASTE_CATEGORIES[predicted_class]

        response = {
            "waste_category": waste_info["category"],
            "disposal_type": waste_info["disposal"],
            "confidence": confidence,
            "tip": waste_info["tip"],
        }

        logging.info(f"Classification: {response}")
        return jsonify(response)

    except Exception as e:
        logging.error(f"Error: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)

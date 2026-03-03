import io
from PIL import Image
from .detector import WasteDetector
from .classifier import WasteClassifier

class WastePipeline:
    def __init__(self):
        self.detector = WasteDetector()
        self.classifier = WasteClassifier()
        print("✅ Full Pipeline Initialized and Ready.")

    def process(self, image_input):
        if isinstance(image_input, bytes):
            img = Image.open(io.BytesIO(image_input)).convert("RGB")
        elif isinstance(image_input, Image.Image): # Support direct PIL Image passing from app.py
            img = image_input.convert("RGB")
        else:
            img = Image.open(image_input).convert("RGB")

        detections = self.detector.detect_and_crop(img)
        final_results = []

        for det in detections:
            crop_img = det.pop("crop_image")
            class_name, class_conf = self.classifier.classify_crop(crop_img)
            
            det["class_name"] = class_name
            det["class_confidence"] = class_conf
            final_results.append(det)

        return final_results
import io
from PIL import Image
from .detector import WasteDetector
from .classifier import WasteClassifier
from . import config

class WastePipeline:
    def __init__(self):
        self.detector = WasteDetector()
        self.classifier = WasteClassifier()
        print("✅ Full Pipeline Initialized and Ready.")

    def process(self, image_input):
        """
        Process an image through the complete waste detection and classification pipeline.
        
        Args:
            image_input: bytes, PIL Image, or file path
        
        Returns:
            List containing the best classification result
        """
        if isinstance(image_input, bytes):
            img = Image.open(io.BytesIO(image_input)).convert("RGB")
        elif isinstance(image_input, Image.Image):
            img = image_input.convert("RGB")
        else:
            img = Image.open(image_input).convert("RGB")

        # 1. Run Detector on Whole Image
        detections = self.detector.detect_and_crop(img)
        
        candidates = []

        # 2. Process Detections or Fallback to Whole Image
        if len(detections) > 0:
            # Case A: Objects detected - process each crop
            for det in detections:
                crop_img = det.pop("crop_image")  # Remove PIL object to keep result JSON serializable
                class_name, class_conf = self.classifier.classify_crop(crop_img)
                
                det["class_name"] = class_name
                det["class_confidence"] = class_conf
                det["source"] = "crop"
                candidates.append(det)

        else:
            # Case B: No objects detected - fallback to whole image classification
            full_class_name, full_class_conf = self.classifier.classify_crop(img)
            img_w, img_h = img.size
            candidates.append({
                "bbox": [0.0, 0.0, float(img_w), float(img_h)],
                "yolo_confidence": 0.0,
                "yolo_class": "whole_image_fallback",
                "class_name": full_class_name, 
                "class_confidence": full_class_conf,
                "source": "whole_image"
            })

        # 3. Return Best Result
        if not candidates:
            return []
            
        best_result = max(candidates, key=lambda x: x["class_confidence"])
        
        # Return as a list containing the single best result
        return [best_result]
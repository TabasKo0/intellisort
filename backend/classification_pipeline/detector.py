from ultralytics import YOLO
from . import config

class WasteDetector:
    def __init__(self):
        print(f"Loading YOLO Detector on {config.DEVICE}...")
        self.model = YOLO(config.YOLO_WEIGHTS)

    def detect_and_crop(self, img_pil, conf=config.YOLO_CONFIDENCE_THRESHOLD, padding=config.CROP_PADDING_RATIO):
        img_w, img_h = img_pil.size
        results = self.model(img_pil, conf=conf, verbose=False)[0]
        boxes = results.boxes

        detections = []
        for box in boxes:
            x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
            yolo_conf = float(box.conf[0].cpu())

            bw, bh = x2 - x1, y2 - y1
            pad_x, pad_y = bw * padding, bh * padding
            
            x1_pad, y1_pad = max(0, x1 - pad_x), max(0, y1 - pad_y)
            x2_pad, y2_pad = min(img_w, x2 + pad_x), min(img_h, y2 + pad_y)

            crop_pil = img_pil.crop((x1_pad, y1_pad, x2_pad, y2_pad))

            detections.append({
                "bbox": [float(x1), float(y1), float(x2), float(y2)],
                "yolo_confidence": yolo_conf,
                "crop_image": crop_pil
            })
        return detections
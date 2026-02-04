"""
quick_test.py
Quick test script for single image
"""

from ultralytics import YOLO
from pathlib import Path
import sys

model = YOLO("best.pt")

if len(sys.argv) > 1:
    img_path = sys.argv[1]
else:
    img_path = input("Enter image path: ").strip().strip('"')

results = model(img_path)

pred_class = results[0].names[results[0].probs.top1]
confidence = results[0].probs.top1conf.item() * 100

disposal_map = {
    'cardboard': ('Recycle', 'Blue'),
    'glass': ('Recycle', 'Blue'),
    'metal': ('Recycle', 'Blue'),
    'organic': ('Compost', 'Green'),
    'paper': ('Recycle', 'Blue'),
    'plastic': ('Recycle', 'Blue'),
    'trash': ('Landfill', 'Black')
}

disposal, bin_color = disposal_map.get(pred_class, ('Unknown', 'Unknown'))

print(f"\n{'='*60}")
print(f"Image: {Path(img_path).name}")
print(f"Category: {pred_class.upper()}")
print(f"Confidence: {confidence:.1f}%")
print(f"Disposal: {disposal} → {bin_color} Bin")
print(f"{'='*60}\n")

print("Top 5 predictions:")
for i, (idx, conf) in enumerate(zip(results[0].probs.top5, results[0].probs.top5conf), 1):
    cat = results[0].names[idx]
    print(f"  {i}. {cat:12s} {conf.item()*100:5.1f}%")
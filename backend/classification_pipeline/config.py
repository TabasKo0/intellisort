import torch
import os

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Base directory is now the 'classification_pipeline' folder
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Point these to the 'models' folder inside classification_pipeline
YOLO_WEIGHTS = "classification_pipeline/models/detector_model.pt"           # PUT YOUR YOLO MODEL HERE
RESNET_WEIGHTS = "classification_pipeline/models/classifier_model.pt"  # PUT YOUR RESNET MODEL HERE

CLASSES = [
    "Cardboard", 
    "Food Organics", 
    "Glass", 
    "Metal", 
    "Paper", 
    "Plastic", 
    "Textile Trash", 
    "Vegetation"
]
#    "Miscellaneous Trash", 

# YOLO Detection Settings
YOLO_CONFIDENCE_THRESHOLD = 0.5  # Increased from 0.25 to reduce false positives
CROP_PADDING_RATIO = 0.10

# ResNet Classification Settings
RESNET_MEAN = [0.485, 0.456, 0.406]  # ImageNet normalization
RESNET_STD = [0.229, 0.224, 0.225]   # ImageNet normalization
RESNET_INPUT_SIZE = 224

# IDK (I Don't Know) Framework - Confidence Thresholds
YOLO_CONFIDENCE_MIN = 0.45  # Below this, flag as "Ambiguous Detection"
RESNET_CONFIDENCE_MIN = 0.50  # Below this, classify as "Miscellaneous Trash" or reject

# CLAHE Settings (Contrast Limited Adaptive Histogram Equalization)
CLAHE_CLIP_LIMIT = 2.0
CLAHE_TILE_GRID_SIZE = (8, 8)

# Preprocessing Settings
ENABLE_CLAHE = True  # Enable CLAHE preprocessing
ENABLE_SHARPENING = True  # Enable mild sharpening filter
SHARPENING_KERNEL_STRENGTH = 1.5  # Kernel strength for sharpening

# Fallback Classification
FALLBACK_CLASS = "Miscellaneous Trash"  # Fallback when confidence is too low
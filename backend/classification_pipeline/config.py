import torch
import os

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Base directory is now the 'classification_pipeline' folder
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Point these to the 'models' folder inside classification_pipeline
YOLO_WEIGHTS = "classification_pipeline/models/detector_model.pt"           # PUT YOUR YOLO MODEL HERE
RESNET_WEIGHTS = "classification_pipeline/models/classifier_model.pt"  # PUT YOUR RESNET MODEL HERE

CLASSES = ["cardboard", "glass", "metal", "paper", "plastic", "trash"]
YOLO_CONFIDENCE_THRESHOLD = 0.25
CROP_PADDING_RATIO = 0.10

RESNET_MEAN = [0.485, 0.456, 0.406]
RESNET_STD = [0.229, 0.224, 0.225]
RESNET_INPUT_SIZE = 224
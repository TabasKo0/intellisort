import torch
import torchvision.transforms as transforms
from torchvision import models
from PIL import Image
import cv2
import numpy as np
from . import config

class WasteClassifier:
    def __init__(self):
        print(f"Loading ResNet Classifier on {config.DEVICE}...")
        self.device = config.DEVICE
        self.class_names = config.CLASSES
        
        self.transform = transforms.Compose([
            transforms.Resize((config.RESNET_INPUT_SIZE, config.RESNET_INPUT_SIZE)),
            transforms.ToTensor(),
            transforms.Normalize(mean=config.RESNET_MEAN, std=config.RESNET_STD),
        ])
        
        self.model = self._build_model()
        
        # --- FIXED PYTORCH LOADING ---
        checkpoint = torch.load(config.RESNET_WEIGHTS, map_location=self.device)
        # If saved as a checkpoint dict, extract just the weights
        if isinstance(checkpoint, dict) and "model_state_dict" in checkpoint:
            self.model.load_state_dict(checkpoint["model_state_dict"])
        else:
            self.model.load_state_dict(checkpoint)
            
        self.model.eval()

    def _build_model(self):
        """Build ResNet50 model with custom classification head."""
        model = models.resnet50(weights=None)
        model.fc = torch.nn.Sequential(
            torch.nn.Dropout(0.3),
            torch.nn.Linear(2048, 512),
            torch.nn.ReLU(),
            torch.nn.Dropout(0.2),
            torch.nn.Linear(512, len(self.class_names))
        )
        return model.to(self.device)

    def apply_clahe(self, img_pil):
        """
        Apply CLAHE (Contrast Limited Adaptive Histogram Equalization) 
        to improve contrast in images with varying lighting.
        
        Args:
            img_pil: PIL Image object
        
        Returns:
            PIL Image object with CLAHE applied
        """
        if not config.ENABLE_CLAHE:
            return img_pil
        
        # Convert PIL to OpenCV format
        img_cv = cv2.cvtColor(np.array(img_pil), cv2.COLOR_RGB2BGR)
        
        # Convert to LAB color space for better contrast enhancement
        lab = cv2.cvtColor(img_cv, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        
        # Apply CLAHE to L channel only
        clahe = cv2.createCLAHE(
            clipLimit=config.CLAHE_CLIP_LIMIT,
            tileGridSize=config.CLAHE_TILE_GRID_SIZE
        )
        l_clahe = clahe.apply(l)
        
        # Merge channels back
        lab_clahe = cv2.merge([l_clahe, a, b])
        img_clahe = cv2.cvtColor(lab_clahe, cv2.COLOR_LAB2BGR)
        
        # Convert back to PIL
        return Image.fromarray(cv2.cvtColor(img_clahe, cv2.COLOR_BGR2RGB))

    def apply_sharpening(self, img_pil):
        """
        Apply mild sharpening filter to restore edge definitions 
        lost during upsampling of small crops.
        
        Args:
            img_pil: PIL Image object
        
        Returns:
            PIL Image object with sharpening applied
        """
        if not config.ENABLE_SHARPENING:
            return img_pil
        
        # Convert to numpy array
        img_array = np.array(img_pil, dtype=np.float32) / 255.0
        
        # Apply unsharp mask (mild sharpening)
        # Blur the image
        blurred = cv2.GaussianBlur(img_array, (5, 5), 1.0)
        
        # Compute sharpened image
        sharpened = img_array + config.SHARPENING_KERNEL_STRENGTH * (img_array - blurred)
        
        # Clip values to [0, 1] and convert back to uint8
        sharpened = np.clip(sharpened, 0, 1) * 255
        
        return Image.fromarray(sharpened.astype(np.uint8))

    def preprocess_crop(self, crop_pil):
        """
        Apply preprocessing pipeline to crop before classification.
        Includes CLAHE and sharpening for better feature extraction.
        
        Args:
            crop_pil: PIL Image object (crop from detector)
        
        Returns:
            Preprocessed PIL Image object
        """
        # Apply CLAHE for lighting correction
        crop_pil = self.apply_clahe(crop_pil)
        
        # Apply sharpening to restore edges
        crop_pil = self.apply_sharpening(crop_pil)
        
        return crop_pil

    def classify_crop(self, crop_pil):
        """
        Classify a cropped image and return class name and confidence.
        Implements IDK (I Don't Know) framework with confidence thresholding.
        
        Args:
            crop_pil: PIL Image object (crop from detector)
        
        Returns:
            Tuple of (class_name, confidence_score)
        """
        # Apply preprocessing
        crop_pil = self.preprocess_crop(crop_pil)
        
        # Transform and classify
        input_tensor = self.transform(crop_pil).unsqueeze(0).to(self.device)
        
        with torch.no_grad():
            logits = self.model(input_tensor)
            probs = torch.softmax(logits, dim=1)
            class_idx = torch.argmax(probs, dim=1).item()
            confidence = probs[0, class_idx].item()
        
        # IDK Framework: Check confidence threshold
        if confidence < config.RESNET_CONFIDENCE_MIN:
            # Return fallback class or reject
            return config.FALLBACK_CLASS, confidence
        
        return self.class_names[class_idx], float(confidence)
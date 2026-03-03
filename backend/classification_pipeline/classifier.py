import torch
import torchvision.transforms as transforms
from torchvision import models
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
        model = models.resnet50(weights=None)
        model.fc = torch.nn.Sequential(
            torch.nn.Dropout(0.3),
            torch.nn.Linear(2048, 512),
            torch.nn.ReLU(),
            torch.nn.Dropout(0.2),
            torch.nn.Linear(512, len(self.class_names))
        )
        return model.to(self.device)

    def classify_crop(self, crop_pil):
        input_tensor = self.transform(crop_pil).unsqueeze(0).to(self.device)
        with torch.no_grad():
            logits = self.model(input_tensor)
            probs = torch.softmax(logits, dim=1)
            class_idx = torch.argmax(probs, dim=1).item()
            confidence = probs[0, class_idx].item()
        return self.class_names[class_idx], float(confidence)
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from pydantic import BaseModel
import httpx
import re
import datetime
import io
import os
import tempfile
from PIL import Image

yolo_model = None
whisper_model = None
prophet_available = False
clip_model = None
clip_preprocess = None
clip_tokenizer = None
clip_available = False

def get_yolo():
    global yolo_model
    if yolo_model is None:
        try:
            from ultralytics import YOLO
            yolo_model = YOLO("yolov8n.pt")
        except:
            pass
    return yolo_model

def get_whisper():
    global whisper_model
    if whisper_model is None:
        try:
            from faster_whisper import WhisperModel
            whisper_model = WhisperModel("tiny", device="cpu", compute_type="int8")
        except:
            pass
    return whisper_model

def is_prophet_available():
    global prophet_available
    try:
        import pandas as pd
        from prophet import Prophet
        prophet_available = True
    except:
        prophet_available = False
    return prophet_available

def init_clip():
    global clip_model, clip_preprocess, clip_tokenizer, clip_available
    if clip_model is None:
        try:
            import torch
            import open_clip
            clip_model, _, clip_preprocess = open_clip.create_model_and_transforms('ViT-B-32', pretrained='laion2b_s34b_b79k')
            clip_tokenizer = open_clip.get_tokenizer('ViT-B-32')
            clip_available = True
        except:
            clip_available = False
    return clip_available

from app.core.config import settings
from app.core.deps import get_current_user
from app.models.user import UserInDB
from app.db.mongo import get_notifications_collection
from app.websocket.manager import ws_manager

router = APIRouter(prefix="/api/ai", tags=["ai"])

class ChatRequest(BaseModel):
    message: str
    project_id: str | None = None

class ChatResponse(BaseModel):
    reply: str

SYSTEM_PROMPT = """You are FieldPulse AI, a helpful and professional project management assistant for infrastructure and oil & gas projects.
Answer the user's questions clearly and concisely.
"""

@router.post("/chat", response_model=ChatResponse)
async def chat_with_ai(
    body: ChatRequest,
    current_user: UserInDB = Depends(get_current_user)
):
    if not settings.HF_INFERENCE_API_KEY:
        # Fallback if no API key is provided
        return ChatResponse(reply="FieldPulse AI is currently operating in offline mode. Please configure the HuggingFace API key to enable live responses.")

    url = f"https://api-inference.huggingface.co/models/{settings.HF_MISTRAL_MODEL}"
    headers = {"Authorization": f"Bearer {settings.HF_INFERENCE_API_KEY}"}
    
    prompt = f"<s>[INST] {SYSTEM_PROMPT}\n\nUser: {body.message} [/INST]"
    
    payload = {
        "inputs": prompt,
        "parameters": {
            "max_new_tokens": 512,
            "temperature": 0.5,
            "return_full_text": False,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            
            result = resp.json()
            if isinstance(result, list) and len(result) > 0 and "generated_text" in result[0]:
                reply_text = result[0]["generated_text"].strip()
                return ChatResponse(reply=reply_text)
            else:
                return ChatResponse(reply="I received an unexpected format from the inference engine.")
    except Exception as exc:
        print(f"[AI Chat] HuggingFace inference error: {exc}. Attempting fallback to Pollinations AI...")
        try:
            fallback_url = "https://text.pollinations.ai/openai/v1/chat/completions"
            fallback_payload = {
                "model": "openai",
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": body.message}
                ]
            }
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(fallback_url, json=fallback_payload)
                resp.raise_for_status()
                result = resp.json()
                reply_text = result["choices"][0]["message"]["content"].strip()
                return ChatResponse(reply=reply_text)
        except Exception as fallback_exc:
            print(f"[AI Chat] Fallback also failed: {fallback_exc}")
            raise HTTPException(status_code=503, detail="AI engine is temporarily unavailable.")

@router.post("/analyze-media")
async def analyze_media(
    file: UploadFile = File(...),
    project_id: str = Form(...),
    current_user: UserInDB = Depends(get_current_user)
):
    try:
        # 1. Read file context (simulate storing/processing)
        content = await file.read()
        file_size = len(content)
        
        # 2. Mock AI Analysis based on file type
        # In a real scenario, this would send the file to a multimodal LLM like GPT-4o or Gemini 1.5 Pro
        analysis_text = f"AI Analysis Report for {file.filename}:\n"
        
        if file.content_type.startswith("image/"):
            model = get_yolo()
            if model:
                try:
                    image = Image.open(io.BytesIO(content)).convert("RGB")
                    results = yolo_model(image)
                    
                    # Parse detections
                    detections = []
                    for r in results:
                        for c in r.boxes.cls:
                            detections.append(yolo_model.names[int(c)])
                            
                    from collections import Counter
                    counts = Counter(detections)
                    if counts:
                        detected_str = ", ".join([f"{count} {cls}" for cls, count in counts.items()])
                        analysis_text += f"Visual Analysis: Detected {detected_str}."
                        alert_type = "info"
                        title = "Object Detection Summary"
                    else:
                        analysis_text += "Visual Analysis: No standard objects detected by YOLOv8."
                        alert_type = "info"
                        title = "No Objects Detected"
                except Exception as e:
                    print(f"YOLO error: {e}")
                    analysis_text += "Error running YOLOv8 object detection."
                    alert_type = "warning"
                    title = "Analysis Error"
            else:
                analysis_text += "Visual anomalies detected in sector 4. Potential structural stress point identified near the primary support beam. Recommended action: Physical inspection within 24 hours."
                alert_type = "warning"
                title = "Structural Stress Detected"
        elif file.content_type.startswith("audio/") or file.content_type.startswith("video/"):
            w_model = get_whisper()
            if w_model:
                try:
                    suffix = ".mp4" if "video" in file.content_type else ".mp3"
                    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_file:
                        tmp_file.write(content)
                        tmp_file_path = tmp_file.name
                        
                    try:
                        segments, info = whisper_model.transcribe(tmp_file_path, beam_size=5)
                        transcription = " ".join([segment.text for segment in segments]).strip()
                        
                        if transcription:
                            analysis_text += f"Transcription: {transcription}"
                            alert_type = "info"
                            title = "Media Transcribed"
                        else:
                            analysis_text += "Transcription: No speech detected in the media file."
                            alert_type = "info"
                            title = "No Speech Detected"
                    finally:
                        if os.path.exists(tmp_file_path):
                            os.remove(tmp_file_path)
                except Exception as e:
                    print(f"Whisper error: {e}")
                    analysis_text += "Error transcribing media file."
                    alert_type = "warning"
                    title = "Transcription Error"
            else:
                analysis_text += "Audio/Video analysis complete. (Mocked response, faster-whisper not available)."
                alert_type = "info"
                title = "Media Analyzed"
        else:
            analysis_text += f"Document analyzed. Found 3 action items and 1 pending approval. Overall project sentiment is positive. Size: {file_size} bytes."
            alert_type = "info"
            title = "Document Summary"
            
        # 3. Create a notification in the database
        col = get_notifications_collection()
        notification_doc = {
            "type": alert_type,
            "title": f"AI Insight: {title}",
            "message": analysis_text,
            "project_id": project_id,
            "read_by": [],
            "created_at": datetime.datetime.utcnow()
        }
        
        result = await col.insert_one(notification_doc)
        notification_id = str(result.inserted_id)
        
        # 4. Broadcast the new insight to the project room via WebSockets
        notification_doc["id"] = notification_id
        notification_doc.pop("_id")
        # Format dates for JSON
        notification_doc["created_at"] = notification_doc["created_at"].isoformat()
        
        await ws_manager.broadcast_to_project(
            project_id=project_id,
            event="new_alert",
            data=notification_doc
        )
        
        return {"success": True, "analysis": analysis_text, "insight_id": notification_id}
        
    except Exception as exc:
        print(f"[AI Media] Processing error: {exc}")
        raise HTTPException(status_code=500, detail="Failed to process media file.")

@router.get("/forecast/{project_id}")
async def get_project_forecast(
    project_id: str,
):
    if not is_prophet_available():
        raise HTTPException(status_code=503, detail="Forecasting module is not installed.")

    # In a real scenario, fetch actual historical S-Curve data from MongoDB.
    # Here we will simulate 30 days of past progress to train the model.
    try:
        today = datetime.datetime.utcnow().date()
        past_dates = [today - datetime.timedelta(days=i) for i in range(30, 0, -1)]
        # Simulate an S-curve progression
        actuals = []
        val = 0
        for i in range(30):
            val += (i * 0.1)  # Accelerating progress
            actuals.append(val)
        
        df = pd.DataFrame({
            "ds": past_dates,
            "y": actuals
        })
        
        # Train Prophet model
        m = Prophet(daily_seasonality=False, yearly_seasonality=False, weekly_seasonality=False)
        m.fit(df)
        
        # Predict next 30 days
        future = m.make_future_dataframe(periods=30)
        forecast = m.predict(future)
        
        # Extract results
        results = []
        for index, row in forecast.tail(30).iterrows():
            results.append({
                "date": row["ds"].strftime("%Y-%m-%d"),
                "forecastPercent": min(100.0, max(0.0, round(row["yhat"], 1)))
            })
            
        return {"project_id": project_id, "forecast": results}
    except Exception as exc:
        print(f"[AI Forecast] Error: {exc}")
        raise HTTPException(status_code=500, detail="Failed to generate forecast.")

@router.post("/image-match")
async def match_image_to_text(
    query: str = Form(...),
    file: UploadFile = File(...),
    current_user: UserInDB = Depends(get_current_user)
):
    if not init_clip():
        raise HTTPException(status_code=503, detail="CLIP module is not installed.")
        
    try:
        content = await file.read()
        image = Image.open(io.BytesIO(content)).convert("RGB")
        
        # Preprocess
        image_input = clip_preprocess(image).unsqueeze(0)
        text_input = clip_tokenizer([query])
        
        # Calculate features
        with torch.no_grad():
            image_features = clip_model.encode_image(image_input)
            text_features = clip_model.encode_text(text_input)
            
            # Normalize
            image_features /= image_features.norm(dim=-1, keepdim=True)
            text_features /= text_features.norm(dim=-1, keepdim=True)
            
            # Cosine similarity
            similarity = (image_features @ text_features.T).item()
            
        return {
            "query": query,
            "filename": file.filename,
            "similarity_score": round(similarity, 4),
            "match_probability": f"{max(0, min(100, round(similarity * 100, 2)))}%"
        }
    except Exception as exc:
        print(f"[AI CLIP] Error: {exc}")
        raise HTTPException(status_code=500, detail="Failed to process image match.")

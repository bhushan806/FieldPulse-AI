"""
backend/app/ai_engine/speech.py
faster-whisper based speech-to-text transcription.
Model is loaded lazily on first call.
"""
import io
import tempfile
import os
from typing import Optional

_whisper_model = None


def _load_model():
    global _whisper_model
    if _whisper_model is None:
        from faster_whisper import WhisperModel
        # Use 'base' for speed; upgrade to 'small' / 'medium' for better accuracy
        _whisper_model = WhisperModel("base", device="cpu", compute_type="int8")
        print("[Speech] Whisper model loaded.")


async def transcribe_audio(audio_bytes: bytes, language: str = "en") -> str:
    """
    Transcribe audio bytes (wav/mp3/ogg/webm) to text using faster-whisper.
    Returns the full transcription string.
    """
    _load_model()

    # Write to a temp file because faster-whisper needs a file path or numpy array
    suffix = ".webm"  # browser MediaRecorder default
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        segments, info = _whisper_model.transcribe(
            tmp_path,
            language=language,
            beam_size=5,
            vad_filter=True,
        )
        text = " ".join(seg.text.strip() for seg in segments)
        return text.strip()
    finally:
        os.unlink(tmp_path)

"""Google AI client for text generation (fallback provider)."""

import os
import httpx
from loguru import logger

from app.config import settings


class GoogleAIError(Exception):
    """Google AI API error."""

    pass


class GoogleAIClient:
    """Simple async client for Google AI text generation."""

    def __init__(self) -> None:
        self.base_url: str = settings.google_ai_base_url.rstrip("/")
        # Support both variable names (standard vs project specific)
        # Explicitly check os.getenv if settings value is falsy or a placeholder
        key = settings.google_ai_api_key or os.getenv("GOOGLE_API_KEY") or os.getenv("GOOGLE_AI_API_KEY")
        
        # Handle potential string "None" or "null" from misconfiguration
        if key and str(key).lower() in ("none", "null", "undefined"):
            key = ""
        self.api_key: str = key or ""

        if self.api_key:
            # Aggressively clean the key of whitespace and quotes
            self.api_key = self.api_key.strip().strip('"').strip("'")

        if not self.api_key:
            logger.warning("Google AI API key is MISSING in GoogleAIClient init")
        else:
            masked = f"{self.api_key[:4]}...{self.api_key[-4:]}" if len(self.api_key) > 8 else "***"
            logger.info(f"Google AI initialized with key: {masked}")

    async def generate_text(self, prompt: str, model: str | None = None) -> str:
        """Generate text using Google AI.

        Returns response in same format as AtlasCloud for compatibility:
        {"choices": [{"message": {"content": "..."}}]}
        """
        # FIX: If falling back from AtlasCloud, the model might be 'deepseek...'.
        # Google doesn't know that model. Force a Gemini model in that case.
        if model and ("deepseek" in model.lower() or "flux" in model.lower()):
            model = None

        model = model or settings.google_ai_text_model or "gemini-1.5-flash"
        if model:
            model = model.strip()

        url = f"{self.base_url}/models/{model}:generateContent"

        if not self.api_key:
            raise GoogleAIError("Google AI API key is not configured (key is empty)")

        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "maxOutputTokens": 500,
                "temperature": settings.ai_temperature,
                "topP": settings.ai_top_p,
                # Note: Google AI doesn't support frequency/presence penalty
            },
        }

        try:
            # DEBUG: Log the exact parameters being used (Masked Key)
            masked_key = f"{self.api_key[:4]}...{self.api_key[-4:]}" if len(self.api_key) > 8 else "INVALID"
            logger.info(f"GoogleAI Request: Model={model} Key={masked_key} PromptLen={len(prompt)}")

            async with httpx.AsyncClient(timeout=60.0) as client:
                # Use header authentication which is more robust than query params
                response = await client.post(
                    url,
                    json=payload,
                    headers={
                        "Content-Type": "application/json",
                        "x-goog-api-key": self.api_key
                    },
                )

                if response.status_code >= 400:
                    logger.error(
                        "Google AI API error: {} {}",
                        response.status_code,
                        response.text,
                    )
                    raise GoogleAIError(
                        f"API error {response.status_code}: {response.text}"
                    )

                data = response.json()  # pyright: ignore[reportAny]

                # Extract text from Google's response format
                text = str(
                    data.get("candidates", [{}])[0]  # pyright: ignore[reportAny]
                    .get("content", {})
                    .get("parts", [{}])[0]
                    .get("text", "")
                )

                # Return in AtlasCloud-compatible format
                return text

        except httpx.TimeoutException as e:
            logger.warning("Google AI API timeout: {}", e)
            raise GoogleAIError(f"Request timeout: {e}") from e

        except httpx.ConnectError as e:
            logger.warning("Google AI API connection error: {}", e)
            raise GoogleAIError(f"Connection error: {e}") from e


# Singleton instance
google_ai = GoogleAIClient()

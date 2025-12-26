"""Unified AI client with automatic fallback between providers."""

from loguru import logger

from app.config import settings
from app.services.atlascloud import AtlasCloudError, atlascloud
from app.services.google_ai import GoogleAIError, google_ai


class AIError(Exception):
    """Raised when all AI providers fail."""

    pass


class AIClient:
    """Unified AI client that tries AtlasCloud first, then falls back to Google AI."""

    async def generate_text(
        self,
        prompt: str,
        max_tokens: int = 500,
        model: str | None = None,
    ) -> str:
        """Generate text using available AI providers.

        Tries AtlasCloud first, falls back to Google AI if it fails.

        Args:
            prompt: The text prompt to send to the AI
            max_tokens: Maximum tokens in response
            model: Optional model override (provider-specific)

        Returns:
            Generated text response

        Raises:
            AIError: If all providers fail
        """
        errors: list[str] = []

        # Try AtlasCloud first (unless forced to use Google)
        if not settings.force_google_ai and settings.atlascloud_api_key:
            try:
                result = await atlascloud.generate_text(prompt, max_tokens, model)
                logger.debug("Text generated via AtlasCloud")
                return result
            except AtlasCloudError as e:
                errors.append(f"AtlasCloud: {e}")
                logger.warning("AtlasCloud failed, trying fallback: {}", e)

        # Fallback to Google AI
        if settings.google_ai_api_key:
            try:
                result = await google_ai.generate_text(prompt, model)
                logger.debug("Text generated via Google AI (fallback)")
                return result
            except GoogleAIError as e:
                errors.append(f"Google AI: {e}")
                logger.warning("Google AI failed: {}", e)

        # All providers failed
        if not errors:
            raise AIError("No AI providers configured (check API keys in .env)")
        raise AIError(f"All AI providers failed: {'; '.join(errors)}")

    async def generate_image(
        self,
        prompt: str,
        width: int = 1024,
        height: int = 1024,
        model: str | None = None,
    ) -> str:
        """Generate an image. Returns task ID for polling.

        Currently only AtlasCloud supports image generation.

        Args:
            prompt: Image description prompt
            width: Image width in pixels
            height: Image height in pixels
            model: Optional model override

        Returns:
            Task ID for polling status

        Raises:
            AIError: If image generation fails
        """
        if not settings.atlascloud_api_key:
            raise AIError("Image generation requires AtlasCloud API key")

        try:
            task_id = await atlascloud.generate_image(prompt, width, height, model)
            logger.debug("Image generation started via AtlasCloud: {}", task_id)
            return task_id
        except AtlasCloudError as e:
            raise AIError(f"Image generation failed: {e}") from e

    async def generate_video_from_text(
        self,
        prompt: str,
        width: int = 832,
        height: int = 480,
        duration: int = 5,
        model: str | None = None,
    ) -> str:
        """Generate a video from text. Returns task ID for polling.

        Currently only AtlasCloud supports video generation.

        Args:
            prompt: Video description prompt
            width: Video width in pixels
            height: Video height in pixels
            duration: Video duration in seconds
            model: Optional model override

        Returns:
            Task ID for polling status

        Raises:
            AIError: If video generation fails
        """
        if not settings.atlascloud_api_key:
            raise AIError("Video generation requires AtlasCloud API key")

        try:
            task_id = await atlascloud.generate_video_from_text(
                prompt, width, height, duration, model
            )
            logger.debug("Video generation started via AtlasCloud: {}", task_id)
            return task_id
        except AtlasCloudError as e:
            raise AIError(f"Video generation failed: {e}") from e

    async def generate_video_from_image(
        self,
        prompt: str,
        image_url: str,
        duration: int = 5,
        size: str = "832*480",
        model: str | None = None,
    ) -> str:
        """Generate a video from an image. Returns task ID for polling.

        Args:
            prompt: Video description prompt
            image_url: Source image URL
            duration: Video duration in seconds
            size: Video size as "WxH" string
            model: Optional model override

        Returns:
            Task ID for polling status

        Raises:
            AIError: If video generation fails
        """
        if not settings.atlascloud_api_key:
            raise AIError("Video generation requires AtlasCloud API key")

        try:
            task_id = await atlascloud.generate_video_from_image(
                prompt, image_url, model, duration, size
            )
            logger.debug("Image-to-video generation started: {}", task_id)
            return task_id
        except AtlasCloudError as e:
            raise AIError(f"Video generation failed: {e}") from e

    async def get_task_status(
        self, task_id: str
    ) -> tuple[str | None, list[str] | None, str | None]:
        """Get status of an async generation task.

        Args:
            task_id: The task ID returned from generate_image/generate_video

        Returns:
            Tuple of (status, outputs, error)
        """
        return await atlascloud.get_task_status(task_id)

    async def download_file(self, url: str) -> bytes:
        """Download a generated file from URL.

        Args:
            url: URL of the generated file

        Returns:
            File contents as bytes
        """
        return await atlascloud.download_file(url)

    def is_configured(self) -> bool:
        """Check if at least one AI provider is configured."""
        return bool(settings.atlascloud_api_key or settings.google_ai_api_key)

    def text_provider(self) -> str | None:
        """Return which provider will be used for text generation."""
        if settings.force_google_ai and settings.google_ai_api_key:
            return "google"
        if settings.atlascloud_api_key:
            return "atlascloud"
        if settings.google_ai_api_key:
            return "google"
        return None


# Singleton instance
ai = AIClient()

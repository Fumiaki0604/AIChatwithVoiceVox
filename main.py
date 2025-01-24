import logging
from app import app

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

if __name__ == "__main__":
    try:
        logger.info("Starting Flask server...")
        app.run(host="0.0.0.0", port=8080, debug=True)
    except Exception as e:
        logger.error(f"Failed to start server: {e}")
        raise
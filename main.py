import logging
import sys
from app import app

# Configure logging with more detailed format
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    stream=sys.stdout
)
logger = logging.getLogger(__name__)

if __name__ == "__main__":
    try:
        logger.info("Starting Flask server on port 8080...")
        # Set use_reloader=False to avoid duplicate processes
        app.run(host="0.0.0.0", port=8080, debug=True, use_reloader=False)
    except Exception as e:
        logger.error(f"Failed to start server: {str(e)}", exc_info=True)
        raise
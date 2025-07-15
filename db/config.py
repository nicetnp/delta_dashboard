import os
from dotenv import load_dotenv

load_dotenv()

DB_URL = (
    f"mssql+pyodbc://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}@"
    f"{os.getenv('DB_HOST')}/{os.getenv('DB_NAME')}?"
    f"driver={os.getenv('DB_DRIVER').replace(' ', '+')}"
)

API_TITLE = os.getenv('API_TITLE')
API_DESCRIPTION = os.getenv('API_DESCRIPTION')
API_VERSION = os.getenv('API_VERSION')
ALLOWED_ORIGINS = os.getenv('ALLOWED_ORIGINS', '').split(',')


